from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import requests
from bs4 import BeautifulSoup
import os
import re

app = FastAPI(title="LearnDifferent — EdTech Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    model = None


class URLRequest(BaseModel):
    url: str


class BlurtRequest(BaseModel):
    topic: str
    student_input: str


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


def require_model():
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured. Set GEMINI_API_KEY in your environment.",
        )


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "gemini_configured": bool(GEMINI_API_KEY),
    }


@app.post("/api/gemini/crawl")
async def crawl_and_generate(req: URLRequest):
    require_model()
    try:
        text = scrape_page_text(req.url)
        if len(text) < 50:
            raise HTTPException(
                status_code=422,
                detail="Could not extract enough readable text from that URL.",
            )

        prompt = f"""You are an expert tutor for neurodivergent learners (ADHD, dyslexia,
visual impairment, autism). A student pasted a webpage to study.

SOURCE URL: {req.url}
SCRAPED TEXT:
{text}

Generate adaptive study material with these sections (use markdown headers):

## TL;DR
Write exactly 3 short sentences in plain, accessible language. One idea per sentence.

## Active Recall Questions
Provide 5 questions numbered 1–5. Mix difficulty. Use clear, unambiguous wording.
Avoid trick questions. Include one "explain in your own words" question.

## Memory Hook
One vivid analogy or visual metaphor for ADHD/dyslexic learners to anchor the core concept.

## Chunked Summary
Break the content into 3–4 bullet chunks (max 2 sentences each) for spaced reading.

## Accessibility Tip
One concrete study tip tailored to neurodivergent learners for this specific topic.

Keep tone warm and encouraging. No jargon without explanation."""

        gemini_response = model.generate_content(prompt)
        return {
            "success": True,
            "source_url": req.url,
            "chars_scraped": len(text),
            "data": gemini_response.text,
        }
    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/blurt-analyze")
async def analyze_blurt(req: BlurtRequest):
    require_model()
    if not req.topic.strip() or not req.student_input.strip():
        raise HTTPException(
            status_code=422,
            detail="Both topic and student_input are required.",
        )

    prompt = f"""You are a supportive study coach using the Blurt Method (write everything
you remember, then compare to the source).

TOPIC: {req.topic.strip()}

STUDENT BLURT:
{req.student_input.strip()}

Respond in markdown with these sections:

## What You Got Right 🎯
2–4 bullet points celebrating accurate recall. Be specific.

## Gaps to Fill
Exactly 3 bullet points of key information they missed. Plain language, no shame.

## Next Step
One small, actionable revision task they can do in under 5 minutes.

## Encouragement
One sentence of genuine encouragement.

Keep it concise and dyslexia-friendly (short paragraphs, clear headings)."""

    try:
        response = model.generate_content(prompt)
        return {
            "success": True,
            "topic": req.topic,
            "feedback": response.text,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
