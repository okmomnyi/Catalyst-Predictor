from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


class SafetyLevel(str, Enum):
    SAFE           = "SAFE"
    CAUTION        = "CAUTION"
    RESTRICTED     = "RESTRICTED"
    DANGER         = "DANGER"
    DO_NOT_PERFORM = "DO_NOT_PERFORM"


class CatalystValidation(BaseModel):
    substance: str
    is_valid_catalyst: bool
    catalytic_mechanism: Optional[str] = None
    invalidity_reason: Optional[str] = None


class CatalystPrediction(BaseModel):
    catalyst: str
    rank: int
    catalyst_type: Optional[str] = None
    predicted_rate: str
    rate_quantitative: Optional[str] = None
    rate_basis: Optional[str] = None
    predicted_yield: str
    yield_quantitative: Optional[str] = None
    yield_basis: Optional[str] = None
    activation_energy_reduction: Optional[str] = None
    rate_law: Optional[str] = None
    efficiency_score: float
    efficiency_basis: Optional[str] = None
    reasoning: str


class PredictionResponse(BaseModel):
    prediction_id: str
    reaction_summary: str
    prediction_quality: str = "QUALITATIVE"
    missing_for_quantitative: List[str] = []
    catalyst_validation: List[CatalystValidation] = []
    valid_catalyst_count: int = 0

    # Detailed reaction analysis — always populated
    ai_suggested_catalysts: bool = False
    reaction_type_identified: Optional[str] = None
    primary_reaction_equation: Optional[str] = None
    side_reactions: List[str] = []
    byproducts: List[str] = []
    thermodynamics: Optional[str] = None
    reaction_mechanism_summary: Optional[str] = None

    catalysts: List[CatalystPrediction]
    best_catalyst: Optional[str] = None
    safety_level: SafetyLevel
    safety_message: str
    safety_basis: Optional[str] = None
    precautions: List[str]
    general_reasoning: str
    assumptions_made: List[str] = []


class CatalystSuggestion(BaseModel):
    name: str
    full_name: Optional[str] = None
    catalyst_type: str
    suitability: str
    suitability_score: float
    why: str
    conditions: Optional[str] = None
    availability: Optional[str] = None
    safety: str
    safety_note: Optional[str] = None


class CatalystFinderResponse(BaseModel):
    reaction_understood: str
    catalysts: List[CatalystSuggestion]
    recommended_conditions: Optional[str] = None
    overall_safety: str
    notes: Optional[str] = None


class ValidationResponse(BaseModel):
    prediction_id: str
    catalyst: str
    ai_predicted_rate: str
    actual_time_seconds: float
    match_assessment: str
    notes: str


class HealthResponse(BaseModel):
    status: str
    model: str
    version: str
