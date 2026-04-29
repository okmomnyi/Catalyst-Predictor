import os
import sys
import asyncio
import threading

# Make backend modules importable
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from flask import Flask, request, jsonify
from models.request_models import ExperimentalResult
from models.response_models import ValidationResponse
import services.supabase_client as db

app = Flask(__name__)


def _load_store(path):
    import json
    if not os.path.exists(path):
        return {}
    with open(path, "r") as f:
        return json.load(f)


def _save_store(path, data):
    import json
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


if os.getenv("VERCEL"):
    STORE_PATH = os.path.join("/tmp", "experimental_store.json")
else:
    STORE_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "experimental_store.json")


@app.route('/', methods=['POST'])
def handler():
    data = request.get_json(force=True)
    try:
        result = ExperimentalResult.model_validate(data)

        t = result.time_to_completion_seconds
        actual_rate = "Fast" if t < 30 else ("Medium" if t <= 120 else "Slow")

        # Fetch AI predicted rate (Supabase first, JSON fallback)
        if db.is_configured():
            ai_rate = asyncio.run(db.get_predicted_rate(result.prediction_id, result.catalyst))
        else:
            store = _load_store(STORE_PATH)
            entry = store.get(result.prediction_id, {})
            catalyst_data = entry.get("catalyst_data") or entry.get("catalysts") or []
            ai_rate = "Unknown"
            for c in catalyst_data:
                if isinstance(c, dict) and c.get("catalyst") == result.catalyst:
                    ai_rate = c.get("predicted_rate", "Unknown")

        rank = {"Fast": 3, "Medium": 2, "Slow": 1}
        diff = abs(rank.get(ai_rate, 0) - rank.get(actual_rate, 0))
        match = "Correct" if diff == 0 else ("Partial" if diff == 1 else "Incorrect")

        exp_row = {
            "prediction_id": result.prediction_id,
            "catalyst": result.catalyst,
            "time_to_completion_seconds": result.time_to_completion_seconds,
            "observation_notes": result.observation_notes or "",
            "actual_rate": actual_rate,
            "ai_predicted_rate": ai_rate,
            "match_assessment": match,
        }

        if db.is_configured():
            # Fire-and-forget
            threading.Thread(target=lambda: asyncio.run(db.store_experimental_result(exp_row)), daemon=True).start()
        else:
            store = _load_store(STORE_PATH)
            store.setdefault(result.prediction_id, {})
            store[result.prediction_id]["experimental_results"] = (
                store[result.prediction_id].get("experimental_results", []) + [exp_row]
            )
            _save_store(STORE_PATH, store)

        response = ValidationResponse(
            prediction_id=result.prediction_id,
            catalyst=result.catalyst,
            ai_predicted_rate=ai_rate,
            actual_time_seconds=result.time_to_completion_seconds,
            match_assessment=match,
            notes=result.observation_notes or "",
        )

        return jsonify(response.model_dump())

    except Exception as e:
        return jsonify({"error": str(e)}), 500
