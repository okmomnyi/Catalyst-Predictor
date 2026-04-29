import os
import sys
import asyncio
import threading

# Make backend modules importable
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from flask import Flask, request, jsonify
from models.request_models import PredictionRequest
from services.prompt_builder import build_prediction_prompt
from services.openrouter import call_openrouter
from services.response_parser import parse_prediction_response
from services.safety_classifier import get_safety_config
import services.supabase_client as db

app = Flask(__name__)


def _fire_and_forget_store(prediction_id, request_data, prediction_data):
    try:
        asyncio.run(db.store_prediction(prediction_id, request_data, prediction_data))
    except Exception:
        pass


@app.route('/', methods=['POST'])
def handler():
    data = request.get_json(force=True)
    try:
        req = PredictionRequest.model_validate(data)

        system_prompt, user_prompt = build_prediction_prompt(req)

        raw_response = asyncio.run(call_openrouter(system_prompt, user_prompt))

        prediction = parse_prediction_response(raw_response)
        safety_config = get_safety_config(prediction.safety_level)

        result = prediction.model_dump()
        result["safety_config"] = safety_config

        # Persist in background thread (fire-and-forget)
        threading.Thread(
            target=_fire_and_forget_store,
            args=(prediction.prediction_id, req.model_dump(), result),
            daemon=True,
        ).start()

        return jsonify(result)

    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500
