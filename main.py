from __future__ import annotations

import base64
import dotenv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import time
import wave
from pathlib import Path
from typing import Any, AsyncGenerator, Iterable

import requests
from bs4 import BeautifulSoup
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel, Field


dotenv.load_dotenv(".env")
APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "local_data"
USERS_FILE = DATA_DIR / "users.json"
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
FALLBACK_MODEL_NAME = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.5-flash")
THINKING_LEVEL = os.getenv("GEMINI_THINKING_LEVEL", "minimal")
LIVE_MODEL_NAME = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")
TTS_MODEL_NAME = os.getenv("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 210_000
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_TOTAL_UPLOAD_BYTES = 18 * 1024 * 1024

SUPPORTED_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/gif",
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "audio/wav",
    "audio/x-wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/aiff",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "video/mp4",
    "video/mpeg",
    "video/mov",
    "video/quicktime",
    "video/avi",
    "video/x-flv",
    "video/mpg",
    "video/webm",
    "video/wmv",
    "video/3gpp",
}

# MediaRecorder in browsers labels audio-only recordings audio/webm, which the
# Files API does not list; the webm container decodes fine under the video path.
MIME_REMAP = {
    "audio/webm": "video/webm",
    "text/x-markdown": "text/markdown",
}

LIVE_VOICES = [
    {"name": "Kore", "label": "Kore", "tone": "clear and steady"},
    {"name": "Puck", "label": "Puck", "tone": "bright and upbeat"},
    {"name": "Charon", "label": "Charon", "tone": "calm and deep"},
    {"name": "Aoede", "label": "Aoede", "tone": "warm and lyrical"},
    {"name": "Fenrir", "label": "Fenrir", "tone": "grounded and direct"},
    {"name": "Leda", "label": "Leda", "tone": "soft and friendly"},
    {"name": "Orus", "label": "Orus", "tone": "confident and crisp"},
    {"name": "Zephyr", "label": "Zephyr", "tone": "light and energetic"},
]

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

HOUSE_STYLE = """You are LearnDifferent, a warm, accessible study assistant built for
neurodivergent learners. Formatting rules you must always follow:
- Never use an em dash anywhere in your output. Use a comma, a colon, or a new sentence instead.
- Use short paragraphs, plain language, and markdown headings where they help.
- Prefer numbered steps and short bullet lists over dense prose.
- Be encouraging and specific. Never invent facts about the student."""


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


class ChatMessage(BaseModel):
    role: str
    text: str


class StreamRequest(BaseModel):
    tool: str = "chat"
    prompt: str = ""
    context: str = ""
    profile: dict[str, Any] = Field(default_factory=dict)
    messages: list[ChatMessage] = Field(default_factory=list)


class ExemplarRequest(BaseModel):
    subject: str
    level: str = ""
    question: str
    focus: str = ""
    profile: dict[str, Any] = Field(default_factory=dict)


class LocalSaveRequest(BaseModel):
    key: str
    value: Any


class TTSRequest(BaseModel):
    text: str
    voice: str = "Kore"
    style: str = "Speak like a friendly, concise study tutor."


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


def optional_user(request: Request) -> tuple[str, dict[str, Any]] | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        email = _read_token(header.removeprefix("Bearer ").strip())
    except HTTPException:
        return None
    data = _load_users()
    user = data["users"].get(email)
    if not user:
        return None
    return email, user


def scrape_page_text(url: str, max_chars: int = 9000) -> tuple[str, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; LearnDifferentBot/1.0; "
            "+https://learndifferent.dev)"
        )
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    title = (soup.title.string or "").strip() if soup.title else ""
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars], title


def require_client() -> None:
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GEMINI_API_KEY in your environment.",
        )


def _gen_config(system_instruction: str | None = None) -> Any:
    kwargs: dict[str, Any] = {}
    if system_instruction:
        kwargs["system_instruction"] = system_instruction
    try:
        return genai_types.GenerateContentConfig(
            thinking_config=genai_types.ThinkingConfig(thinking_level=THINKING_LEVEL),
            **kwargs,
        )
    except Exception:
        return genai_types.GenerateContentConfig(**kwargs) if kwargs else None


