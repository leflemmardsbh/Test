"""Backend API tests for MedGL (code-based admin). Covers public + admin CRUD + cascade + code rotation."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://aerogligli-med.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_CODE = "MEDGL-2026"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/admin/verify", json={"code": ADMIN_CODE})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Public ----------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200


def test_list_modules_public(s):
    r = s.get(f"{API}/modules")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Admin verify ----------
def test_verify_wrong_code(s):
    r = s.post(f"{API}/admin/verify", json={"code": "WRONG-CODE"})
    assert r.status_code == 401
    assert "token" not in r.json()


def test_verify_correct_code(s):
    r = s.post(f"{API}/admin/verify", json={"code": ADMIN_CODE})
    assert r.status_code == 200
    assert isinstance(r.json().get("token"), str) and len(r.json()["token"]) > 20


def test_me_requires_auth(s):
    r = s.get(f"{API}/admin/me")
    assert r.status_code == 401


def test_me_with_token(s, h):
    r = s.get(f"{API}/admin/me", headers=h)
    assert r.status_code == 200
    data = r.json()
    assert data == {"ok": True, "code_set": True}


# ---------- Modules CRUD ----------
def test_create_module_requires_auth(s):
    r = s.post(f"{API}/admin/modules", json={"title": "X"})
    assert r.status_code == 401


module_ids = []


def test_create_module(s, h):
    payload = {"title": "TEST_Cardiologie", "description": "desc", "color": "teal", "icon": "heart", "order": 1}
    r = s.post(f"{API}/admin/modules", json=payload, headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == "TEST_Cardiologie"
    assert "id" in data
    module_ids.append(data["id"])

    # verify module detail has empty children arrays
    r2 = s.get(f"{API}/modules/{data['id']}")
    assert r2.status_code == 200
    d = r2.json()
    assert d["courses"] == [] and d["sheets"] == [] and d["quizzes"] == []


def test_create_course(s, h):
    mid = module_ids[0]
    r = s.post(f"{API}/admin/courses", json={"module_id": mid, "title": "TEST_Cours1", "content": "Hello course body"}, headers=h)
    assert r.status_code == 200
    cid = r.json()["id"]

    # module detail shows it (without content leaked)
    d = s.get(f"{API}/modules/{mid}").json()
    assert any(c["id"] == cid for c in d["courses"])
    assert "content" not in d["courses"][0]

    # full course content
    full = s.get(f"{API}/courses/{cid}").json()
    assert full["content"] == "Hello course body"


def test_create_sheet(s, h):
    mid = module_ids[0]
    r = s.post(f"{API}/admin/sheets", json={"module_id": mid, "title": "TEST_Fiche1", "content": "sheet body"}, headers=h)
    assert r.status_code == 200
    sid = r.json()["id"]
    full = s.get(f"{API}/sheets/{sid}").json()
    assert full["content"] == "sheet body"
    d = s.get(f"{API}/modules/{mid}").json()
    assert any(x["id"] == sid for x in d["sheets"])


def test_create_quiz(s, h):
    mid = module_ids[0]
    payload = {
        "module_id": mid,
        "title": "TEST_QCM1",
        "questions": [
            {"question": "Q1?", "choices": ["a", "b", "c"], "correct_index": 1, "explanation": "because b"},
            {"question": "Q2?", "choices": ["x", "y", "z"], "correct_index": 2, "explanation": ""},
        ],
    }
    r = s.post(f"{API}/admin/quizzes", json=payload, headers=h)
    assert r.status_code == 200
    qid = r.json()["id"]

    # module detail - no questions leaked
    d = s.get(f"{API}/modules/{mid}").json()
    qz = next(q for q in d["quizzes"] if q["id"] == qid)
    assert qz["questions_count"] == 2
    assert "questions" not in qz

    # full quiz
    full = s.get(f"{API}/quizzes/{qid}").json()
    assert len(full["questions"]) == 2
    assert full["questions"][0]["correct_index"] == 1


def test_reorder_modules(s, h):
    # Create 2nd module
    r = s.post(f"{API}/admin/modules", json={"title": "TEST_Pneumo", "order": 2}, headers=h)
    assert r.status_code == 200
    mid2 = r.json()["id"]
    module_ids.append(mid2)

    # Reorder (reversed)
    new_order = [mid2, module_ids[0]]
    r2 = s.put(f"{API}/admin/modules/reorder", json={"ids": new_order}, headers=h)
    assert r2.status_code == 200

    listing = s.get(f"{API}/modules").json()
    # Only consider our test modules
    ours = [m["id"] for m in listing if m["id"] in new_order]
    assert ours == new_order


def test_code_rotation(s, h):
    # Rotate code
    r = s.put(f"{API}/admin/code", json={"code": "NEW-CODE-2026"}, headers=h)
    assert r.status_code == 200

    # Old code fails
    assert s.post(f"{API}/admin/verify", json={"code": ADMIN_CODE}).status_code == 401
    # New code works
    r2 = s.post(f"{API}/admin/verify", json={"code": "NEW-CODE-2026"})
    assert r2.status_code == 200
    new_token = r2.json()["token"]

    # Restore
    r3 = s.put(f"{API}/admin/code", json={"code": ADMIN_CODE}, headers={"Authorization": f"Bearer {new_token}"})
    assert r3.status_code == 200
    assert s.post(f"{API}/admin/verify", json={"code": ADMIN_CODE}).status_code == 200


def test_delete_cascade(s, h):
    mid = module_ids[0]
    r = s.delete(f"{API}/admin/modules/{mid}", headers=h)
    assert r.status_code == 200

    assert s.get(f"{API}/modules/{mid}").status_code == 404
    # delete 2nd module too to leave DB clean
    if len(module_ids) > 1:
        s.delete(f"{API}/admin/modules/{module_ids[1]}", headers=h)


def test_final_cleanup_empty(s, h):
    # Make sure no TEST_ modules remain
    listing = s.get(f"{API}/modules").json()
    leftover = [m for m in listing if m.get("title", "").startswith("TEST_")]
    for m in leftover:
        s.delete(f"{API}/admin/modules/{m['id']}", headers=h)
    listing2 = s.get(f"{API}/modules").json()
    assert not any(m.get("title", "").startswith("TEST_") for m in listing2)
