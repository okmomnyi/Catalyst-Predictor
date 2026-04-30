"""
services/prompt_builder.py — v2.0

Complete rebuild implementing:
  - GIGO principle: output precision matches input precision
  - Source taxonomy: every numerical value labelled by origin
  - Hard prohibitions: no invented metrics, no solvent-as-catalyst
  - Strict catalyst validation before any prediction
  - Honest uncertainty: "cannot determine" is a valid output
"""

from models.request_models import PredictionRequest


SYSTEM_PROMPT = """You are a senior analytical chemist. Your role is to provide 
scientifically accurate, honest predictions about chemical reactions and catalyst 
performance. You reason strictly from established chemistry principles.

════════════════════════════════════════
ABSOLUTE PROHIBITIONS — NEVER VIOLATE
════════════════════════════════════════

1. NEVER invent numerical values. Every number you output must be either:
   (a) A known literature value — state its source context (e.g. "NIST", "CRC Handbook", "established kinetics")
   (b) Calculated directly from the user's specific numerical inputs — show the basis
   (c) If neither applies: output null and state "cannot be determined from inputs provided"

2. NEVER output a percentage for risk, confidence, or safety unless it is a 
   stoichiometric ratio or thermodynamic probability with a defined mathematical basis.
   Risk is a CATEGORY (SAFE/CAUTION/RESTRICTED/DANGER/DO_NOT_PERFORM), not a percentage.

3. NEVER accept a solvent as a catalyst. Water, ethanol, acetone, DMSO and other 
   solvents facilitate reactions by providing a medium — they do not lower activation 
   energy and are not catalysts. Flag any solvent submitted as a catalyst immediately.

4. NEVER accept a reactant or product of the reaction as a catalyst. 
   A catalyst is consumed and regenerated — a substance that is consumed net is a reactant.

5. NEVER list a byproduct or side reaction unless it is a documented, named side 
   reaction for this specific system. Do not speculate about possible byproducts.

6. NEVER use a generic rate law template (e.g. rate = k[A][B]) unless that specific 
   rate law is experimentally established in literature for this reaction. If the rate 
   law is unknown, say so.

7. NEVER mix the primary reaction with parallel reactions in the same analysis. 
   If parallel reactions exist, list them separately and clearly labelled.

8. If the user's input describes a reaction that does not exist chemically 
   (impossible reaction, wrong products), state this clearly and explain why.

════════════════════════════════════════
SOURCE TAXONOMY — APPLY TO EVERY VALUE
════════════════════════════════════════

Before outputting any numerical or categorical value, internally ask:
  - Is this a LITERATURE value? (known, published, citable)
  - Is this CALCULATED from the user's specific inputs?
  - Is this QUALITATIVE only? (directional, no number possible)
  - Is this UNAVAILABLE? (genuinely cannot be determined)

Every field that accepts a number or rating must also have a corresponding 
_basis field declaring which of these four categories applies.

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
Respond in raw JSON only. No markdown. No text outside the JSON object.
Malformed JSON breaks the application."""


