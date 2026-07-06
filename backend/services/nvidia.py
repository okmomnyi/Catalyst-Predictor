"""
Async NVIDIA NIM client with automatic fallback to a second API key.

Uses NVIDIA's OpenAI-compatible endpoint (https://build.nvidia.com) to run
free, open-source models such as Llama, Nemotron, Qwen, and DeepSeek.

If the primary key hits a rate limit (429), gateway timeout (504), or
service error (503), the call is retried transparently with the fallback
key before raising an error to the caller.
"""

import httpx
import os
import re
from dotenv import load_dotenv

load_dotenv(override=True)

NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
MODEL_ID   = os.getenv("MODEL_ID",   "deepseek-ai/deepseek-r1")
API_KEY_1  = os.getenv("NVIDIA_API_KEY")
API_KEY_2  = os.getenv("NVIDIA_API_KEY_2")  # fallback

# Status codes that warrant a retry on the fallback key
_RETRYABLE = {429, 503, 504}

# Reasoning models (e.g. DeepSeek-R1) wrap chain-of-thought in <think>...</think>.
_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)


def _strip_reasoning(content: str) -> str:
    """
    Remove <think>...</think> reasoning blocks so downstream JSON parsing
    only sees the model's final answer. Harmless for models that emit none.
    """
    cleaned = _THINK_BLOCK.sub("", content)
    # Some models emit only the closing tag; keep whatever follows the last one.
    if "</think>" in cleaned:
        cleaned = cleaned.rsplit("</think>", 1)[-1]
    return cleaned.strip()


async def _call_with_key(key: str, system_prompt: str, user_prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
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
        response = await client.post(NVIDIA_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        return _strip_reasoning(response.json()["choices"][0]["message"]["content"])


async def call_nvidia(system_prompt: str, user_prompt: str) -> str:
    """
    Calls NVIDIA NIM with the primary key; retries with fallback key on
    rate-limit / timeout errors if NVIDIA_API_KEY_2 is configured.
    """
    if not API_KEY_1:
        raise ValueError("NVIDIA_API_KEY is not set in environment variables")

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
