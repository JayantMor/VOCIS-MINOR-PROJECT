from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone, timedelta
import uuid

from core.db import db
from core.security import hash_password, verify_password, create_access_token, get_current_user
from core.config import ADMIN_EMAIL, ADMIN_PASSWORD

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE = dict(httponly=True, secure=True, samesite="none", max_age=604800, path="/")


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


async def _ensure_workspace(user_id: str, name: str) -> str:
    existing = await db.workspaces.find_one({"owner_id": user_id})
    if existing:
        return existing["id"]
    ws_id = str(uuid.uuid4())
    await db.workspaces.insert_one({
        "id": ws_id, "owner_id": user_id, "name": f"{name}'s Workspace",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return ws_id


def _public(user, ws_id):
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name"),
            "role": user.get("role", "user"), "workspace_id": ws_id}


@router.post("/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {"email": email, "password_hash": hash_password(body.password), "name": body.name,
           "role": "user", "created_at": datetime.now(timezone.utc).isoformat()}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    ws_id = await _ensure_workspace(uid, body.name)
    await db.users.update_one({"_id": res.inserted_id}, {"$set": {"default_workspace_id": ws_id}})
    doc["_id"] = res.inserted_id
    token = create_access_token(uid, email)
    response.set_cookie("access_token", token, **COOKIE)
    return _public(doc, ws_id)


@router.post("/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower()
    ident = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < datetime.fromisoformat(locked_until):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in a few minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one({"identifier": ident}, {
            "$inc": {"count": 1},
            "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    await db.login_attempts.delete_one({"identifier": ident})
    uid = str(user["_id"])
    ws_id = user.get("default_workspace_id") or await _ensure_workspace(uid, user.get("name", "User"))
    token = create_access_token(uid, email)
    response.set_cookie("access_token", token, **COOKIE)
    return _public(user, ws_id)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(request: Request):
    user = await get_current_user(request)
    ws_id = user.get("default_workspace_id") or await _ensure_workspace(user["id"], user.get("name", "User"))
    return {"id": user["id"], "email": user["email"], "name": user.get("name"),
            "role": user.get("role", "user"), "workspace_id": ws_id}


async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if existing is None:
        res = await db.users.insert_one({
            "email": ADMIN_EMAIL.lower(), "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Lead Analyst", "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()})
        ws_id = await _ensure_workspace(str(res.inserted_id), "Lead Analyst")
        await db.users.update_one({"_id": res.inserted_id}, {"$set": {"default_workspace_id": ws_id}})
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL.lower()},
                                  {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
