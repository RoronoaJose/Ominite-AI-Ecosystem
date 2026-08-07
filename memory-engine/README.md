# Ominite Memory Engine

Local-first memory layer for Ominite, built on mem0 (Ollama for
extraction/embeddings, Chroma for vector storage). Exposes an HTTP API
so the Node.js orchestrator can call it, plus a standalone graph UI for
browsing and testing memories directly.

## Setup (fresh machine)

1. Install Ollama: https://ollama.com/download

2. Pull the required models:
   ```
   ollama pull llama3.1
   ollama pull nomic-embed-text
   ```

3. Create and activate a virtual environment (from inside `memory-engine/`):
   ```
   python -m venv mem0-env

   # Windows PowerShell:
   .\mem0-env\Scripts\Activate.ps1

   # Windows cmd:
   mem0-env\Scripts\activate.bat

   # macOS/Linux:
   source mem0-env/bin/activate
   ```

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Run the API:
   ```
   uvicorn memory_api:app --reload --port 8001
   ```

6. Confirm it's up: open http://127.0.0.1:8001/docs

## Trying the UI (`memory_graph.html`)

This is a standalone HTML file — no build step, no npm install. It's a
graph view of stored memories (drag/zoom nodes, search, add, delete,
export as markdown) that talks directly to the API above.

**With the API already running (step 5 above):**

- Easiest: in VS Code, right-click `memory_graph.html` → **"Open with Live
  Server"** (install the free "Live Server" extension first if you don't
  have it). This serves the file at `http://127.0.0.1:5500/...`
- Or just double-click the file to open it directly in a browser (`file://`)
  — also works, CORS is already set up to allow this.

Check the small dot next to the title in the top-left: green means the API
and Ollama are both reachable. If it's red, the API isn't running, or
Ollama isn't up (`ollama serve`).

## Files

- `memory_api.py` — the API itself (add/search/all/delete/context/health)
- `memory_graph.html` — standalone graph UI for browsing/testing memories
- `mem0_test.py` — standalone script to sanity-check the pipeline
- `test_multiuser.py` — confirms per-user memory isolation
- `requirements.txt` — exact package versions (from `pip freeze`)

## Endpoints

| Endpoint               | Purpose                                                        |
|-------------------------|------------------------------------------------------------------|
| `POST /memory/add`      | Store a new memory from conversation text                     |
| `POST /memory/search`   | Raw relevance-ranked search (debug/inspection)                |
| `POST /memory/all`      | List everything stored for a user                             |
| `POST /memory/delete`   | Remove a memory by id                                          |
| `POST /context/get`     | **Main endpoint for the orchestrator** — returns a ready-to-inject `context_block`, filtered by relevance and trimmed to a token budget |
| `GET /health`           | Checks the API AND whether Ollama is reachable                |

## Notes for the orchestrator team

- Every request needs a `user_id` — this is how memories stay isolated per user.
- CORS is currently allowlisted to common local dev origins (`localhost:3000`,
  `5173`, `5500`, and `file://`). Add the real frontend URL to `ALLOWED_ORIGINS`
  in `memory_api.py` once it's settled.
- `/memory/add` is NOT called automatically — the orchestrator decides when
  a conversation turn is worth remembering and calls it explicitly. This avoids
  storing junk like "ok thanks" as a permanent memory.
- Ollama inference on CPU is slow (can take 20s–2min per `/memory/add` call).
  Plan demo flow around this — don't add memories live on stage.

## Known limitations / TODO

- **No deduplication yet.** Adding similar or repeated text creates separate,
  near-identical memory entries instead of updating an existing one. mem0
  supports update-on-conflict behavior, but it isn't wired up here yet — worth
  fixing before the memory list gets noisy in a real demo.
- **Token estimate is approximate.** `_estimate_tokens()` in `memory_api.py`
  uses a rough word-count heuristic, not each model's actual tokenizer.
- **Networking to a second machine (orchestrator laptop) not yet set up.**
  Needs a LAN connection or tunnel before real multi-device testing.