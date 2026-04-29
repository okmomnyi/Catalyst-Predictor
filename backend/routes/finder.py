"""
POST /api/find-catalyst

Natural language catalyst search — user describes a reaction in plain text
and receives a ranked list of suitable catalysts with explanations.
"""

import json
from fastapi import APIRouter, HTTPException
from models.request_models import CatalystSearchRequest
from models.response_models import CatalystFinderResponse, CatalystSuggestion
from services.prompt_builder import build_catalyst_finder_prompt
from services.openrouter import call_openrouter

router = APIRouter()


@router.post("/find-catalyst", response_model=dict)
async def find_catalyst(request: CatalystSearchRequest):
    try:
        system_prompt, user_prompt = build_catalyst_finder_prompt(
            description=request.description,
            reaction_type=request.reaction_type,
            temperature=request.temperature_celsius,
            context=request.context,
        )
        raw = await call_openrouter(system_prompt, user_prompt)

        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1])

        data = json.loads(cleaned)

        catalysts = [
            CatalystSuggestion(
                name=c["name"],
                full_name=c.get("full_name"),
                catalyst_type=c.get("catalyst_type", "Unknown"),
                suitability=c.get("suitability", "Good"),
                suitability_score=float(c.get("suitability_score", 0.7)),
                why=_sanitize_text(c.get("why", "")),
                conditions=_sanitize_text(c.get("conditions")),
                availability=c.get("availability"),
                safety=c.get("safety", "CAUTION"),
                safety_note=_sanitize_safety_text(c.get("safety_note")),
            )
            for c in data.get("catalysts", [])
        ]

        result = CatalystFinderResponse(
            reaction_understood=_sanitize_text(data["reaction_understood"]),
            catalysts=catalysts,
            recommended_conditions=_sanitize_text(data.get("recommended_conditions")),
            overall_safety=data.get("overall_safety", "CAUTION"),
            notes=_sanitize_safety_text(data.get("notes")),
        )
        return result.model_dump()

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"AI returned malformed JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Catalyst search failed: {str(e)}")


def _sanitize_text(value: str | None) -> str | None:
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


def _sanitize_safety_text(value: str | None) -> str | None:
    updated = _sanitize_text(value)
    if updated is None:
        return None
    if "safe" in updated.lower():
        return "Hazards depend on concentration, conditions, and handling controls."
    return updated
