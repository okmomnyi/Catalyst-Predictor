import os
import sys
import json
import asyncio

# Add project root and backend to path so imports resolve like Vercel functions
ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "backend"))

# Provide minimal env required
os.environ.setdefault("MODEL_ID", "test-model")
os.environ.setdefault("OPENROUTER_API_KEY", "dummy_key")

import importlib

import services.openrouter as openrouter_mod


async def fake_call(system_prompt, user_prompt):
    # Minimal valid JSON for prediction parsing
    payload = {
        "reaction_summary": "A -> B",
        "prediction_quality": "QUALITATIVE",
        "missing_for_quantitative": [],
        "catalyst_validation": [],
        "valid_catalyst_count": 0,
        "ai_suggested_catalysts": False,
        "reaction_type_identified": "Test Reaction",
        "primary_reaction_equation": "A -> B",
        "side_reactions": [],
        "byproducts": [],
        "thermodynamics": "Unknown",
        "reaction_mechanism_summary": "Mechanism",
        "catalysts": [],
        "best_catalyst": None,
        "safety_level": "SAFE",
        "safety_message": "No major hazards",
        "safety_basis": "None",
        "precautions": [],
        "general_reasoning": "Because testing",
        "assumptions_made": []
    }
    return json.dumps(payload)


openrouter_mod.call_openrouter = fake_call


def run_tests():
    results = []

    # Test health
    health = importlib.import_module('api.health')
    client = health.app.test_client()
    r = client.get('/')
    results.append(('health', r.status_code, r.json))

    # Test predict
    predict = importlib.import_module('api.predict')
    client = predict.app.test_client()
    predict_payload = {
        "reaction_type": "auto-detect",
        "reactants": ["A"],
        "catalysts": [],
        "temperature_celsius": 25.0
    }
    r = client.post('/', json=predict_payload)
    results.append(('predict', r.status_code, r.json))

    # Test find_catalyst
    find = importlib.import_module('api.find_catalyst')
    client = find.app.test_client()
    find_payload = {"description": "Convert A to B efficiently", "reaction_type": None}
    r = client.post('/', json=find_payload)
    results.append(('find_catalyst', r.status_code, r.json))

    # Test validate (uses JSON fallback if no Supabase)
    validate = importlib.import_module('api.validate')
    client = validate.app.test_client()
    validate_payload = {
        "prediction_id": "nonexistent-id",
        "catalyst": "Unknown",
        "time_to_completion_seconds": 10,
        "observation_notes": "Test run"
    }
    r = client.post('/', json=validate_payload)
    results.append(('validate', r.status_code, r.json))

    for name, status, body in results:
        print(f"--- {name} ---")
        print("status:", status)
        print("body:", json.dumps(body, indent=2))


if __name__ == '__main__':
    run_tests()
