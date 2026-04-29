"""
Maps SafetyLevel enum values to UI-facing configuration objects.

This service acts as the single source of truth for what each
safety level means in terms of UI behaviour, colours (sent as
Tailwind class names), and action restrictions.

The frontend reads these values to decide how to render the interface.
"""

from models.response_models import SafetyLevel

SAFETY_CONFIG = {
    SafetyLevel.SAFE: {
        "ui_theme": "safe",
        "colour_hex": "#22c55e",          # Green
        "border_colour": "#16a34a",
        "icon": "✅",
        "label": "SAFE",
        "action": "proceed",              # Frontend: show results normally
        "banner_text": "This reaction is safe to perform under standard lab conditions."
    },
    SafetyLevel.CAUTION: {
        "ui_theme": "caution",
        "colour_hex": "#eab308",          # Yellow
        "border_colour": "#ca8a04",
        "icon": "⚠️",
        "label": "CAUTION",
        "action": "warn",
        "banner_text": "Take basic precautions. Perform in a well-ventilated area."
    },
    SafetyLevel.RESTRICTED: {
        "ui_theme": "restricted",
        "colour_hex": "#f97316",          # Orange
        "border_colour": "#ea580c",
        "icon": "🔶",
        "label": "RESTRICTED",
        "action": "restrict",
        "banner_text": "Significant hazard. Instructor supervision required. Use fume hood."
    },
    SafetyLevel.DANGER: {
        "ui_theme": "danger",
        "colour_hex": "#ef4444",          # Red
        "border_colour": "#dc2626",
        "icon": "🚨",
        "label": "DANGER",
        "action": "full_warning",         # Frontend: entire UI turns red
        "banner_text": "SERIOUS DANGER. Do not perform without professional oversight."
    },
    SafetyLevel.DO_NOT_PERFORM: {
        "ui_theme": "blocked",
        "colour_hex": "#1a0000",          # Near-black dark red
        "border_colour": "#7f1d1d",
        "icon": "☠️",
        "label": "DO NOT PERFORM",
        "action": "block",               # Frontend: block output, show stop screen
        "banner_text": "This reaction CANNOT be safely performed outside a professional laboratory. Do not attempt."
    }
}


def get_safety_config(level: SafetyLevel) -> dict:
    """
    Returns the full UI configuration dictionary for a given safety level.

    Args:
        level: SafetyLevel enum value from the AI response

    Returns:
        dict: UI configuration including colours, labels, and action type
    """
    return SAFETY_CONFIG.get(level, SAFETY_CONFIG[SafetyLevel.CAUTION])
