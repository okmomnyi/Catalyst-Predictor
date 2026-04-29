"""
Parses and validates the raw JSON string returned by the AI model.
Strips markdown fences defensively, then maps the extended GIGO schema
to typed Pydantic models.
"""

import json
import uuid
from models.response_models import (
    PredictionResponse, CatalystPrediction, CatalystValidation, SafetyLevel
)


def parse_prediction_response(raw_response: str) -> PredictionResponse:
    cleaned = raw_response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1])

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI returned invalid JSON: {e}\nRaw: {raw_response[:400]}")

    # Parse catalyst validation entries
    validations = []
    for v in data.get("catalyst_validation", []):
        validations.append(CatalystValidation(
            substance=v.get("substance", ""),
            is_valid_catalyst=bool(v.get("is_valid_catalyst", True)),
            catalytic_mechanism=v.get("catalytic_mechanism"),
            invalidity_reason=v.get("invalidity_reason"),
        ))

    # Parse per-catalyst predictions (only valid ones are included by the AI)
    catalysts = []
    for c in data.get("catalysts", []):
        catalysts.append(CatalystPrediction(
            catalyst=c["catalyst"],
            rank=int(c["rank"]),
            catalyst_type=c.get("catalyst_type"),
            predicted_rate=c.get("predicted_rate", "Medium"),
            rate_quantitative=c.get("rate_quantitative"),
            rate_basis=c.get("rate_basis"),
            predicted_yield=c.get("predicted_yield", "Medium"),
            yield_quantitative=c.get("yield_quantitative"),
            yield_basis=c.get("yield_basis"),
            activation_energy_reduction=c.get("activation_energy_reduction"),
            activation_energy_range_kj_mol=c.get("activation_energy_range_kj_mol"),
            rate_law=c.get("rate_law"),
            efficiency_score=_optional_float(c.get("efficiency_score")),
            efficiency_basis=c.get("efficiency_basis"),
            reasoning=c.get("reasoning", ""),
            activity=_optional_float(c.get("activity")),
            selectivity=_optional_float(c.get("selectivity")),
            stability=_optional_float(c.get("stability")),
            energy_efficiency=_optional_float(c.get("energy_efficiency")),
            economic_viability=_optional_float(c.get("economic_viability")),
            weighted_score=_optional_float(c.get("weighted_score")),
            score_constraints=c.get("score_constraints") or [],
            relative_rate=_optional_float(c.get("relative_rate")),
            equilibrium_yield_score=_optional_float(c.get("equilibrium_yield_score")),
            thermodynamic_assessment=c.get("thermodynamic_assessment"),
            kinetic_assessment=c.get("kinetic_assessment"),
            condition_warnings=c.get("condition_warnings") or [],
            confidence=c.get("confidence"),
        ))

    # Determine best_catalyst: use AI's answer if valid catalysts exist
    best = data.get("best_catalyst")
    if not catalysts:
        best = None
    elif not best:
        best = catalysts[0].catalyst

    return PredictionResponse(
        prediction_id=str(uuid.uuid4()),
        reaction_summary=data["reaction_summary"],
        prediction_quality=data.get("prediction_quality", "QUALITATIVE"),
        missing_for_quantitative=data.get("missing_for_quantitative", []),
        catalyst_validation=validations,
        valid_catalyst_count=int(data.get("valid_catalyst_count", len(catalysts))),
        ai_suggested_catalysts=bool(data.get("ai_suggested_catalysts", False)),
        reaction_type_identified=data.get("reaction_type_identified"),
        primary_reaction_equation=data.get("primary_reaction_equation"),
        side_reactions=data.get("side_reactions", []),
        byproducts=data.get("byproducts", []),
        thermodynamics=data.get("thermodynamics"),
        thermodynamic_assessment=data.get("thermodynamic_assessment"),
        kinetic_assessment=data.get("kinetic_assessment"),
        reaction_mechanism_summary=data.get("reaction_mechanism_summary"),
        condition_warnings=data.get("condition_warnings") or [],
        consistency_checks=data.get("consistency_checks") or [],
        uncertainty_notes=data.get("uncertainty_notes") or [],
        catalysts=catalysts,
        best_catalyst=best,
        safety_level=SafetyLevel(data["safety_level"]),
        safety_message=data["safety_message"],
        safety_basis=data.get("safety_basis"),
        precautions=data.get("precautions", []),
        general_reasoning=data["general_reasoning"],
        assumptions_made=data.get("assumptions_made", []),
    )


def _optional_float(value):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
