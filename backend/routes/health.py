"""
GET /api/health

Simple health check route. Used to confirm the backend is running
and to expose the current model being used. The frontend can
ping this on load to verify connectivity.
"""

import os
from fastapi import APIRouter
from models.response_models import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    """
    Returns API status and current model configuration.
    Used by frontend to verify backend connectivity on app load.
    """
    return HealthResponse(
        status="ok",
        model=os.getenv("MODEL_ID", "google/gemini-2.0-flash-exp:free"),
        version="1.0.0"
    )
