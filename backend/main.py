"""
Entry point for the Catalyst Effect Predictor FastAPI backend.
Registers all route modules and configures CORS to allow
the React frontend (localhost:5173) to communicate freely.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import predict, validate, health, finder

app = FastAPI(
    title="Catalyst Effect Predictor API",
    description="AI-powered catalyst prediction for chemical reactions",
    version="1.0.0"
)

# Allow React dev server and production frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules under /api prefix
app.include_router(health.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(validate.router, prefix="/api")
app.include_router(finder.router, prefix="/api")
