import os
import sys
import asyncio

# Make backend modules importable
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from flask import Flask, request, jsonify
from models.request_models import CatalystSearchRequest
from services.prompt_builder import build_catalyst_finder_prompt
from services.openrouter import call_openrouter

app = Flask(__name__)


@app.route('/', methods=['POST'])
def handler():
    data = request.get_json(force=True)
    try:
        req = CatalystSearchRequest.model_validate(data)

        system_prompt, user_prompt = build_catalyst_finder_prompt(
            description=req.description,
            reaction_type=req.reaction_type,
            temperature=req.temperature_celsius,
            context=req.context,
        )

        raw = asyncio.run(call_openrouter(system_prompt, user_prompt))

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1])

        import json
        data = json.loads(cleaned)

        return jsonify(_sanitize_finder_payload(data))

    except json.JSONDecodeError as e:
        return (jsonify({"error": f"AI returned malformed JSON: {e}"}), 422)
    except Exception as e:
        return (jsonify({"error": f"Catalyst search failed: {str(e)}"}), 500)


def _sanitize_finder_payload(data):
    for catalyst in data.get("catalysts", []):
        catalyst["why"] = _sanitize_text(catalyst.get("why", ""))
        catalyst["conditions"] = _sanitize_text(catalyst.get("conditions"))
        catalyst["safety_note"] = _sanitize_safety_text(catalyst.get("safety_note"))
    data["reaction_understood"] = _sanitize_text(data.get("reaction_understood", ""))
    data["recommended_conditions"] = _sanitize_text(data.get("recommended_conditions"))
    data["notes"] = _sanitize_safety_text(data.get("notes"))
    return data


def _sanitize_text(value):
    if value is None:
        return None
    replacements = {
        "goes to completion": "is thermodynamically favorable",
        "go to completion": "be thermodynamically favorable",
        "best catalyst": "evaluated catalyst",
        "optimal": "supported",
        "physiological conditions": "specified conditions",
    }
    updated = value
    for old, new in replacements.items():
        updated = updated.replace(old, new).replace(old.capitalize(), new.capitalize())
    return updated


def _sanitize_safety_text(value):
    updated = _sanitize_text(value)
    if updated is None:
        return None
    if "safe" in updated.lower():
        return "Hazards depend on concentration, conditions, and handling controls."
    return updated
