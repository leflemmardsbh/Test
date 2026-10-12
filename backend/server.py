from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import os, uuid, jwt, re, asyncio, requests
from urllib.parse import quote

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Medbook API")
api = APIRouter(prefix="/api")

JWT_ALGO = "HS256"
SETTINGS_ID = "singleton"

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "medbook"
UPLOAD_TMP = "/tmp/medbook_uploads"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=300)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=300)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> bytes:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    resp.raise_for_status()
    return resp.content


# ---------- Models ----------
class CodeInput(BaseModel):
    code: str


class CodeUpdate(BaseModel):
    code: str = Field(min_length=4, max_length=64)


class ModuleInput(BaseModel):
    title: str
    description: str = ""
    color: str = "teal"
    icon: str = "stethoscope"
    order: int = 0


class Attachment(BaseModel):
    id: str
    name: str
    size: int = 0


class CourseInput(BaseModel):
    module_id: str
    title: str
    content: str = ""
    attachments: List[Attachment] = []
    order: int = 0


class SheetInput(BaseModel):
    module_id: str
    title: str
    content: str = ""
    attachments: List[Attachment] = []
    order: int = 0


class CompleteUpload(BaseModel):
    upload_id: str
    filename: str


class QuizQuestion(BaseModel):
    question: str
    choices: List[str]
    correct_index: int = 0
    explanation: str = ""


class QuizInput(BaseModel):
    module_id: str
    title: str
    description: str = ""
    questions: List[QuizQuestion] = []
    order: int = 0


class ReorderInput(BaseModel):
    ids: List[str]


# ---------- Helpers ----------
def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def admin_token() -> str:
    payload = {"role": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=24)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGO)


