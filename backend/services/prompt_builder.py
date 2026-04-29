"""
Prompt construction for catalyst prediction and catalyst search.

The prompt asks the model for chemistry context only. Deterministic scoring and
consistency checks are applied later in chemistry_postprocessor.py.
"""

from models.request_models import PredictionRequest

SYSTEM_PROMPT = """You are a senior analytical chemist with expertise in reaction
kinetics, catalysis, thermodynamics, and laboratory safety. You reason from
established chemical principles and peer-reviewed data.

CRITICAL RULES:
1. NEVER invent numerical values. State literature values as such; state when values cannot be determined.
2. ACCURACY SCALES WITH INPUT. Vague input = qualitative output. Exact quantities = quantitative output.
3. CATALYST VALIDATION IS MANDATORY when catalysts are provided. Exclude non-catalysts from predictions.
4. NEVER GUESS SAFETY. When uncertain, classify as RESTRICTED minimum.
5. SEPARATE THERMODYNAMICS FROM KINETICS. Equilibrium favorability and reaction rate are different quantities.
6. NEVER assign high scores when rate, yield, stability, or safety-relevant assumptions are poor.
7. RESPOND IN RAW JSON ONLY. No markdown. No text outside the JSON. Machine-parsed output."""

_DETAIL_SCHEMA = """
REQUIRED JSON SCHEMA - return ONLY this object, nothing before or after:

{{
  "reaction_type_identified": "The reaction type (e.g. Decomposition, Oxidation-Reduction)",
  "primary_reaction_equation": "Balanced chemical equation with arrows (e.g. 2H2O2 -> 2H2O + O2)",
  "side_reactions": [
    "Only chemically realistic side reactions under the submitted conditions"
  ],
  "byproducts": [
    "Compound name - properties and any hazard"
  ],
  "thermodynamics": "Equilibrium thermodynamics only: exothermic/endothermic, delta-H/delta-G/K_eq if known as ranges or literature values; do not mix with rate",
  "thermodynamic_assessment": "Condition-aware equilibrium assessment at the submitted T and P",
  "kinetic_assessment": "Rate/activation-barrier assessment only, including Arrhenius trend and catalyst dependence",
  "reaction_mechanism_summary": "2-3 sentences explaining the mechanistic steps",
  "condition_warnings": ["Warnings about unrealistic or unsafe T/P/solvent assumptions"],
  "consistency_checks": ["Checks applied to prevent rate/yield/score contradictions"],
  "uncertainty_notes": ["Ranges, confidence limits, missing data, and why exact values are not claimed"],

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
      "rate_basis": "qualitative only - concentration or site density not provided",
      "predicted_yield": "High or Medium or Low",
      "yield_quantitative": null,
      "yield_basis": "qualitative only - equilibrium/reactor data not provided",
      "activation_energy_reduction": "Catalyst effect as a range or null",
      "activation_energy_range_kj_mol": "e.g. 120-160 or null; use ranges, not fake precision",
      "rate_law": "e.g. First order in H2O2 or null",
      "efficiency_score": 0.72,
      "efficiency_basis": "Must reflect weighted score and caps; never merge thermodynamics and kinetics",
      "reasoning": "Detailed scientific explanation",
      "activity": 72,
      "selectivity": 80,
      "stability": 70,
      "energy_efficiency": 65,
      "economic_viability": 90,
      "weighted_score": 74.0,
      "score_constraints": ["Caps or penalties applied"],
      "relative_rate": null,
      "equilibrium_yield_score": null,
      "thermodynamic_assessment": "Per-catalyst equilibrium/yield implications if relevant",
      "kinetic_assessment": "Per-catalyst Arrhenius/rate implications",
      "condition_warnings": [],
      "confidence": "high, medium, or low"
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

    notes = []
    if request.concentration is not None:
        notes.append(f"Reactant concentration: {request.concentration} mol/L (specific - use only where scientifically justified)")
    else:
        notes.append("Reactant concentration: not provided - qualitative only")
    if request.volume_ml is not None:
        notes.append(f"Volume: {request.volume_ml} mL")
    else:
        notes.append("Volume: not provided")
    if request.catalyst_mass_g is not None:
        notes.append(f"Catalyst mass: {request.catalyst_mass_g} g")
    else:
        notes.append("Catalyst mass: not provided - no quantitative catalyst loading")
    if request.num_trials is not None:
        notes.append(f"Trials planned: {request.num_trials}")

    specificity_block = "\n".join(f"  - {n}" for n in notes)
    reactant_list = ", ".join(request.reactants)

    if ai_suggest_mode:
        catalyst_section = """CATALYST MODE: AI-SUGGEST
