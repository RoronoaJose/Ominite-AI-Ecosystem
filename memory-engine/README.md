# Ominite Memory Engine

Local-first memory layer for Ominite, built on mem0 (Ollama for
extraction/embeddings, Chroma for vector storage). Exposes an HTTP API
so the Node.js orchestrator can call it without needing Python.

## Setup (fresh machine)

1. Install Ollama: https://ollama.com/download

2. Pull the required models:
   ```
   ollama pull llama3.1
   ollama pull nomic-embed-text
   ```

3. Create and activate a virtual environment:
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

## Files

- `memory_api.py` — the API itself (add/search/all/delete/context/health)
- `mem0_test.py` — standalone script to sanity-check the pipeline
- `test_multiuser.py` — confirms per-user memory isolation

## Endpoints

| Endpoint          | Purpose                                                        |
|--------------------|------------------------------------------------------------------|
| `POST /memory/add`    | Store a new memory from conversation text                     |
| `POST /memory/search` | Raw relevance-ranked search (debug/inspection)                |
| `POST /memory/all`    | List everything stored for a user                             |
| `POST /memory/delete` | Remove a memory by id                                          |
| `POST /context/get`   | **Main endpoint for the orchestrator** — returns a ready-to-inject `context_block`, filtered by relevance and trimmed to a token budget |
| `GET /health`          | Checks the API AND whether Ollama is reachable                |

## Notes for the orchestrator team

- Every request needs a `user_id` — this is how memories stay isolated per user.
- CORS is currently allowlisted to `localhost:3000` / `localhost:5173`. Update
  `ALLOWED_ORIGINS` in `memory_api.py` once the frontend's real dev/prod URL is known.
- `/memory/add` is NOT called automatically — the orchestrator decides when
  a conversation turn is worth remembering and calls it explicitly. This avoids
  storing junk like "ok thanks" as a permanent memory.
- Ollama inference on CPU is slow (can take 20s–2min per `/memory/add` call).
  Plan demo flow around this — don't add memories live on stage.
