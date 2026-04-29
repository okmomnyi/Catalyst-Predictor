"""
Pydantic models for validating all incoming request bodies.
FastAPI uses these to automatically reject malformed requests
before they ever reach the business logic.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional


class PredictionRequest(BaseModel):
    reaction_type: str = Field(..., min_length=2, max_length=100)
    reactants: List[str] = Field(..., min_length=1)
    catalysts: List[str] = Field(default=[], max_length=6,
        description="Leave empty to let the AI suggest catalysts automatically")
    temperature_celsius: float = Field(..., ge=-100, le=2000)
    pressure_atm: Optional[float] = Field(default=1.0)
    solvent: Optional[str] = Field(default="water")

    # Optional specificity fields — GIGO principle.
    # Providing these enables quantitative predictions; omitting gives qualitative only.
    concentration: Optional[float] = Field(
        default=None,
        description="Reactant concentration in mol/L. Enables quantitative rate prediction.",
        gt=0
    )
    volume_ml: Optional[float] = Field(
        default=None,
        description="Reaction volume in mL. Enables yield calculation.",
        gt=0
    )
    catalyst_mass_g: Optional[float] = Field(
        default=None,
        description="Mass of catalyst in grams. Required for quantitative yield.",
        gt=0
    )
    num_trials: Optional[int] = Field(
        default=None,
        description="Number of experimental trials planned.",
        gt=0
    )

    @field_validator('reactants', 'catalysts', mode='before')
    @classmethod
    def strip_whitespace(cls, v):
        if isinstance(v, list):
            return [item.strip() if isinstance(item, str) else item for item in v]
        return v


class CatalystSearchRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=1000,
        description="Natural language description of the reaction you want to perform")
    reaction_type: Optional[str] = Field(default=None)
    temperature_celsius: Optional[float] = Field(default=None)
    context: Optional[str] = Field(default=None, description="Extra context, e.g. school lab, industrial, budget constraints")


class ExperimentalResult(BaseModel):
    prediction_id: str = Field(..., description="ID returned from /api/predict")
    catalyst: str = Field(..., description="Which catalyst was tested")
    time_to_completion_seconds: float = Field(..., ge=0)
    observation_notes: Optional[str] = Field(default="")
