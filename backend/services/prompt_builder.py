"""
services/prompt_builder.py

Two prediction modes:
  1. User-specified catalysts — validate, then analyse each one in depth
  2. AI-suggest mode (catalysts=[]) — identify reaction type, suggest catalysts, full analysis

Both modes return a rich detailed response including side reactions, byproducts,
thermodynamics, and mechanism summary.
"""

from models.request_models import PredictionRequest

SYSTEM_PROMPT = """You are a senior analytical chemist with expertise in reaction \
kinetics, catalysis, thermodynamics, and laboratory safety. You reason from \
established chemical principles and peer-reviewed data.

CRITICAL RULES:
1. NEVER invent numerical values. State literature values as such; state when values cannot be determined.
2. ACCURACY SCALES WITH INPUT. Vague input = qualitative output. Exact quantities = quantitative output.
3. CATALYST VALIDATION IS MANDATORY when catalysts are provided. Exclude non-catalysts from predictions.
4. NEVER GUESS SAFETY. When uncertain, classify as RESTRICTED minimum.
5. RESPOND IN RAW JSON ONLY. No markdown. No text outside the JSON. Machine-parsed output."""

_DETAIL_SCHEMA = """
REQUIRED JSON SCHEMA — return ONLY this object, nothing before or after:

{{
  "reaction_type_identified": "The reaction type (e.g. Decomposition, Oxidation-Reduction)",
  "primary_reaction_equation": "Balanced chemical equation with arrows (e.g. 2H2O2 -> 2H2O + O2)",
  "side_reactions": [
    "Side reaction 1 with brief explanation",
    "Side reaction 2 with brief explanation"
  ],
  "byproducts": [
    "Compound name — properties and any hazard (e.g. O2 gas — supports combustion, fire hazard)",
    "Another byproduct — its significance"
  ],
  "thermodynamics": "Exothermic/Endothermic, delta-H if known from literature (e.g. Exothermic, dH = -98 kJ/mol)",
  "reaction_mechanism_summary": "2-3 sentences explaining the mechanistic steps",

  "reaction_summary": "One precise sentence describing the overall transformation",
  "prediction_quality": "QUANTITATIVE or QUALITATIVE",
  "missing_for_quantitative": ["inputs needed, or empty array"],
  "ai_suggested_catalysts": false,

  "catalyst_validation": [
    {{
      "substance": "Name as submitted",
      "is_valid_catalyst": true,
      "catalytic_mechanism": "Mechanistic explanation",
      "invalidity_reason": null
    }}
  ],
  "valid_catalyst_count": 1,

  "catalysts": [
    {{
      "catalyst": "Catalyst name",
      "rank": 1,
      "catalyst_type": "Heterogeneous or Homogeneous or Biological (enzyme)",
      "predicted_rate": "Fast or Medium or Slow",
      "rate_quantitative": null,
      "rate_basis": "qualitative only — concentration not provided",
      "predicted_yield": "High or Medium or Low",
      "yield_quantitative": null,
      "yield_basis": "qualitative only — catalyst mass not provided",
      "activation_energy_reduction": "e.g. Lowers Ea from ~75 kJ/mol to ~58 kJ/mol (literature) or null",
      "rate_law": "e.g. First order in H2O2 or null",
      "efficiency_score": 0.92,
      "efficiency_basis": "Relative ranking based on known rate constants",
      "reasoning": "Detailed scientific explanation"
    }}
  ],

  "best_catalyst": "Name of top catalyst or null if none valid",
  "safety_level": "SAFE or CAUTION or RESTRICTED or DANGER or DO_NOT_PERFORM",
  "safety_message": "One precise sentence stating the primary hazard",
  "safety_basis": "What specifically causes this safety classification",
  "precautions": ["Precaution 1", "Precaution 2"],
  "general_reasoning": "Full explanation: reaction chemistry, why top catalyst wins, limiting factors, what to expect",
  "assumptions_made": ["Every assumption this prediction depends on"]
}}"""


