"""
First test: confirm mem0 can add and retrieve a memory, fully local
(Ollama for LLM extraction + embeddings, Chroma for local vector storage).

Run this AFTER:
  1. venv is activated -> (mem0-env) shows in your prompt
  2. Ollama is running with these models pulled:
       ollama pull llama3.1
       ollama pull nomic-embed-text
"""

from mem0 import Memory

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
            "path": "./chroma_db",  # creates a local folder here
        },
    },
}

m = Memory.from_config(config)

user_id = "athrva_test"

# 1. Add a memory from a fake conversation turn
print("Adding memory...")
result = m.add(
    "I'm building an AI aggregator called Ominite for my PBL project. "
    "I prefer local-first tools and I'm using Python.",
    user_id=user_id,
)
print("Add result:", result)

# 2. Search for it back
print("\nSearching memory...")
search_result = m.search("What is the user building?", filters={"user_id": user_id})
print("Search result:", search_result)

# 3. See everything stored for this user
print("\nAll memories for user:")
print(m.get_all(filters={"user_id": user_id}))