async def require_admin(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Accès admin requis")
    try:
        payload = jwt.decode(authorization[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALGO])
        if payload.get("role") != "admin":
            raise HTTPException(403, "Rôle insuffisant")
        return True
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expirée")


def clean(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc


async def get_admin_code() -> str:
    s = await db.settings.find_one({"id": SETTINGS_ID})
    if not s:
        return ""
    return s.get("admin_code", "")


# ---------- Public endpoints ----------
@api.get("/")
async def root():
    return {"message": "MedGL API active"}


@api.get("/modules")
async def list_modules():
    docs = await db.modules.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    out = []
    for m in docs:
        mid = m["id"]
        m["courses_count"] = await db.courses.count_documents({"module_id": mid})
        m["sheets_count"] = await db.sheets.count_documents({"module_id": mid})
        m["quizzes_count"] = await db.quizzes.count_documents({"module_id": mid})
        out.append(m)
    return out


@api.get("/modules/{module_id}")
async def module_detail(module_id: str):
    m = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Module introuvable")
    m["courses"] = await db.courses.find({"module_id": module_id}, {"_id": 0, "content": 0}).sort("order", 1).to_list(500)
    m["sheets"] = await db.sheets.find({"module_id": module_id}, {"_id": 0, "content": 0}).sort("order", 1).to_list(500)
    quizzes = await db.quizzes.find({"module_id": module_id}, {"_id": 0}).sort("order", 1).to_list(500)
    for q in quizzes:
        q["questions_count"] = len(q.get("questions", []))
    m["quizzes"] = [{k: v for k, v in q.items() if k != "questions"} for q in quizzes]
    return m


@api.get("/courses/{course_id}")
async def course_detail(course_id: str):
    c = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Cours introuvable")
    return c


@api.get("/sheets/{sheet_id}")
async def sheet_detail(sheet_id: str):
    s = await db.sheets.find_one({"id": sheet_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Fiche introuvable")
    return s


@api.get("/quizzes/{quiz_id}")
async def quiz_detail(quiz_id: str):
    q = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not q:
        raise HTTPException(404, "QCM introuvable")
    return q


def snippet(text: str, q: str, width: int = 140) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    low = text.lower()
    pos = low.find(q.lower())
    if pos < 0:
        return text[:width] + ("…" if len(text) > width else "")
    start = max(0, pos - width // 3)
    end = min(len(text), pos + len(q) + width)
    return ("…" if start > 0 else "") + text[start:end].replace("\n", " ") + ("…" if end < len(text) else "")


@api.get("/search")
async def search(q: str = ""):
    q = q.strip()
    if len(q) < 2:
        return {"query": q, "modules": [], "courses": [], "sheets": [], "quizzes": []}
    rx = {"$regex": re.escape(q), "$options": "i"}
    modules = await db.modules.find({}, {"_id": 0, "id": 1, "title": 1, "color": 1, "icon": 1}).to_list(500)
    mod_map = {m["id"]: m for m in modules}

    def with_module(doc):
        m = mod_map.get(doc.get("module_id"), {})
        doc["module_title"] = m.get("title", "")
        doc["module_color"] = m.get("color", "teal")
        return doc

    mods = [m for m in await db.modules.find({"$or": [{"title": rx}, {"description": rx}]}, {"_id": 0}).to_list(50)]
    courses = await db.courses.find({"$or": [{"title": rx}, {"content": rx}]}, {"_id": 0}).limit(50).to_list(50)
    sheets = await db.sheets.find({"$or": [{"title": rx}, {"content": rx}]}, {"_id": 0}).limit(50).to_list(50)
    quizzes = await db.quizzes.find(
        {"$or": [{"title": rx}, {"description": rx}, {"questions.question": rx}, {"questions.choices": rx}, {"questions.explanation": rx}]},
        {"_id": 0},
    ).limit(50).to_list(50)

    out_courses = [with_module({"id": c["id"], "module_id": c["module_id"], "title": c["title"], "snippet": snippet(c.get("content", ""), q)}) for c in courses]
    out_sheets = [with_module({"id": s["id"], "module_id": s["module_id"], "title": s["title"], "snippet": snippet(s.get("content", ""), q)}) for s in sheets]
    out_quizzes = []
    for qz in quizzes:
        matched = [qq["question"] for qq in qz.get("questions", []) if q.lower() in (qq.get("question", "") + " ".join(qq.get("choices", [])) + qq.get("explanation", "")).lower()]
        out_quizzes.append(with_module({
            "id": qz["id"], "module_id": qz["module_id"], "title": qz["title"],
            "questions_count": len(qz.get("questions", [])),
            "snippet": snippet(matched[0], q) if matched else snippet(qz.get("description", ""), q),
            "matched_questions": len(matched),
        }))
    return {"query": q, "modules": mods, "courses": out_courses, "sheets": out_sheets, "quizzes": out_quizzes}


# ---------- Files (PDF) ----------
async def soft_delete_files(ids: List[str]):
    if ids:
        await db.files.update_many({"id": {"$in": ids}}, {"$set": {"is_deleted": True}})


def attachment_ids(docs: List[dict]) -> List[str]:
    return [a["id"] for d in docs for a in d.get("attachments", [])]


@api.get("/files/{file_id}")
async def serve_file(file_id: str, download: int = 0):
    rec = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Fichier introuvable")
    data = await asyncio.to_thread(get_object, rec["storage_path"])
    disposition = "attachment" if download else "inline"
    headers = {
        "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(rec['original_filename'])}",
        "Cache-Control": "public, max-age=86400",
    }
    return Response(content=data, media_type=rec.get("content_type", "application/pdf"), headers=headers)


@api.post("/admin/files/chunk")
async def upload_chunk(upload_id: str = Form(...), index: int = Form(...), chunk: UploadFile = File(...), _=Depends(require_admin)):
    if not re.fullmatch(r"[a-f0-9-]{36}", upload_id):
        raise HTTPException(400, "upload_id invalide")
    os.makedirs(UPLOAD_TMP, exist_ok=True)
    path = f"{UPLOAD_TMP}/{upload_id}.part"
    data = await chunk.read()
    mode = "wb" if index == 0 else "ab"
    with open(path, mode) as f:
        f.write(data)
    return {"ok": True, "received": os.path.getsize(path)}


@api.post("/admin/files/complete")
async def complete_upload(data: CompleteUpload, _=Depends(require_admin)):
    path = f"{UPLOAD_TMP}/{data.upload_id}.part"
    if not os.path.exists(path):
        raise HTTPException(400, "Aucun fichier reçu")
    with open(path, "rb") as f:
        content = f.read()
    os.remove(path)
    if not content.startswith(b"%PDF"):
        raise HTTPException(400, "Le fichier doit être un PDF")
    file_id = str(uuid.uuid4())
    storage_path = f"{APP_NAME}/pdf/{file_id}.pdf"
    try:
        result = await asyncio.to_thread(put_object, storage_path, content, "application/pdf")
    except Exception as e:
        raise HTTPException(502, f"Stockage indisponible : {e}")
    rec = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": data.filename,
        "content_type": "application/pdf",
        "size": len(content),
        "is_deleted": False,
        "created_at": iso_now(),
    }
    await db.files.insert_one(rec)
    return {"id": file_id, "name": data.filename, "size": len(content)}


# ---------- Admin auth ----------
@api.post("/admin/verify")
async def admin_verify(data: CodeInput):
    expected = await get_admin_code()
    if not expected or data.code.strip() != expected:
        raise HTTPException(401, "Code incorrect")
    return {"token": admin_token()}


@api.get("/admin/me")
async def admin_me(_=Depends(require_admin)):
    return {"ok": True, "code_set": bool(await get_admin_code())}


@api.put("/admin/code")
async def change_code(data: CodeUpdate, _=Depends(require_admin)):
    await db.settings.update_one(
        {"id": SETTINGS_ID},
        {"$set": {"admin_code": data.code.strip(), "updated_at": iso_now()}},
        upsert=True,
    )
    return {"ok": True}


# ---------- Admin modules ----------
@api.post("/admin/modules")
async def create_module(data: ModuleInput, _=Depends(require_admin)):
    if data.order == 0:
        data.order = await db.modules.count_documents({})
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": iso_now()}
    await db.modules.insert_one(doc)
    return clean(doc)


@api.put("/admin/modules/reorder")
async def reorder_modules(data: ReorderInput, _=Depends(require_admin)):
    for idx, mid in enumerate(data.ids):
        await db.modules.update_one({"id": mid}, {"$set": {"order": idx}})
    return {"ok": True}


@api.put("/admin/modules/{module_id}")
async def update_module(module_id: str, data: ModuleInput, _=Depends(require_admin)):
    r = await db.modules.update_one({"id": module_id}, {"$set": data.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Module introuvable")
    return clean(await db.modules.find_one({"id": module_id}, {"_id": 0}))


@api.delete("/admin/modules/{module_id}")
async def delete_module(module_id: str, _=Depends(require_admin)):
    docs = await db.courses.find({"module_id": module_id}, {"_id": 0, "attachments": 1}).to_list(1000)
    docs += await db.sheets.find({"module_id": module_id}, {"_id": 0, "attachments": 1}).to_list(1000)
    await soft_delete_files(attachment_ids(docs))
    await db.modules.delete_one({"id": module_id})
    await db.courses.delete_many({"module_id": module_id})
    await db.sheets.delete_many({"module_id": module_id})
    await db.quizzes.delete_many({"module_id": module_id})
    return {"deleted": True}


# ---------- Admin courses ----------
@api.post("/admin/courses")
async def create_course(data: CourseInput, _=Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": iso_now()}
    await db.courses.insert_one(doc)
    return clean(doc)


@api.put("/admin/courses/{course_id}")
async def update_course(course_id: str, data: CourseInput, _=Depends(require_admin)):
    old = await db.courses.find_one({"id": course_id}, {"_id": 0, "attachments": 1})
    if old:
        keep = {a.id for a in data.attachments}
        await soft_delete_files([a["id"] for a in old.get("attachments", []) if a["id"] not in keep])
    r = await db.courses.update_one({"id": course_id}, {"$set": data.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Cours introuvable")
    return clean(await db.courses.find_one({"id": course_id}, {"_id": 0}))


@api.delete("/admin/courses/{course_id}")
async def delete_course(course_id: str, _=Depends(require_admin)):
    old = await db.courses.find_one({"id": course_id}, {"_id": 0, "attachments": 1})
    if old:
        await soft_delete_files(attachment_ids([old]))
    await db.courses.delete_one({"id": course_id})
    return {"deleted": True}


# ---------- Admin sheets ----------
@api.post("/admin/sheets")
async def create_sheet(data: SheetInput, _=Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": iso_now()}
    await db.sheets.insert_one(doc)
    return clean(doc)


@api.put("/admin/sheets/{sheet_id}")
async def update_sheet(sheet_id: str, data: SheetInput, _=Depends(require_admin)):
    old = await db.sheets.find_one({"id": sheet_id}, {"_id": 0, "attachments": 1})
    if old:
        keep = {a.id for a in data.attachments}
        await soft_delete_files([a["id"] for a in old.get("attachments", []) if a["id"] not in keep])
    r = await db.sheets.update_one({"id": sheet_id}, {"$set": data.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "Fiche introuvable")
    return clean(await db.sheets.find_one({"id": sheet_id}, {"_id": 0}))


@api.delete("/admin/sheets/{sheet_id}")
async def delete_sheet(sheet_id: str, _=Depends(require_admin)):
    old = await db.sheets.find_one({"id": sheet_id}, {"_id": 0, "attachments": 1})
    if old:
        await soft_delete_files(attachment_ids([old]))
    await db.sheets.delete_one({"id": sheet_id})
    return {"deleted": True}


# ---------- Admin quizzes ----------
@api.post("/admin/quizzes")
async def create_quiz(data: QuizInput, _=Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": iso_now()}
    await db.quizzes.insert_one(doc)
    return clean(doc)


@api.put("/admin/quizzes/{quiz_id}")
async def update_quiz(quiz_id: str, data: QuizInput, _=Depends(require_admin)):
    r = await db.quizzes.update_one({"id": quiz_id}, {"$set": data.model_dump()})
    if r.matched_count == 0:
        raise HTTPException(404, "QCM introuvable")
    return clean(await db.quizzes.find_one({"id": quiz_id}, {"_id": 0}))


@api.delete("/admin/quizzes/{quiz_id}")
async def delete_quiz(quiz_id: str, _=Depends(require_admin)):
    await db.quizzes.delete_one({"id": quiz_id})
    return {"deleted": True}


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    try:
        await asyncio.to_thread(init_storage)
    except Exception as e:
        print(f"Storage init failed: {e}")
    existing = await db.settings.find_one({"id": SETTINGS_ID})
    if not existing:
        await db.settings.insert_one({
            "id": SETTINGS_ID,
            "admin_code": os.environ.get("ADMIN_CODE", "MEDGL-2026"),
            "created_at": iso_now(),
        })


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