def build_prediction_prompt(request: PredictionRequest) -> tuple[str, str]:
    """
    Builds the two-stage prediction prompt with full GIGO and honesty controls.

    Stage 1: Substance classification — validates every submitted catalyst
    Stage 2: Prediction — only for confirmed catalysts, accuracy tied to inputs

    The specificity report tells the AI exactly what was and wasn't provided
    so it knows which fields can be quantitative vs qualitative.
    """

    # ── Specificity report ──────────────────────────────────────────────────
    # Tells the AI what it has to work with so it knows where it must say
    # "unavailable" vs where it can give quantitative output

    specificity_lines = []

    if request.concentration is not None:
        specificity_lines.append(
            f"  ✓ Concentration: {request.concentration} mol/L → "
            f"rate calculations possible"
        )
    else:
        specificity_lines.append(
            "  ✗ Concentration: NOT PROVIDED → "
            "rate must be qualitative only. Do not output a rate number."
        )

    if request.volume_ml is not None:
        specificity_lines.append(
            f"  ✓ Volume: {request.volume_ml} mL → "
            f"mole quantities calculable"
        )
    else:
        specificity_lines.append(
            "  ✗ Volume: NOT PROVIDED → "
            "mole quantities unavailable"
        )

    if request.catalyst_mass_g is not None:
        specificity_lines.append(
            f"  ✓ Catalyst mass: {request.catalyst_mass_g} g → "
            f"catalyst loading ratio calculable"
        )
    else:
        specificity_lines.append(
            "  ✗ Catalyst mass: NOT PROVIDED → "
            "catalyst loading unknown. Yield must be qualitative only."
        )

    if request.num_trials is not None:
        specificity_lines.append(
            f"  ✓ Trials planned: {request.num_trials}"
        )

    specificity_block = "\n".join(specificity_lines)

    # ── Catalyst list ────────────────────────────────────────────────────────
    catalyst_lines = "\n".join(
        f"  {i+1}. \"{c}\"" for i, c in enumerate(request.catalysts)
    )

    reactant_list = ", ".join(request.reactants)

    # ── Full prompt ──────────────────────────────────────────────────────────
    user_prompt = f"""
REACTION PARAMETERS
───────────────────
Reaction Type  : {request.reaction_type}
Reactants      : {reactant_list}
Temperature    : {request.temperature_celsius}°C
Pressure       : {request.pressure_atm} atm
Solvent        : {request.solvent}

INPUT SPECIFICITY REPORT
────────────────────────
(This determines which fields you may populate with numbers vs qualitative labels)

{specificity_block}

SUBSTANCES SUBMITTED FOR CATALYST EVALUATION
─────────────────────────────────────────────
{catalyst_lines}

══════════════════════════════════════════════════
STAGE 1 — SUBSTANCE CLASSIFICATION (MANDATORY FIRST)
══════════════════════════════════════════════════

Classify every submitted substance. For each one determine:

  VALID_CATALYST     → confirmed to catalyse this specific reaction in literature
  SOLVENT            → provides reaction medium, does not lower Ea, is NOT a catalyst
  REACTANT           → consumed net in the reaction, is NOT a catalyst  
  PRODUCT            → produced in the reaction, is NOT a catalyst
  INHIBITOR          → slows the reaction, opposite of a catalyst
  INERT              → no chemical role in this reaction
  WRONG_REACTION     → catalyses a different reaction, not this one
  UNKNOWN            → insufficient data to classify

For anything that is NOT a VALID_CATALYST, provide a clear one-sentence 
chemical explanation of what it actually is and why it cannot be a catalyst here.

Only substances classified as VALID_CATALYST proceed to Stage 2.
If zero valid catalysts are found, Stage 2 is skipped entirely.

══════════════════════════════════════════════════
STAGE 2 — PREDICTION (valid catalysts only)
══════════════════════════════════════════════════

REACTION ANALYSIS:
  - State the correct reaction type and balanced primary equation
  - State ΔH° only if it is a known literature value — include source context
  - State K_eq only if it is a known literature value
  - List parallel/side reactions ONLY if they are documented for this system,
    separated clearly from the primary reaction
  - If the rate law is experimentally established in literature, state it with source
  - If the rate law is unknown, output "rate_law": "not established in literature"

FOR EACH VALID CATALYST:
  Rate prediction:
    - If concentration was provided → attempt quantitative estimate with units
    - If concentration was NOT provided → qualitative only (Fast/Medium/Slow)
      and set rate_quantitative to null
    
  Yield prediction:
    - If catalyst mass and volume provided → attempt quantitative estimate
    - Otherwise → qualitative only (High/Medium/Low)
      and set yield_quantitative to null

  Activation energy:
    - Only state Ea reduction if this specific catalyst's effect on this
      specific reaction is documented. Otherwise null.

  Efficiency score:
    - A relative ranking score between 0.0 and 1.0 based ONLY on the
      relative performance of the catalysts in THIS submitted list.
    - Do not compare to catalysts not in the list.
    - State the basis: what property drives the ranking.

SAFETY:
  Classify using exactly one tier:
    SAFE           → standard lab, no significant hazard
    CAUTION        → irritants, mild exotherm, or minor fumes — ventilation needed
    RESTRICTED     → toxic gas possible, significant exotherm, corrosive products —
                     supervisor and fume hood mandatory
    DANGER         → explosive risk, acutely toxic products, violent reaction,
                     or severe injury possible — professional oversight only
    DO_NOT_PERFORM → no safe amateur or school laboratory context exists

  Safety basis must name the SPECIFIC hazard (e.g. "produces Cl₂ gas",
  "highly exothermic — ΔH = -411 kJ/mol", "sodium reacts violently with water").
  Do NOT output a risk percentage. Safety is a category, not a number.

══════════════════════════════════════════════════
REQUIRED JSON SCHEMA — return this structure exactly
══════════════════════════════════════════════════

{{
  "prediction_quality": "QUANTITATIVE | QUALITATIVE",
  "missing_for_quantitative": [],

  "reaction": {{
    "type": "reaction type string",
    "balanced_equation": "balanced chemical equation",
    "delta_h_kjmol": null,
    "delta_h_basis": "literature value (NIST) | calculated from inputs | unavailable",
    "k_eq": null,
    "k_eq_basis": "literature value | unavailable",
    "rate_law": "established rate law or 'not established in literature'",
    "rate_law_basis": "literature value | unavailable",
    "side_reactions": [
      {{
        "equation": "balanced side reaction equation",
        "conditions": "when/why this occurs",
        "documented_source_context": "e.g. occurs above 100°C per established kinetics"
      }}
    ],
    "reaction_summary": "one precise sentence"
  }},

  "substance_classification": [
    {{
      "substance": "name as submitted",
      "classification": "VALID_CATALYST | SOLVENT | REACTANT | PRODUCT | INHIBITOR | INERT | WRONG_REACTION | UNKNOWN",
      "explanation": "one sentence chemical explanation",
      "proceeds_to_prediction": true
    }}
  ],

  "valid_catalyst_count": 0,
  "prediction_skipped_reason": null,

  "catalysts": [
    {{
      "catalyst": "name",
      "rank": 1,
      "catalyst_type": "Heterogeneous | Homogeneous | Biological",
      "catalytic_mechanism": "mechanistic explanation",

      "predicted_rate": "Fast | Medium | Slow",
      "rate_quantitative": null,
      "rate_basis": "qualitative only — concentration not provided | calculated from inputs | literature value",

      "predicted_yield": "High | Medium | Low",
      "yield_quantitative": null,
      "yield_basis": "qualitative only — catalyst mass not provided | calculated | literature value",

      "activation_energy_reduction_kjmol": null,
      "activation_energy_basis": "literature value for this catalyst-reaction pair | unavailable",

      "efficiency_score": 0.0,
      "efficiency_basis": "relative ranking within submitted list based on [property]",

      "scientific_reasoning": "full explanation grounded in chemistry"
    }}
  ],

  "best_catalyst": "name or null if no valid catalysts",

  "safety_level": "SAFE | CAUTION | RESTRICTED | DANGER | DO_NOT_PERFORM",
  "safety_message": "one sentence naming the specific hazard",
  "safety_basis": "specific chemical hazard e.g. produces H2 gas, violent exotherm",
  "precautions": [],

  "general_reasoning": "full scientific explanation",
  "assumptions_made": []
}}

Return ONLY the JSON object. Nothing before it. Nothing after it.
"""

    return SYSTEM_PROMPT, user_prompt