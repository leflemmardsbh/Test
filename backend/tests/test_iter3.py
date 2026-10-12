"""Iter3: backend tests for Medbook rich editor + branding."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://aerogligli-med.preview.emergentagent.com").rstrip("/")
ADMIN_CODE = "MEDGL-2026"
MODULE_UE5 = "eeef84b2-146c-4c0c-91e7-226ae7a907b0"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/admin/verify", json={"code": ADMIN_CODE})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_search_mortalite_no_html():
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "mortalité"})
    assert r.status_code == 200
    data = r.json()
    hits = data["courses"]
    assert any(c["id"] == "50fc2003-ff7e-4ff3-8bcb-48490a57450a" for c in hits)
    for c in hits:
        assert "<" not in c["snippet"], f"HTML tag in snippet: {c['snippet']}"


def test_plain_text_content_create_and_delete(auth):
    payload = {"module_id": MODULE_UE5, "title": "TEST_plain", "content": "Ligne 1\nLigne 2\n\nParagraphe 2", "order": 99}
    r = requests.post(f"{BASE_URL}/api/admin/courses", json=payload, headers=auth)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    try:
        g = requests.get(f"{BASE_URL}/api/courses/{cid}")
        assert g.status_code == 200
        assert "Ligne 1" in g.json()["content"]
    finally:
        d = requests.delete(f"{BASE_URL}/api/admin/courses/{cid}", headers=auth)
        assert d.status_code == 200


def test_xss_content_persisted_but_safe_on_render(auth):
    xss = '<p>ok</p><img src=x onerror=alert(1)><script>alert(2)</script>'
    payload = {"module_id": MODULE_UE5, "title": "TEST_xss", "content": xss, "order": 99}
    r = requests.post(f"{BASE_URL}/api/admin/courses", json=payload, headers=auth)
    assert r.status_code == 200
    cid = r.json()["id"]
    try:
        g = requests.get(f"{BASE_URL}/api/courses/{cid}")
        # Content stored as-is; frontend DOMPurify sanitizes
        assert "ok" in g.json()["content"]
    finally:
        requests.delete(f"{BASE_URL}/api/admin/courses/{cid}", headers=auth)


def test_html_content_rich(auth):
    html = "<h2>Titre</h2><p><strong>gras</strong></p><ul><li>a</li><li>b</li></ul>"
    r = requests.post(f"{BASE_URL}/api/admin/courses", json={"module_id": MODULE_UE5, "title": "TEST_html", "content": html, "order": 99}, headers=auth)
    assert r.status_code == 200
    cid = r.json()["id"]
    try:
        g = requests.get(f"{BASE_URL}/api/courses/{cid}")
        assert "<h2>Titre</h2>" in g.json()["content"]
    finally:
        requests.delete(f"{BASE_URL}/api/admin/courses/{cid}", headers=auth)
