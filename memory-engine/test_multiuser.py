"""
Confirms user data isolation: two different user_ids should never see
each other's memories, even though they share the same Chroma collection.

Run AFTER memory_api.py is running (uvicorn memory_api:app --reload --port 8001):
    python test_multiuser.py
"""

import requests

BASE = "http://127.0.0.1:8001"

USER_A = "test_user_a"
USER_B = "test_user_b"


def add(text, user_id):
    r = requests.post(f"{BASE}/memory/add", json={"text": text, "user_id": user_id})
    r.raise_for_status()
    return r.json()


def get_all(user_id):
    r = requests.post(f"{BASE}/memory/all", json={"user_id": user_id})
    r.raise_for_status()
    return r.json()["result"]


print("Adding memory for User A...")
add("User A loves hiking and lives in Hyderabad.", USER_A)

print("Adding memory for User B...")
add("User B is a vegetarian chef in Mumbai.", USER_B)

print("\nFetching User A's memories...")
a_memories = get_all(USER_A)
print(a_memories)

print("\nFetching User B's memories...")
b_memories = get_all(USER_B)
print(b_memories)

# ---- Isolation check ----
a_texts = " ".join(mm.get("memory", "") for mm in a_memories.get("results", a_memories))
b_texts = " ".join(mm.get("memory", "") for mm in b_memories.get("results", b_memories))

leak_found = False
if "Mumbai" in a_texts or "chef" in a_texts:
    print("\n❌ LEAK: User A can see User B's data!")
    leak_found = True
if "Hyderabad" in b_texts or "hiking" in b_texts:
    print("\n❌ LEAK: User B can see User A's data!")
    leak_found = True

if not leak_found:
    print("\n✅ Isolation confirmed: User A and User B's memories are fully separate.")