def _model_candidates() -> list[str]:
    models = [MODEL_NAME, FALLBACK_MODEL_NAME, "gemini-3.5-flash"]
    return list(dict.fromkeys(model for model in models if model))


def _wav_bytes(pcm: bytes, rate: int = 24000) -> bytes:
    out = io.BytesIO()
    with wave.open(out, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(pcm)
    return out.getvalue()


def _audio_data_from_interaction(interaction: Any) -> bytes:
    output_audio = getattr(interaction, "output_audio", None)
    if output_audio is None and isinstance(interaction, dict):
        output_audio = interaction.get("output_audio") or interaction.get("outputAudio")
    data = getattr(output_audio, "data", None)
    if data is None and isinstance(output_audio, dict):
        data = output_audio.get("data")
    if not data:
        raise ValueError("No output audio returned by Gemini.")
    return base64.b64decode(data) if isinstance(data, str) else bytes(data)


def gemini_text(prompt: str | list[Any], system: str | None = None) -> str:
    require_client()
    last_error: Exception | None = None
    for model in _model_candidates():
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=_gen_config(system or HOUSE_STYLE),
            )
            return response.text or ""
        except HTTPException:
            raise
        except Exception as e:
            last_error = e
    raise HTTPException(status_code=500, detail=f"Gemini request failed: {last_error}")


def gemini_stream_parts(contents: str | list[Any], system: str | None = None) -> Iterable[str]:
    require_client()
    last_error: Exception | None = None
    for model in _model_candidates():
        yielded_any = False
        try:
            stream = client.models.generate_content_stream(
                model=model,
                contents=contents,
                config=_gen_config(system or HOUSE_STYLE),
            )
            for chunk in stream:
                text = getattr(chunk, "text", None)
                if text:
                    yielded_any = True
                    yield text
            return
        except Exception as e:
            if yielded_any:
                raise
            last_error = e
    raise HTTPException(status_code=500, detail=f"Gemini request failed: {last_error}")


def _sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def _stream_response(contents: str | list[Any], system: str | None = None) -> AsyncGenerator[str, None]:
    try:
        for text in gemini_stream_parts(contents, system):
            yield _sse({"type": "chunk", "text": text})
        yield _sse({"type": "done"})
    except HTTPException as e:
        yield _sse({"type": "error", "message": str(e.detail)})
    except Exception as e:
        yield _sse({"type": "error", "message": f"Gemini request failed: {e}"})


def sse_response(generator: AsyncGenerator[str, None]) -> StreamingResponse:
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _read_upload(upload: UploadFile) -> genai_types.Part:
    raw = await upload.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"{upload.filename or 'File'} is larger than 15 MB. Please use a smaller file.",
        )
    mime = (upload.content_type or "").split(";")[0].strip().lower()
    mime = MIME_REMAP.get(mime, mime)
    if mime.startswith("text/"):
        try:
            return genai_types.Part.from_text(text=raw.decode("utf-8", errors="replace"))
        except Exception:
            pass
    if mime not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"{upload.filename or 'That file'} has an unsupported type ({mime or 'unknown'}). "
                "Supported: images (PNG, JPG, WEBP, HEIC, GIF), PDF, plain text, "
                "common audio (MP3, WAV, OGG, AAC, FLAC) and video (MP4, WEBM, MOV)."
            ),
        )
    return genai_types.Part.from_bytes(data=raw, mime_type=mime)


async def _collect_parts(files: list[UploadFile] | None) -> list[genai_types.Part]:
    parts: list[genai_types.Part] = []
    total = 0
    for upload in files or []:
        raw_size = getattr(upload, "size", None)
        if raw_size:
            total += raw_size
        parts.append(await _read_upload(upload))
    if total > MAX_TOTAL_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Attachments exceed 18 MB total. Remove some files.")
    return parts


def _profile_line(profile: dict[str, Any]) -> str:
    active = [key for key, value in (profile or {}).items() if value and value is not False]
    if not active:
        return "No accessibility adjustments selected."
    return "Active accessibility settings: " + ", ".join(sorted(str(a) for a in active))


