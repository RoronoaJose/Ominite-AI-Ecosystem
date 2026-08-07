"""
Memory API — exposes mem0 (local, Ollama + Chroma) as HTTP endpoints
so the Node.js orchestrator can call it without needing Python.

Install (inside your activated mem0-env venv):
    pip install fastapi uvicorn

Run:
    uvicorn memory_api:app --reload --port 8001

Then from Node, call e.g.:
    fetch("http://localhost:8001/memory/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "...", user_id: "..." })
    })

Interactive API docs (auto-generated, share this link with your team):
    http://localhost:8001/docs
"""

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from mem0 import Memory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ominite_memory_api")

app = FastAPI(title="Ominite Memory API")

# Allow only these origins to call the API from a browser.
# Add your actual frontend's dev/prod URLs here as your team settles on them.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5500",   # VS Code Live Server default
    "http://localhost:5500",
    "null",                    # file:// origin (opening the HTML directly)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

config = {
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "llama3.1",
            "temperature": 0.2,
            "max_tokens": 1500,
            "ollama_base_url": "http://localhost:11434",
        },
    },
    "embedder": {
        "provider": "ollama",
        "config": {
            "model": "nomic-embed-text",
            "ollama_base_url": "http://localhost:11434",
        },
    },
    "vector_store": {
        "provider": "chroma",
        "config": {
            "collection_name": "ominite_memory",
            "path": "./chroma_db",
        },
    },
}

m = Memory.from_config(config)


# ---- Request/response shapes ----

def _validate_user_id(v: str) -> str:
    if not v or not v.strip():
        raise ValueError("user_id cannot be empty")
    return v.strip()


class AddRequest(BaseModel):
    text: str
    user_id: str

    _validate = field_validator("user_id")(_validate_user_id)


class SearchRequest(BaseModel):
    query: str
    user_id: str

    _validate = field_validator("user_id")(_validate_user_id)


class GetAllRequest(BaseModel):
    user_id: str

    _validate = field_validator("user_id")(_validate_user_id)


class DeleteRequest(BaseModel):
    memory_id: str


class ContextRequest(BaseModel):
    query: str
    user_id: str
    max_tokens: int = 500          # rough budget for injected memory text
    min_score: float = 0.3         # drop memories below this relevance score

    _validate = field_validator("user_id")(_validate_user_id)


# ---- Endpoints ----

@app.post("/memory/add")
def add_memory(req: AddRequest):
    """Store a new memory extracted from conversation text."""
    try:
        result = m.add(req.text, user_id=req.user_id)
        return {"status": "ok", "result": result}
    except Exception as e:
        logger.exception("memory/add failed")
        raise HTTPException(status_code=502, detail=f"Memory add failed: {e}")


@app.post("/memory/search")
def search_memory(req: SearchRequest):
    """Retrieve memories relevant to a query, for injecting into context."""
    try:
        result = m.search(req.query, filters={"user_id": req.user_id})
        return {"status": "ok", "result": result}
    except Exception as e:
        logger.exception("memory/search failed")
        raise HTTPException(status_code=502, detail=f"Memory search failed: {e}")


@app.post("/memory/all")
def get_all_memories(req: GetAllRequest):
    """Return every stored memory for a user (debugging/inspection)."""
    try:
        result = m.get_all(filters={"user_id": req.user_id})
        return {"status": "ok", "result": result}
    except Exception as e:
        logger.exception("memory/all failed")
        raise HTTPException(status_code=502, detail=f"Memory fetch failed: {e}")


@app.post("/memory/delete")
def delete_memory(req: DeleteRequest):
    """Delete a single memory by its id (returned from add/search/all)."""
    if not req.memory_id or not req.memory_id.strip():
        raise HTTPException(status_code=400, detail="memory_id cannot be empty")
    try:
        m.delete(memory_id=req.memory_id)
        return {"status": "ok", "deleted": req.memory_id}
    except Exception as e:
        logger.exception("memory/delete failed")
        raise HTTPException(status_code=502, detail=f"Memory delete failed: {e}")


@app.get("/health")
def health():
    """
    Quick check that the memory service AND its dependencies (Ollama) are up.
    The orchestrator should call this before relying on /context/get.
    """
    try:
        # Cheap check: list local Ollama models to confirm it's reachable.
        import ollama as ollama_client
        ollama_client.Client(host="http://localhost:11434").list()
        ollama_ok = True
    except Exception:
        ollama_ok = False

    return {
        "status": "ok" if ollama_ok else "degraded",
        "ollama_reachable": ollama_ok,
    }


# ---- Context engine: decides WHAT gets injected, not just what's stored ----

def _estimate_tokens(text: str) -> int:
    """
    Rough token estimate (~0.75 tokens per word for English text).
    Not exact — real tokenizers differ per model — but good enough
    for budgeting how much memory text to inject.
    """
    return int(len(text.split()) * 1.3)


def get_context_for_prompt(query: str, user_id: str, max_tokens: int = 500, min_score: float = 0.3) -> dict:
    """
    The actual 'context engine' step: given a new prompt, decide which
    stored memories are worth injecting, trim to a token budget, and
    format them as a single context block ready to prepend to any
    model's prompt — regardless of which model the orchestrator routes to.
    """
    raw = m.search(query, filters={"user_id": user_id})
    candidates = raw.get("results", raw) if isinstance(raw, dict) else raw

    # Highest relevance first
    candidates = sorted(candidates, key=lambda c: c.get("score", 0), reverse=True)

    included = []
    excluded_low_score = 0
    tokens_used = 0

    for mem in candidates:
        score = mem.get("score", 0)
        if score < min_score:
            excluded_low_score += 1
            continue

        text = mem.get("memory", "")
        cost = _estimate_tokens(text)
        if tokens_used + cost > max_tokens:
            break  # budget exhausted, stop including more

        included.append(text)
        tokens_used += cost

    if included:
        context_block = "Relevant context about the user:\n" + "\n".join(f"- {t}" for t in included)
    else:
        context_block = ""  # nothing relevant enough to inject

    return {
        "context_block": context_block,
        "memories_included": len(included),
        "memories_excluded_low_score": excluded_low_score,
        "estimated_tokens": tokens_used,
    }


@app.post("/context/get")
def context_get(req: ContextRequest):
    """
    Main endpoint for the orchestrator: call this instead of /memory/search
    when you need memory injected into a live prompt. Returns a ready-to-use
    context_block plus metadata about what was included/excluded.
    """
    try:
        result = get_context_for_prompt(
            query=req.query,
            user_id=req.user_id,
            max_tokens=req.max_tokens,
            min_score=req.min_score,
        )
        return {"status": "ok", **result}
    except Exception as e:
        logger.exception("context/get failed")
        raise HTTPException(status_code=502, detail=f"Context retrieval failed: {e}")