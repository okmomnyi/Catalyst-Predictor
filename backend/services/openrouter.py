"""
Async OpenRouter client with automatic fallback to a second API key.

If the primary key hits a rate limit (429), gateway timeout (504), or
service error (503), the call is retried transparently with the fallback
key before raising an error to the caller.
"""

import httpx
import os
from dotenv import load_dotenv

load_dotenv(override=True)

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_ID   = os.getenv("MODEL_ID",   "google/gemini-2.0-flash-001")
API_KEY_1  = os.getenv("OPENROUTER_API_KEY")
API_KEY_2  = os.getenv("OPENROUTER_API_KEY_2")  # fallback

# Status codes that warrant a retry on the fallback key
_RETRYABLE = {429, 503, 504}


async def _call_with_key(key: str, system_prompt: str, user_prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title":      "Catalyst Effect Predictor",
    }
    payload = {
        "model":    MODEL_ID,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens":  2500,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


async def call_openrouter(system_prompt: str, user_prompt: str) -> str:
    """
    Calls OpenRouter with the primary key; retries with fallback key on
    rate-limit / timeout errors if OPENROUTER_API_KEY_2 is configured.
    """
    if not API_KEY_1:
        raise ValueError("OPENROUTER_API_KEY is not set in environment variables")

    try:
        return await _call_with_key(API_KEY_1, system_prompt, user_prompt)

    except httpx.HTTPStatusError as e:
        if e.response.status_code in _RETRYABLE and API_KEY_2:
            return await _call_with_key(API_KEY_2, system_prompt, user_prompt)
        raise

    except (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError):
        if API_KEY_2:
            return await _call_with_key(API_KEY_2, system_prompt, user_prompt)
        raise
