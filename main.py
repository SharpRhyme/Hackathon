from __future__ import annotations

import base64
import dotenv
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from pydantic import BaseModel, Field


dotenv.load_dotenv(".env")
APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "local_data"
USERS_FILE = DATA_DIR / "users.json"
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
THINKING_LEVEL = os.getenv("GEMINI_THINKING_LEVEL", "minimal")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 210_000

app = FastAPI(title="LearnDifferent - EdTech Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TOKEN_SECRET = os.getenv("AUTH_TOKEN_SECRET") or GEMINI_API_KEY or "local-dev-secret-change-me"
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


class URLRequest(BaseModel):
    url: str


class BlurtRequest(BaseModel):
    topic: str
    student_input: str


class AuthRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None


class StudyToolRequest(BaseModel):
    tool: str
    prompt: str
    context: str = ""
    profile: dict[str, Any] = Field(default_factory=dict)


class LocalSaveRequest(BaseModel):
    key: str
    value: Any


def _now() -> int:
    return int(time.time())


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64url(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def _normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")
    return normalized


def _validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(
            status_code=422,
            detail="Password must include at least one letter and one number.",
        )


def _load_users() -> dict[str, Any]:
    DATA_DIR.mkdir(exist_ok=True)
    if not USERS_FILE.exists():
        return {"users": {}}
    with USERS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_users(data: dict[str, Any]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    tmp_file = USERS_FILE.with_suffix(".tmp")
    with tmp_file.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, sort_keys=True)
    tmp_file.replace(USERS_FILE)


def _hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${_b64url(salt)}${_b64url(digest)}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = _unb64url(salt_b64)
        expected = _unb64url(digest_b64)
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _public_user(email: str, user: dict[str, Any]) -> dict[str, Any]:
    return {
        "email": email,
        "display_name": user.get("display_name") or email.split("@")[0],
        "created_at": user.get("created_at"),
        "settings": user.get("settings", {}),
        "data": user.get("data", {}),
    }


def _sign_token(email: str) -> str:
    payload = {"email": email, "exp": _now() + TOKEN_TTL_SECONDS, "nonce": secrets.token_hex(8)}
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256)
    return f"{payload_b64}.{_b64url(signature.digest())}"


def _read_token(token: str) -> str:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        expected = hmac.new(
            TOKEN_SECRET.encode("utf-8"),
            payload_b64.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected, _unb64url(signature_b64)):
            raise ValueError("Bad signature")
        payload = json.loads(_unb64url(payload_b64))
        if payload.get("exp", 0) < _now():
            raise ValueError("Expired token")
        return _normalize_email(payload["email"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")


def current_user(request: Request) -> tuple[str, dict[str, Any]]:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Log in to use this feature.")
    email = _read_token(header.removeprefix("Bearer ").strip())
    data = _load_users()
    user = data["users"].get(email)
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return email, user


def scrape_page_text(url: str, max_chars: int = 6000) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; LearnDifferentBot/1.0; "
            "+https://learndifferent.dev)"
        )
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def require_client() -> None:
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GEMINI_API_KEY in your environment.",
        )


def gemini_text(prompt: str) -> str:
    require_client()
    try:
        response = client.interactions.create(
            model=MODEL_NAME,
            input=prompt,
            generation_config={"thinking_level": THINKING_LEVEL},
        )
        return response.output_text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini request failed: {e}")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "gemini_model": MODEL_NAME,
        "thinking_level": THINKING_LEVEL,
    }


@app.post("/api/auth/register")
async def register(req: AuthRequest):
    email = _normalize_email(req.email)
    _validate_password(req.password)
    data = _load_users()
    if email in data["users"]:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    data["users"][email] = {
        "display_name": (req.display_name or email.split("@")[0]).strip()[:80],
        "password_hash": _hash_password(req.password),
        "created_at": _now(),
        "failed_logins": 0,
        "settings": {},
        "data": {},
    }
    _save_users(data)
    user = _public_user(email, data["users"][email])
    return {"token": _sign_token(email), "user": user}


