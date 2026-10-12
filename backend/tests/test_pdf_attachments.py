"""Backend tests for PDF chunked upload, file serving, and attachments on courses/sheets."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_CODE = "MEDGL-2026"
MODULE_ID = "eeef84b2-146c-4c0c-91e7-226ae7a907b0"  # Ue 5
TEST_PDF = "/tmp/test3pages.pdf"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/admin/verify", json={"code": ADMIN_CODE}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def pdf_bytes():
    with open(TEST_PDF, "rb") as f:
        return f.read()


# ---------- Upload tests ----------
def _upload_full(pdf_bytes, auth_headers, filename="test3pages.pdf"):
    upload_id = str(uuid.uuid4())
    r = requests.post(
        f"{BASE_URL}/api/admin/files/chunk",
        headers=auth_headers,
        data={"upload_id": upload_id, "index": 0},
        files={"chunk": ("part0", pdf_bytes, "application/octet-stream")},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    r = requests.post(
        f"{BASE_URL}/api/admin/files/complete",
        headers=auth_headers,
        json={"upload_id": upload_id, "filename": filename},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_chunk_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/admin/files/chunk",
        data={"upload_id": str(uuid.uuid4()), "index": 0},
        files={"chunk": ("p", b"x", "application/octet-stream")},
        timeout=30,
    )
    assert r.status_code == 401


def test_upload_single_chunk(pdf_bytes, auth_headers):
    out = _upload_full(pdf_bytes, auth_headers)
    assert out["name"] == "test3pages.pdf"
    assert out["size"] == len(pdf_bytes)
    assert "id" in out
    # cleanup via file soft-delete later; keep id for subsequent tests
    pytest.single_chunk_file_id = out["id"]


def test_upload_two_chunks(pdf_bytes, auth_headers):
    upload_id = str(uuid.uuid4())
    mid = len(pdf_bytes) // 2
    for idx, part in enumerate([pdf_bytes[:mid], pdf_bytes[mid:]]):
        r = requests.post(
            f"{BASE_URL}/api/admin/files/chunk",
            headers=auth_headers,
            data={"upload_id": upload_id, "index": idx},
            files={"chunk": (f"p{idx}", part, "application/octet-stream")},
            timeout=60,
        )
        assert r.status_code == 200, r.text
    r = requests.post(
        f"{BASE_URL}/api/admin/files/complete",
        headers=auth_headers,
        json={"upload_id": upload_id, "filename": "test3pages.pdf"},
        timeout=120,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["size"] == len(pdf_bytes)
    # Fetch and verify intact
    g = requests.get(f"{BASE_URL}/api/files/{body['id']}", timeout=60)
    assert g.status_code == 200
    assert g.content[:4] == b"%PDF"
    assert len(g.content) == len(pdf_bytes)
    pytest.two_chunk_file_id = body["id"]


def test_complete_unknown_upload_id(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/admin/files/complete",
        headers=auth_headers,
        json={"upload_id": str(uuid.uuid4()), "filename": "x.pdf"},
        timeout=30,
    )
    assert r.status_code == 400


def test_complete_non_pdf(auth_headers):
    upload_id = str(uuid.uuid4())
    r = requests.post(
        f"{BASE_URL}/api/admin/files/chunk",
        headers=auth_headers,
        data={"upload_id": upload_id, "index": 0},
        files={"chunk": ("p", b"hello world not a pdf", "application/octet-stream")},
        timeout=30,
    )
    assert r.status_code == 200
    r = requests.post(
        f"{BASE_URL}/api/admin/files/complete",
        headers=auth_headers,
        json={"upload_id": upload_id, "filename": "x.pdf"},
        timeout=30,
    )
    assert r.status_code == 400
    assert "PDF" in r.json().get("detail", "")


# ---------- File serving ----------
def test_serve_file_inline(pdf_bytes, auth_headers):
    fid = pytest.single_chunk_file_id
    r = requests.get(f"{BASE_URL}/api/files/{fid}", timeout=60)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert "inline" in r.headers.get("content-disposition", "")
    assert "test3pages.pdf" in r.headers.get("content-disposition", "")
    assert r.content[:4] == b"%PDF"


def test_serve_file_download():
    fid = pytest.single_chunk_file_id
    r = requests.get(f"{BASE_URL}/api/files/{fid}?download=1", timeout=60)
    assert r.status_code == 200
    assert "attachment" in r.headers.get("content-disposition", "")


def test_serve_file_404():
    r = requests.get(f"{BASE_URL}/api/files/does-not-exist-xyz", timeout=30)
    assert r.status_code == 404


# ---------- Attachments on course/sheet ----------
def test_course_with_attachment_and_soft_delete(auth_headers, pdf_bytes):
    up = _upload_full(pdf_bytes, auth_headers, "course-attach.pdf")
    fid = up["id"]
    # create course
    r = requests.post(
        f"{BASE_URL}/api/admin/courses",
        headers=auth_headers,
        json={
            "module_id": MODULE_ID,
            "title": "TEST_course_attach",
            "content": "",
            "attachments": [{"id": fid, "name": up["name"], "size": up["size"]}],
            "order": 999,
        },
        timeout=30,
    )
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    # GET returns attachments
    g = requests.get(f"{BASE_URL}/api/courses/{cid}", timeout=30).json()
    assert len(g["attachments"]) == 1 and g["attachments"][0]["id"] == fid
    # module listing contains attachments
    m = requests.get(f"{BASE_URL}/api/modules/{MODULE_ID}", timeout=30).json()
    course_item = next(c for c in m["courses"] if c["id"] == cid)
    assert len(course_item.get("attachments", [])) == 1
    # remove attachment via PUT (empty attachments) -> file soft-deleted -> 404
    r = requests.put(
        f"{BASE_URL}/api/admin/courses/{cid}",
        headers=auth_headers,
        json={"module_id": MODULE_ID, "title": "TEST_course_attach", "content": "", "attachments": [], "order": 999},
        timeout=30,
    )
    assert r.status_code == 200
    r = requests.get(f"{BASE_URL}/api/files/{fid}", timeout=30)
    assert r.status_code == 404
    # cleanup course
    requests.delete(f"{BASE_URL}/api/admin/courses/{cid}", headers=auth_headers, timeout=30)


def test_sheet_with_attachment_delete_cascades(auth_headers, pdf_bytes):
    up = _upload_full(pdf_bytes, auth_headers, "sheet-attach.pdf")
    fid = up["id"]
    r = requests.post(
        f"{BASE_URL}/api/admin/sheets",
        headers=auth_headers,
        json={
            "module_id": MODULE_ID,
            "title": "TEST_sheet_attach",
            "content": "",
            "attachments": [{"id": fid, "name": up["name"], "size": up["size"]}],
            "order": 999,
        },
        timeout=30,
    )
    assert r.status_code == 200, r.text
    sid = r.json()["id"]
    g = requests.get(f"{BASE_URL}/api/sheets/{sid}", timeout=30).json()
    assert len(g["attachments"]) == 1
    # delete sheet -> file soft-deleted
    r = requests.delete(f"{BASE_URL}/api/admin/sheets/{sid}", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    r = requests.get(f"{BASE_URL}/api/files/{fid}", timeout=30)
    assert r.status_code == 404


# ---------- cleanup final ----------
def test_zz_cleanup_leftover_files(auth_headers):
    # Soft-delete the single_chunk_file and two_chunk_file by removing via a dummy course trick: not possible publicly.
    # Simply note them; main agent asked to clean. We'll use PUT on a temp course to soft-delete.
    for fid in [getattr(pytest, "single_chunk_file_id", None), getattr(pytest, "two_chunk_file_id", None)]:
        if not fid:
            continue
        # Create+delete course containing that file
        r = requests.post(
            f"{BASE_URL}/api/admin/courses",
            headers=auth_headers,
            json={"module_id": MODULE_ID, "title": "TEST_cleanup", "content": "",
                  "attachments": [{"id": fid, "name": "x.pdf", "size": 0}], "order": 999},
            timeout=30,
        )
        if r.status_code == 200:
            cid = r.json()["id"]
            requests.delete(f"{BASE_URL}/api/admin/courses/{cid}", headers=auth_headers, timeout=30)