def _transcript_block(messages: list[ChatMessage], limit: int = 24) -> str:
    lines = []
    for message in messages[-limit:]:
        speaker = "Student" if message.role == "user" else "Assistant"
        lines.append(f"{speaker}: {message.text.strip()[:2400]}")
    return "\n".join(lines)


TOOL_INSTRUCTIONS = {
    "tutor": (
        "You are a Socratic tutor. Guide, never dump answers. Ask one guiding question, "
        "offer a small hint, and end with a quick check-yourself step."
    ),
    "chat": (
        "You are a general study companion. Answer clearly and helpfully. When study material "
        "from the student's decks or notebooks is provided, ground your answer in it and say "
        "which item you used."
    ),
    "adaptive": (
        "Produce a learning path with numbered steps. For each step give a title, what to do, "
        "an estimated time, and a difficulty from 1 to 5. Start with a two question diagnostic. "
        "Format each step as a markdown heading followed by short bullets."
    ),
    "feedback": (
        "Give rubric feedback on the student's writing: thesis, structure, evidence, clarity. "
        "Quote short fragments of their text when pointing at something. End with the single "
        "highest impact revision to do next."
    ),
    "comprehension": (
        "Create one short passage summary, then 5 scaffolded questions from literal to inferential. "
        "Put the answer key at the end under its own heading."
    ),
    "whiteboard": (
        "You are reviewing a student's math working. The student may provide the original "
        "question as text, as an image, or both. They may also provide working as a whiteboard "
        "image, typed text, or both. First identify the question you are reviewing, then say "
        "whether the working is valid, why, and show only the next valid step. Use plain "
        "notation the student can retype."
    ),
    "exemplar": (
        "Write a model answer with visible craft. After the model answer, add a section named "
        "'Why this works' with short annotated bullets that quote fragments of the model."
    ),
    "blurt": (
        "You are a supportive coach using the Blurt Method. Respond with these markdown sections: "
        "'## What you got right' (2 to 4 specific bullets), '## Gaps to fill' (exactly 3 plain bullets), "
        "'## Next step' (one revision task under 5 minutes), '## Encouragement' (one sentence)."
    ),
    "summarize": (
        "Summarize the provided notes into a tight Cornell summary: 3 to 5 cue questions, "
        "then a 3 sentence summary paragraph."
    ),
}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
        "gemini_model": MODEL_NAME,
        "gemini_live_model": LIVE_MODEL_NAME,
        "gemini_tts_model": TTS_MODEL_NAME,
        "thinking_level": THINKING_LEVEL,
    }


@app.get("/api/live/config")
async def live_config():
    return {
        "model": LIVE_MODEL_NAME,
        "tts_model": TTS_MODEL_NAME,
        "default_voice": "Kore",
        "voices": LIVE_VOICES,
        "latency_profiles": [
            {
                "id": "fastest",
                "label": "Fastest",
                "thinking_level": "minimal",
                "media_resolution": "MEDIA_RESOLUTION_LOW",
                "vad": "automatic",
            },
            {
                "id": "balanced",
                "label": "Balanced",
                "thinking_level": "low",
                "media_resolution": "MEDIA_RESOLUTION_LOW",
                "vad": "automatic",
            },
        ],
        "recommended_live_config": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": "Kore"}}
            },
            "thinkingConfig": {"thinkingLevel": "minimal"},
            "mediaResolution": "MEDIA_RESOLUTION_LOW",
            "realtimeInputConfig": {"automaticActivityDetection": {}},
        },
    }


@app.post("/api/voice/tts")
async def voice_tts(req: TTSRequest):
    require_client()
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Text is required.")
    if len(text) > 4000:
        text = text[:4000]

    voice_names = {voice["name"] for voice in LIVE_VOICES}
    voice = req.voice if req.voice in voice_names else "Kore"
    prompt = f"{req.style.strip() or 'Speak clearly and warmly.'}\n\n{text}"

    try:
        interaction = client.interactions.create(
            model=TTS_MODEL_NAME,
            input=prompt,
            response_format={"type": "audio"},
            generation_config={"speech_config": [{"voice": voice}]},
        )
        pcm = _audio_data_from_interaction(interaction)
        return Response(content=_wav_bytes(pcm), media_type="audio/wav")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini voice request failed: {e}")


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