No catalysts were specified. You must:
  1. Identify what reaction(s) the reactants would undergo.
  2. Suggest 2-4 plausible catalysts for this reaction.
  3. Rank them by condition-dependent performance, not by a hardcoded preference.
  4. Explain mechanism, conditions, availability, and safety.
  Set "ai_suggested_catalysts": true in the response."""
    else:
        catalyst_list = "\n".join(f"  {i + 1}. {c}" for i, c in enumerate(request.catalysts))
        catalyst_section = f"""CATALYST MODE: USER-SPECIFIED
Substances submitted as catalysts:
{catalyst_list}

Validate each substance: is it chemically capable of catalysing THIS specific reaction?
If NO, state why and exclude it. If YES, confirm the mechanism.
Set "ai_suggested_catalysts": false."""

    reaction_type_str = (
        "NOT SPECIFIED - identify and state the reaction type from the reactants"
        if request.reaction_type.lower() in ("auto-detect", "auto detect", "")
        else request.reaction_type
    )
    solvent_str = (
        "NOT SPECIFIED - assume aqueous only if the chemistry supports it"
        if (request.solvent or "").lower() in ("auto-detect", "auto detect", "")
        else request.solvent
    )

    user_prompt = f"""REACTION PARAMETERS:
- Reaction Type: {reaction_type_str}
- Reactants: {reactant_list}
- Temperature: {request.temperature_celsius} C
- Pressure: {request.pressure_atm} atm
- Solvent: {solvent_str}

INPUT SPECIFICITY REPORT:
{specificity_block}

{catalyst_section}

ANALYSIS REQUIRED - for ALL submissions, regardless of mode:

1. REACTION IDENTIFICATION
   - What type of reaction is this?
   - Write the primary balanced equation.
   - List only chemically realistic side reactions under the submitted conditions.
   - For Haber-Bosch, do not include hydrazine formation unless the user explicitly asks about nonstandard plasma/electrochemical pathways and you justify it.
   - List byproducts with properties and hazards.
   - State thermodynamics separately: delta-H, delta-G, K_eq, and equilibrium trend if known.
   - State kinetics separately: activation barrier, rate law, Arrhenius trend, and catalyst dependence if known.
   - Summarise the reaction mechanism in 2-3 sentences.

2. CATALYST ANALYSIS
   - Rank by effectiveness for THIS reaction and THESE T/P conditions.
   - Provide separate rate, yield/equilibrium, activation-energy range, and rate law where known.
   - Use this weighted score: 0.30*activity + 0.20*selectivity + 0.20*stability + 0.15*energy_efficiency + 0.15*economic_viability.
   - Cap scores when rate or yield are poor; no score above 80 if any key metric is poor.
   - Cite basis as "literature range", "engineering estimate", or "qualitative - [what is missing]".

3. SAFETY ANALYSIS
   - Consider products, realistic byproducts, T, P, solvent, and catalyst handling.
   - Flag unrealistic or unsafe conditions.
   - List specific precautions.

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
        extras.append(f"Temperature: {temperature} C")
    if context:
        extras.append(f"Context: {context}")
    extra_block = "\n".join(f"  - {e}" for e in extras) if extras else "  - None provided"

    user_prompt = f"""A user wants to find suitable catalysts for the following reaction:

DESCRIPTION: {description}

ADDITIONAL CONTEXT:
{extra_block}

Tasks:
1. Interpret what reaction the user is describing.
2. Suggest 2-5 catalysts ranked by condition-dependent suitability.
3. For each: explain why it works, optimal conditions, availability, safety, and uncertainty.
4. If the description is chemically unclear or impossible, explain what is wrong.

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
      "why": "Why this catalyst is suitable - mechanism, known effectiveness, and uncertainty",
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
