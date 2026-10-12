from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os, uuid, bcrypt, jwt

ROOT_DIR = Path(__file__).parent
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
app = FastAPI(title="MedGL API")
api = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

class LoginInput(BaseModel):
    email: str
    password: str

class ModuleInput(BaseModel):
    title: str
    specialty: str
    description: str
    color: str = "teal"
    icon: str = "activity"
    lessons: int = 0
    questions: int = 0
    duration: str = "45 min"
    order: int = 0

class ProgressInput(BaseModel):
    module_id: str
    progress: int = Field(ge=0, le=100)

def password_hash(value: str) -> str:
    return bcrypt.hashpw(value.encode(), bcrypt.gensalt()).decode()

def valid_password(value: str, hashed: str) -> bool:
    return bcrypt.checkpw(value.encode(), hashed.encode())

def token_for(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=8)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)

def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

async def current_user(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Connexion requise")
    try:
        payload = jwt.decode(authorization[7:], os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "Session invalide")
        return user
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expirée")

async def admin_user(user=Depends(current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Accès administrateur requis")
    return user

@api.get("/")
async def root():
    return {"message": "MedGL API active"}

@api.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not valid_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    safe = clean({**user, "password_hash": None})
    safe.pop("password_hash", None)
    return {"token": token_for(user["id"], user["email"], user["role"]), "user": safe}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

@api.get("/modules")
async def modules():
    return [clean(x) for x in await db.modules.find({}, {"_id": 0}).sort("order", 1).to_list(100)]

@api.post("/modules")
async def create_module(data: ModuleInput, user=Depends(admin_user)):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.modules.insert_one(doc)
    return clean(doc)

@api.put("/modules/{module_id}")
async def update_module(module_id: str, data: ModuleInput, user=Depends(admin_user)):
    await db.modules.update_one({"id": module_id}, {"$set": data.model_dump()})
    doc = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not doc: raise HTTPException(404, "Module introuvable")
    return doc

@api.delete("/modules/{module_id}")
async def delete_module(module_id: str, user=Depends(admin_user)):
    await db.modules.delete_one({"id": module_id})
    return {"deleted": True}

@api.get("/progress")
async def get_progress(user=Depends(current_user)):
    rows = await db.progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return {row["module_id"]: row["progress"] for row in rows}

@api.post("/progress")
async def save_progress(data: ProgressInput, user=Depends(current_user)):
    await db.progress.update_one({"user_id": user["id"], "module_id": data.module_id}, {"$set": {"progress": data.progress}}, upsert=True)
    return {"module_id": data.module_id, "progress": data.progress}

@api.get("/admin/stats")
async def stats(user=Depends(admin_user)):
    return {"users": await db.users.count_documents({"role": "student"}), "modules": await db.modules.count_documents({}), "attempts": await db.progress.count_documents({}), "completion": 68}

@api.get("/admin/users")
async def users(user=Depends(admin_user)):
    return [clean(x) for x in await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)]

async def seed_data():
    email = os.environ["ADMIN_EMAIL"].lower()
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": email, "name": "Administrateur MedGL", "role": "admin", "password_hash": password_hash(os.environ["ADMIN_PASSWORD"]), "created_at": datetime.now(timezone.utc).isoformat()})
    if await db.modules.count_documents({}) == 0:
        seed = [
            ("Cardiologie", "Urgences et pathologies cardiaques", "Comprendre l'évaluation cardiovasculaire et les prises en charge essentielles.", "coral", "heart", 12, 30, "55 min"),
            ("Pneumologie", "Du symptôme au diagnostic respiratoire", "Dyspnée, toux et interprétation des examens respiratoires.", "sky", "lungs", 9, 24, "42 min"),
            ("Neurologie", "Examen clinique et syndromes", "Localiser une lésion et reconnaître les grands syndromes neurologiques.", "violet", "brain", 10, 26, "48 min"),
            ("Gastro-entérologie", "Raisonnement digestif", "Structurer l'interrogatoire et l'examen des troubles digestifs.", "amber", "stomach", 8, 20, "36 min"),
        ]
        await db.modules.insert_many([{ "id": str(uuid.uuid4()), "title": a, "specialty": a, "description": c, "color": d, "icon": e, "lessons": f, "questions": g, "duration": h, "order": i } for i, (a,b,c,d,e,f,g,h) in enumerate(seed)])

@app.on_event("startup")
async def startup():
    await seed_data()

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=False, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown():
    client.close()