@app.post("/api/ai/stream")
async def ai_stream(req: StreamRequest, auth=Depends(optional_user)):
    instructions = TOOL_INSTRUCTIONS.get(req.tool.strip().lower(), TOOL_INSTRUCTIONS["chat"])
    name = auth[1].get("display_name") if auth else "Student"

    sections = [
        f"STUDENT NAME: {name}",
        _profile_line(req.profile),
        f"TOOL BRIEF: {instructions}",
    ]
    if req.context.strip():
        sections.append(f"STUDY MATERIAL PROVIDED BY THE STUDENT:\n{req.context.strip()[:24000]}")
    if req.messages:
        sections.append(f"CONVERSATION SO FAR:\n{_transcript_block(req.messages)}")
    if req.prompt.strip():
        sections.append(f"CURRENT STUDENT MESSAGE:\n{req.prompt.strip()[:8000]}")
    sections.append("Reply to the current student message now.")

    return sse_response(_stream_response("\n\n".join(sections)))


@app.post("/api/chat/stream")
async def chat_stream(
    payload: str = Form(...),
    files: list[UploadFile] = File(default=[]),
    auth=Depends(optional_user),
):
    try:
        body = StreamRequest(**json.loads(payload))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid chat payload.")

    parts = await _collect_parts(files)
    instructions = TOOL_INSTRUCTIONS.get(body.tool.strip().lower(), TOOL_INSTRUCTIONS["chat"])
    name = auth[1].get("display_name") if auth else "Student"

    text_sections = [
        f"STUDENT NAME: {name}",
        _profile_line(body.profile),
        f"TOOL BRIEF: {instructions}",
    ]
    if body.context.strip():
        text_sections.append(
            f"STUDY MATERIAL PROVIDED BY THE STUDENT:\n{body.context.strip()[:24000]}"
        )
    if body.messages:
        text_sections.append(f"CONVERSATION SO FAR:\n{_transcript_block(body.messages)}")
    if parts:
        text_sections.append(
            "The student attached the files included with this message. Use them directly."
        )
    if body.prompt.strip():
        text_sections.append(f"CURRENT STUDENT MESSAGE:\n{body.prompt.strip()[:8000]}")
    text_sections.append("Reply to the current student message now.")

    contents: list[Any] = ["\n\n".join(text_sections), *parts]
    return sse_response(_stream_response(contents))


@app.post("/api/flashcards/generate")
async def generate_flashcards(
    payload: str = Form(...),
    files: list[UploadFile] = File(default=[]),
):
    try:
        body = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid payload.")

    topic = str(body.get("topic", "")).strip()
    notes = str(body.get("notes", "")).strip()
    count = max(3, min(int(body.get("count", 10) or 10), 30))
    parts = await _collect_parts(files)

    if not topic and not notes and not parts:
        raise HTTPException(
            status_code=422,
            detail="Give a topic, paste some notes, or attach files to generate cards from.",
        )

    prompt = f"""Create exactly {count} high quality flashcards for spaced repetition.

TOPIC: {topic or "infer from the material"}
NOTES FROM THE STUDENT:
{notes[:20000] or "(none, use the attached files)"}

Rules:
- Each card tests one atomic fact or idea. Fronts are questions, backs are short answers.
- Mix definition, application, and "explain why" cards.
- Never use an em dash character.
- Answer with ONLY a JSON array, no code fences, in this shape:
[{{"front": "question", "back": "answer"}}]"""

    raw = gemini_text([prompt, *parts])
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if not match:
        raise HTTPException(status_code=500, detail="The model did not return valid flashcards. Try again.")
    try:
        cards = json.loads(match.group(0))
        cards = [
            {"front": str(c["front"]).strip(), "back": str(c["back"]).strip()}
            for c in cards
            if isinstance(c, dict) and c.get("front") and c.get("back")
        ]
    except Exception:
        raise HTTPException(status_code=500, detail="Could not parse the generated flashcards. Try again.")
    if not cards:
        raise HTTPException(status_code=500, detail="No usable flashcards were generated. Try again.")
    return {"success": True, "cards": cards[:count]}


