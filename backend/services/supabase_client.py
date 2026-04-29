"""
Supabase client — optional persistence layer.

If SUPABASE_URL and SUPABASE_ANON_KEY are set the app stores predictions
and experimental results in Supabase.  If they are missing it falls back
to the local JSON file (experimental_store.json) so the app still works
with zero cloud configuration.

Required Supabase SQL (run once in your project's SQL editor):

    create table if not exists predictions (
        id                 uuid primary key,
        reaction_type      text not null,
        reactants          jsonb not null,
        catalysts          jsonb not null,
        temperature_celsius float not null,
        pressure_atm       float not null default 1.0,
        solvent            text not null default 'water',
        reaction_summary   text,
        best_catalyst      text,
        safety_level       text,
        safety_message     text,
        precautions        jsonb,
        general_reasoning  text,
        catalyst_data      jsonb,
        created_at         timestamptz default now()
    );

    create table if not exists experimental_results (
        id                          uuid primary key default gen_random_uuid(),
        prediction_id               uuid not null,
        catalyst                    text not null,
        time_to_completion_seconds  float not null,
        observation_notes           text default '',
        actual_rate                 text,
        ai_predicted_rate           text,
        match_assessment            text,
        created_at                  timestamptz default now()
    );
"""

import os
from dotenv import load_dotenv

load_dotenv()

_SUPABASE_URL = os.getenv("SUPABASE_URL", "")
_SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# Lazily initialised — created on first use
_client = None


def is_configured() -> bool:
    """Returns True if Supabase credentials are present."""
    return bool(_SUPABASE_URL and _SUPABASE_KEY
                and not _SUPABASE_URL.startswith("your_"))


def get_client():
    """
    Returns a synchronous Supabase client, or None if not configured.
    We use the sync client to avoid async-context issues in FastAPI
    background tasks; all Supabase calls are fast I/O and won't block
    the event loop meaningfully.
    """
    global _client
    if not is_configured():
        return None
    if _client is None:
        from supabase import create_client
        _client = create_client(_SUPABASE_URL, _SUPABASE_KEY)
    return _client


async def store_prediction(prediction_id: str, request_data: dict, prediction_data: dict):
    """
    Upserts a prediction record.  Fire-and-forget — errors are swallowed
    so a Supabase hiccup never breaks the /api/predict response.
    """
    client = get_client()
    if not client:
        return
    try:
        row = {
            "id":                   prediction_id,
            "reaction_type":        request_data.get("reaction_type"),
            "reactants":            request_data.get("reactants"),
            "catalysts":            request_data.get("catalysts"),
            "temperature_celsius":  request_data.get("temperature_celsius"),
            "pressure_atm":         request_data.get("pressure_atm", 1.0),
            "solvent":              request_data.get("solvent", "water"),
            "reaction_summary":     prediction_data.get("reaction_summary"),
            "best_catalyst":        prediction_data.get("best_catalyst"),
            "safety_level":         prediction_data.get("safety_level"),
            "safety_message":       prediction_data.get("safety_message"),
            "precautions":          prediction_data.get("precautions"),
            "general_reasoning":    prediction_data.get("general_reasoning"),
            "catalyst_data":        prediction_data.get("catalysts"),
        }
        client.table("predictions").upsert(row).execute()
    except Exception:
        pass  # Never let persistence errors surface to the user


async def get_predicted_rate(prediction_id: str, catalyst: str) -> str:
    """
    Looks up the AI-predicted rate for a specific catalyst from Supabase.
    Returns 'Unknown' if the record isn't found or Supabase isn't configured.
    """
    client = get_client()
    if not client:
        return "Unknown"
    try:
        result = (
            client.table("predictions")
            .select("catalyst_data")
            .eq("id", prediction_id)
            .single()
            .execute()
        )
        catalyst_data = result.data.get("catalyst_data") or []
        for entry in catalyst_data:
            if entry.get("catalyst") == catalyst:
                return entry.get("predicted_rate", "Unknown")
    except Exception:
        pass
    return "Unknown"


async def store_experimental_result(data: dict):
    """
    Inserts an experimental result row.  Errors are swallowed.
    """
    client = get_client()
    if not client:
        return
    try:
        client.table("experimental_results").insert(data).execute()
    except Exception:
        pass
