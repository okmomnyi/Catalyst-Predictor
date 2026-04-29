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

        return jsonify(data)

    except json.JSONDecodeError as e:
        return (jsonify({"error": f"AI returned malformed JSON: {e}"}), 422)
    except Exception as e:
        return (jsonify({"error": f"Catalyst search failed: {str(e)}"}), 500)