@app.post("/api/exemplar/stream")
async def exemplar_stream(req: ExemplarRequest):
    if not req.question.strip():
        raise HTTPException(status_code=422, detail="A question or task is required.")
    prompt = f"""{TOOL_INSTRUCTIONS["exemplar"]}

SUBJECT: {req.subject.strip() or "General"}
LEVEL / EXAM BOARD: {req.level.strip() or "Not specified, pick a sensible secondary school level"}
QUESTION OR TASK: {req.question.strip()[:2000]}
FOCUS: {req.focus.strip() or "Overall structure and technique"}
{_profile_line(req.profile)}

Write the exemplar now. Structure:
## Model answer
The complete model response, written at the requested level.
## Why this works
5 to 7 bullets, each quoting a short fragment and naming the technique.
## Try it yourself
One short task that asks the student to imitate a single technique from the model."""
    return sse_response(_stream_response(prompt))


@app.post("/api/crawl/stream")
async def crawl_stream(req: URLRequest):
    url = req.url.strip()
    if not re.match(r"^https?://", url):
        raise HTTPException(status_code=422, detail="Enter a full URL starting with http:// or https://")

    async def generate():
        yield _sse({"type": "stage", "stage": "connect", "detail": url})
        try:
            text, title = scrape_page_text(url)
        except requests.RequestException as e:
            yield _sse({"type": "error", "message": f"Failed to fetch that URL: {e}"})
            return
        except Exception as e:
            yield _sse({"type": "error", "message": f"Could not read that page: {e}"})
            return

        if len(text) < 50:
            yield _sse({"type": "error", "message": "Could not extract enough readable text from that URL."})
            return

        yield _sse({
            "type": "stage",
            "stage": "read",
            "detail": title or url,
            "chars": len(text),
        })
        yield _sse({"type": "stage", "stage": "compose", "detail": MODEL_NAME})

        prompt = f"""You are an expert tutor for neurodivergent learners.

SOURCE URL: {url}
PAGE TITLE: {title}
SCRAPED TEXT:
{text}

Generate adaptive study material with these markdown headers:

## TL;DR
Exactly 3 short sentences. One idea per sentence.

## Active Recall Questions
5 numbered questions. Include one "explain in your own words" question.

## Memory Hook
One vivid analogy or visual metaphor.

## Chunked Summary
3 to 4 bullet chunks, max 2 sentences each.

## Accessibility Tip
One concrete study tip tailored to this topic."""

        try:
            for part in gemini_stream_parts(prompt):
                yield _sse({"type": "chunk", "text": part})
            yield _sse({"type": "done", "title": title, "chars": len(text)})
        except HTTPException as e:
            yield _sse({"type": "error", "message": str(e.detail)})
        except Exception as e:
            yield _sse({"type": "error", "message": f"Gemini request failed: {e}"})

    return sse_response(generate())


