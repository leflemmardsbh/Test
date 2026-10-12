"""Backend tests for the new GET /api/search endpoint (iteration 2)."""
import os
import urllib.parse
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://aerogligli-med.preview.emergentagent.com").rstrip("/")

MODULE_ID = "eeef84b2-146c-4c0c-91e7-226ae7a907b0"
QUIZ_ID = "af43150c-b06a-498a-bea5-34f4fbf45d4b"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _get(client, q):
    url = f"{BASE_URL}/api/search?q={urllib.parse.quote(q)}"
    r = client.get(url, timeout=15)
    assert r.status_code == 200, f"{url} -> {r.status_code} {r.text[:200]}"
    return r.json()


class TestSearch:
    def test_search_iec_matches_course_and_quiz(self, client):
        data = _get(client, "IEC")
        assert data["query"] == "IEC"
        assert isinstance(data["modules"], list)
        titles = [c["title"] for c in data["courses"]]
        assert "Insuffisance cardiaque" in titles
        course = next(c for c in data["courses"] if c["title"] == "Insuffisance cardiaque")
        assert "IEC" in course["snippet"] or "iec" in course["snippet"].lower()
        assert course["module_title"] == "Ue 5"
        assert course["module_id"] == MODULE_ID
        qtitles = [z["title"] for z in data["quizzes"]]
        assert "QCM Cardiologie 1" in qtitles
        qz = next(z for z in data["quizzes"] if z["title"] == "QCM Cardiologie 1")
        assert qz["matched_questions"] >= 1
        assert qz["module_title"] == "Ue 5"

    def test_search_case_insensitive(self, client):
        data = _get(client, "iec")
        assert any(c["title"] == "Insuffisance cardiaque" for c in data["courses"])

    def test_search_short_query_empty(self, client):
        data = _get(client, "a")
        assert data["modules"] == []
        assert data["courses"] == []
        assert data["sheets"] == []
        assert data["quizzes"] == []

    def test_search_no_results(self, client):
        data = _get(client, "zzzzzz")
        assert data["modules"] == []
        assert data["courses"] == []
        assert data["sheets"] == []
        assert data["quizzes"] == []

    def test_search_accented_betabloquant(self, client):
        data = _get(client, "bêtabloquant")
        sheet_titles = [s["title"] for s in data["sheets"]]
        assert any("Bêtabloquant" in t for t in sheet_titles), f"sheets={sheet_titles}"
        course_titles = [c["title"] for c in data["courses"]]
        assert "Insuffisance cardiaque" in course_titles

    def test_search_response_no_mongo_id(self, client):
        data = _get(client, "IEC")
        for group in ("modules", "courses", "sheets", "quizzes"):
            for item in data[group]:
                assert "_id" not in item
