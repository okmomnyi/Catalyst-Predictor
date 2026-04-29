"""
POST /api/validate

Records a lab experimental result and compares it against the AI prediction.
Uses Supabase when configured; falls back to local JSON file otherwise.

Match logic:
  Fast < 30 s  |  Medium 30–120 s  |  Slow > 120 s
  Correct = same bucket  |  Partial = 1 bucket off  |  Incorrect = 2 off
"""

import json
import os
from fastapi import APIRouter, HTTPException
from models.request_models import ExperimentalResult
from models.response_models import ValidationResponse
import services.supabase_client as db

router = APIRouter()
STORE_PATH = os.path.join(os.path.dirname(__file__), "../data/experimental_store.json")


# ── JSON fallback helpers ─────────────────────────────────────────────────────

def _load_store() -> dict:
    if not os.path.exists(STORE_PATH):
        return {}
    with open(STORE_PATH, "r") as f:
        return json.load(f)


def _save_store(data: dict):
    os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)
    with open(STORE_PATH, "w") as f:
        json.dump(data, f, indent=2)


def _get_ai_rate_from_store(prediction_id: str, catalyst: str) -> str:
    store = _load_store()
    entry = store.get(prediction_id, {})
    catalyst_data = entry.get("catalyst_data") or entry.get("catalysts") or []
    for c in catalyst_data:
        if isinstance(c, dict) and c.get("catalyst") == catalyst:
            return c.get("predicted_rate", "Unknown")
    return entry.get("predicted_rate", "Unknown")


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/validate", response_model=ValidationResponse)
async def validate_experiment(result: ExperimentalResult):
    # 1. Classify actual time into rate bucket
    t = result.time_to_completion_seconds
    actual_rate = "Fast" if t < 30 else ("Medium" if t <= 120 else "Slow")

    # 2. Fetch AI-predicted rate (Supabase first, JSON fallback)
    if db.is_configured():
        ai_rate = await db.get_predicted_rate(result.prediction_id, result.catalyst)
    else:
        ai_rate = _get_ai_rate_from_store(result.prediction_id, result.catalyst)

    # 3. Compare buckets
    rank = {"Fast": 3, "Medium": 2, "Slow": 1}
    diff  = abs(rank.get(ai_rate, 0) - rank.get(actual_rate, 0))
    match = "Correct" if diff == 0 else ("Partial" if diff == 1 else "Incorrect")

    # 4. Persist result (Supabase or JSON)
    exp_row = {
        "prediction_id":             result.prediction_id,
        "catalyst":                  result.catalyst,
        "time_to_completion_seconds": result.time_to_completion_seconds,
        "observation_notes":         result.observation_notes or "",
        "actual_rate":               actual_rate,
        "ai_predicted_rate":         ai_rate,
        "match_assessment":          match,
    }

    if db.is_configured():
        await db.store_experimental_result(exp_row)
    else:
        store = _load_store()
        store.setdefault(result.prediction_id, {})
        store[result.prediction_id]["experimental_results"] = (
            store[result.prediction_id].get("experimental_results", []) + [exp_row]
        )
        _save_store(store)

    return ValidationResponse(
        prediction_id=result.prediction_id,
        catalyst=result.catalyst,
        ai_predicted_rate=ai_rate,
        actual_time_seconds=result.time_to_completion_seconds,
        match_assessment=match,
        notes=result.observation_notes or "",
    )