@app.post("/api/interview/turn")
async def interview_turn(
    payload: str = Form(...),
    files: list[UploadFile] = File(default=[]),
):
    try:
        body = json.loads(payload)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid interview payload.")

    role = str(body.get("role", "a role of their choice")).strip()[:200]
    style = str(body.get("style", "friendly")).strip()[:60]
    stage = str(body.get("stage", "opening")).strip()[:40]
    answer_text = str(body.get("answer", "")).strip()[:8000]
    transcript = body.get("transcript", [])
    parts = await _collect_parts(files)

    transcript_lines = []
    for turn in transcript[-16:]:
        if isinstance(turn, dict):
            speaker = "Interviewer" if turn.get("role") == "interviewer" else "Candidate"
            transcript_lines.append(f"{speaker}: {str(turn.get('text', ''))[:1500]}")

    media_note = ""
    if parts:
        media_note = (
            "The candidate's answer was recorded and is attached (audio or video, possibly with a "
            "webcam snapshot). Transcribe and judge the spoken answer. If video or a snapshot is "
            "present, add one short note on delivery: pace, filler words, eye contact, posture."
        )

    if stage == "final":
        prompt = f"""You are an expert interview assessor. Produce a final scorecard for this mock interview.

ROLE BEING INTERVIEWED FOR: {role}
INTERVIEW STYLE: {style}

TRANSCRIPT:
{chr(10).join(transcript_lines) or "(no transcript)"}

Assess the candidate from the transcript and any attached media. Be specific and practical.
Respond in this exact markdown shape:
## Overall Score
Give one score out of 100 and one sentence.
## Score Breakdown
- Content:
- Structure:
- Communication:
- Evidence:
- Adaptability:
- Delivery:
## Best Moment
One concrete highlight.
## Biggest Upgrade
One concrete thing to practise next.
## Practice Plan
Three short bullets for the next session."""
        contents: list[Any] = [prompt, *parts]
        return sse_response(_stream_response(contents))

    prompt = f"""You are running a realistic adaptive mock interview and speaking as the interviewer.

ROLE BEING INTERVIEWED FOR: {role}
INTERVIEW STYLE: {style}
CURRENT STAGE: {stage}

TRANSCRIPT SO FAR:
{chr(10).join(transcript_lines) or "(interview is just starting)"}

CANDIDATE'S LATEST ANSWER (typed): {answer_text or "(none typed)"}
{media_note}

Respond as the interviewer, in this exact markdown shape:
## Feedback
2 or 3 sentences on the last answer: one strength, one concrete improvement. If video/audio is attached,
include a concrete delivery note. If this is the start of the interview, skip this section entirely.
## Question
Your next interview question, natural and specific to the role. One question only.
The question MUST directly test or follow up on the improvement you just named. Do not use a fixed
question list; adapt to the candidate's exact previous answer, gaps, and delivery.

Keep the whole reply under 180 words. Never break character except in the Feedback section."""

    contents: list[Any] = [prompt, *parts]
    return sse_response(_stream_response(contents))


# Legacy non-streaming endpoints kept for compatibility.


@app.post("/api/gemini/crawl")
async def crawl_and_generate(req: URLRequest):
    try:
        text, title = scrape_page_text(req.url)
        if len(text) < 50:
            raise HTTPException(
                status_code=422,
                detail="Could not extract enough readable text from that URL.",
            )
        prompt = f"""You are an expert tutor for neurodivergent learners.

SOURCE URL: {req.url}
SCRAPED TEXT:
{text}

Generate adaptive study material with markdown headers: ## TL;DR (3 short sentences),
## Active Recall Questions (5 numbered), ## Memory Hook (one analogy),
## Chunked Summary (3 to 4 bullets), ## Accessibility Tip (one tip)."""
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
    prompt = f"""{TOOL_INSTRUCTIONS["blurt"]}

TOPIC: {req.topic.strip()}

STUDENT BLURT:
{req.student_input.strip()}"""
    return {"success": True, "topic": req.topic, "feedback": gemini_text(prompt)}


@app.post("/api/gemini/study-tool")
async def study_tool(req: StudyToolRequest, auth: tuple[str, dict[str, Any]] = Depends(current_user)):
    email, user = auth
    tool = req.tool.strip().lower()
    if not req.prompt.strip():
        raise HTTPException(status_code=422, detail="Prompt is required.")
    instructions = TOOL_INSTRUCTIONS.get(tool, TOOL_INSTRUCTIONS["chat"])
    prompt = f"""SIGNED-IN STUDENT: {user.get("display_name") or email}
TOOL BRIEF: {instructions}
{_profile_line(req.profile)}
CONTEXT:
{req.context[:5000]}

STUDENT REQUEST:
{req.prompt[:4000]}"""
    return {
        "success": True,
        "tool": tool,
        "model": MODEL_NAME,
        "thinking_level": THINKING_LEVEL,
        "output": gemini_text(prompt),
    }