def build_prediction_prompt(request: PredictionRequest) -> tuple[str, str]:
    ai_suggest_mode = len(request.catalysts) == 0

    # Build specificity block
    notes = []
    if request.concentration is not None:
        notes.append(f"Reactant concentration: {request.concentration} mol/L (SPECIFIC — use for quantitative prediction)")
    else:
        notes.append("Reactant concentration: NOT PROVIDED — qualitative only")
    if request.volume_ml is not None:
        notes.append(f"Volume: {request.volume_ml} mL (SPECIFIC)")
    else:
        notes.append("Volume: NOT PROVIDED")
    if request.catalyst_mass_g is not None:
        notes.append(f"Catalyst mass: {request.catalyst_mass_g} g (SPECIFIC — use for quantitative yield)")
    else:
        notes.append("Catalyst mass: NOT PROVIDED — yield prediction qualitative only")
    if request.num_trials is not None:
        notes.append(f"Trials planned: {request.num_trials}")

    specificity_block = "\n".join(f"  - {n}" for n in notes)
    reactant_list = ", ".join(request.reactants)

    if ai_suggest_mode:
        catalyst_section = """CATALYST MODE: AI-SUGGEST
No catalysts were specified. You must:
  1. Identify what reaction(s) the reactants would undergo
  2. Suggest the 2-4 most effective catalysts for this reaction, ranked by effectiveness
  3. For each suggested catalyst: explain the mechanism, conditions, availability, and safety
  Set "ai_suggested_catalysts": true in the response."""
    else:
        catalyst_list = "\n".join(f"  {i+1}. {c}" for i, c in enumerate(request.catalysts))
        catalyst_section = f"""CATALYST MODE: USER-SPECIFIED
Substances submitted as catalysts:
{catalyst_list}

Validate each substance — is it chemically capable of catalysing THIS specific reaction?
If NO, state why and exclude it. If YES, confirm the mechanism.
Set "ai_suggested_catalysts": false."""

    reaction_type_str = (
        "NOT SPECIFIED — identify and state the reaction type from the reactants"
        if request.reaction_type.lower() in ("auto-detect", "auto detect", "")
        else request.reaction_type
    )
    solvent_str = (
        "NOT SPECIFIED — assume aqueous (water) unless the chemistry strongly suggests otherwise"
        if (request.solvent or "").lower() in ("auto-detect", "auto detect", "")
        else request.solvent
    )

    user_prompt = f"""REACTION PARAMETERS:
- Reaction Type: {reaction_type_str}
- Reactants: {reactant_list}
- Temperature: {request.temperature_celsius}°C
- Pressure: {request.pressure_atm} atm
- Solvent: {solvent_str}

INPUT SPECIFICITY REPORT:
{specificity_block}

{catalyst_section}

ANALYSIS REQUIRED — for ALL submissions, regardless of mode:

1. REACTION IDENTIFICATION
   - What type of reaction is this?
   - Write the primary balanced equation
   - List ALL significant side reactions
   - List ALL byproducts with their properties and hazards
   - State thermodynamics (exo/endothermic, delta-H from literature if known)
   - Summarise the reaction mechanism in 2-3 sentences

2. CATALYST ANALYSIS (for each valid/suggested catalyst)
   - Rank by effectiveness for THIS reaction
   - State catalyst type (heterogeneous/homogeneous/biological)
   - Provide rate, yield, activation energy, rate law where known
   - Cite source: "literature value" or "qualitative — [what is missing]"

3. SAFETY ANALYSIS
   - Consider ALL products including byproducts
   - Rate the overall reaction safety
   - List specific precautions

{_DETAIL_SCHEMA}
"""
    return SYSTEM_PROMPT, user_prompt


def build_catalyst_finder_prompt(
    description: str,
    reaction_type: str | None,
    temperature: float | None,
    context: str | None,
) -> tuple[str, str]:
    extras = []
    if reaction_type:
        extras.append(f"Reaction type: {reaction_type}")
    if temperature is not None:
        extras.append(f"Temperature: {temperature}°C")
    if context:
        extras.append(f"Context: {context}")
    extra_block = "\n".join(f"  - {e}" for e in extras) if extras else "  - None provided"

    user_prompt = f"""A user wants to find suitable catalysts for the following reaction:

DESCRIPTION: {description}

ADDITIONAL CONTEXT:
{extra_block}

Tasks:
1. Interpret what reaction the user is describing
2. Suggest 2-5 catalysts ranked by suitability
3. For each: explain WHY it works, optimal conditions, availability, safety
4. If the description is chemically unclear or impossible, explain what is wrong

Suitability: Excellent | Good | Moderate | Poor
Availability: Widely available (school/college) | Specialty (university) | Industrial only | Rare

Return ONLY this JSON:

{{
  "reaction_understood": "One sentence: what reaction you interpreted",
  "catalysts": [
    {{
      "name": "MnO2",
      "full_name": "Manganese Dioxide",
      "catalyst_type": "Heterogeneous or Homogeneous or Biological (enzyme)",
      "suitability": "Excellent",
      "suitability_score": 0.95,
      "why": "Why this catalyst is suitable — mechanism, known effectiveness",
      "conditions": "Optimal temperature, concentration, pH, solvent",
      "availability": "Where it can be sourced",
      "safety": "SAFE or CAUTION or RESTRICTED or DANGER",
      "safety_note": "Specific hazard or precaution for this catalyst"
    }}
  ],
  "recommended_conditions": "Overall best conditions for this reaction",
  "overall_safety": "SAFE or CAUTION or RESTRICTED or DANGER or DO_NOT_PERFORM",
  "notes": "Alternatives, warnings, or anything else the user should know"
}}
"""
    return SYSTEM_PROMPT, user_prompt
