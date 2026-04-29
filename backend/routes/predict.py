"""
POST /api/predict

Full prediction pipeline: validate → build prompt → call OpenRouter →
parse response → attach safety config → persist to Supabase (if configured).
"""

from fastapi import APIRouter, HTTPException
from models.request_models import PredictionRequest
from services.prompt_builder import build_prediction_prompt
from services.openrouter import call_openrouter
from services.response_parser import parse_prediction_response
from services.chemistry_postprocessor import apply_chemistry_consistency
from services.safety_classifier import get_safety_config
import services.supabase_client as db

router = APIRouter()


@router.post("/predict", response_model=dict)
async def predict_catalyst(request: PredictionRequest):
    try:
        # 1. Build AI prompt
        system_prompt, user_prompt = build_prediction_prompt(request)

        # 2. Call OpenRouter (async, non-blocking)
        raw_response = await call_openrouter(system_prompt, user_prompt)

        # 3. Parse + validate JSON response
        prediction = apply_chemistry_consistency(
            parse_prediction_response(raw_response),
            request,
        )

        # 4. Attach safety UI configuration
        safety_config = get_safety_config(prediction.safety_level)

        # 5. Build response dict
        result = prediction.model_dump()
        result["safety_config"] = safety_config

        # 6. Persist to Supabase (fire-and-forget — never fails the request)
        await db.store_prediction(
            prediction_id=prediction.prediction_id,
            request_data=request.model_dump(),
            prediction_data=result,
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