@app.post("/api/auth/login")
async def login(req: AuthRequest):
    email = _normalize_email(req.email)
    data = _load_users()
    user = data["users"].get(email)
    if not user or not _verify_password(req.password, user.get("password_hash", "")):
        if user:
            user["failed_logins"] = int(user.get("failed_logins", 0)) + 1
            _save_users(data)
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    user["failed_logins"] = 0
    user["last_login_at"] = _now()
    _save_users(data)
    return {"token": _sign_token(email), "user": _public_user(email, user)}


@app.get("/api/auth/me")
async def me(auth: tuple[str, dict[str, Any]] = Depends(current_user)):
    email, user = auth
    return {"user": _public_user(email, user)}


@app.post("/api/local/save")
async def save_local(req: LocalSaveRequest, auth: tuple[str, dict[str, Any]] = Depends(current_user)):
    email, _ = auth
    safe_key = re.sub(r"[^a-zA-Z0-9_.:-]", "_", req.key)[:120]
    data = _load_users()
    data["users"][email].setdefault("data", {})[safe_key] = req.value
    _save_users(data)
    return {"success": True, "key": safe_key}


@app.post("/api/gemini/crawl")
async def crawl_and_generate(req: URLRequest):
    try:
        text = scrape_page_text(req.url)
        if len(text) < 50:
            raise HTTPException(
                status_code=422,
                detail="Could not extract enough readable text from that URL.",
            )

        prompt = f"""You are an expert tutor for neurodivergent learners.

SOURCE URL: {req.url}
SCRAPED TEXT:
{text}

Generate adaptive study material with markdown headers:

## TL;DR
Exactly 3 short sentences. One idea per sentence.

## Active Recall Questions
5 numbered questions. Include one "explain in your own words" question.

## Memory Hook
One vivid analogy or visual metaphor.

## Chunked Summary
3-4 bullet chunks, max 2 sentences each.

## Accessibility Tip
One concrete study tip tailored to this topic.

Use plain language and concise paragraphs."""

        return {
            "success": True,
            "source_url": req.url,
            "chars_scraped": len(text),
            "model": MODEL_NAME,
            "thinking_level": THINKING_LEVEL,
            "data": gemini_text(prompt),
        }
    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")


@app.post("/api/blurt-analyze")
async def analyze_blurt(req: BlurtRequest):
    if not req.topic.strip() or not req.student_input.strip():
        raise HTTPException(status_code=422, detail="Both topic and student_input are required.")

    prompt = f"""You are a supportive study coach using the Blurt Method.

TOPIC: {req.topic.strip()}

STUDENT BLURT:
{req.student_input.strip()}

Respond in markdown:

## What You Got Right
2-4 specific bullet points.

## Gaps to Fill
Exactly 3 plain-language bullets.

## Next Step
One revision task under 5 minutes.

## Encouragement
One sentence."""

    return {"success": True, "topic": req.topic, "feedback": gemini_text(prompt)}


@app.post("/api/gemini/study-tool")
async def study_tool(req: StudyToolRequest, auth: tuple[str, dict[str, Any]] = Depends(current_user)):
    email, user = auth
    tool = req.tool.strip().lower()
    if not req.prompt.strip():
        raise HTTPException(status_code=422, detail="Prompt is required.")

    prompt = f"""You are LearnDifferent, an accessible study assistant.
Use short paragraphs, direct instructions, markdown headings, and no hidden chain-of-thought.

SIGNED-IN STUDENT: {user.get("display_name") or email}
TOOL: {tool}
ACCESSIBILITY PROFILE: {json.dumps(req.profile, ensure_ascii=True)}
CONTEXT:
{req.context[:5000]}

STUDENT REQUEST:
{req.prompt[:4000]}

Output requirements by tool:
- tutor: Ask one guiding Socratic question, then give a small hint and a check-yourself step.
- adaptive: Produce a 5-step learning path with difficulty, time estimate, and a quick diagnostic.
- feedback: Give rubric feedback on thesis, structure, evidence, clarity, and next revision.
- comprehension: Create one short passage summary and 5 scaffolded questions.
- whiteboard: Check the student's math step and give the next valid step.
- exemplar: Produce a concise exemplar essay outline with annotations.

Stay concise and accessible."""

    return {
        "success": True,
        "tool": tool,
        "model": MODEL_NAME,
        "thinking_level": THINKING_LEVEL,
        "output": gemini_text(prompt),
    }
