"""
Deterministic chemistry checks and scoring.

The language model supplies qualitative chemistry context, but this module owns
condition-sensitive scoring and contradiction prevention. It intentionally uses
broad ranges and confidence labels instead of false precision.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from models.request_models import PredictionRequest
from models.response_models import CatalystPrediction, PredictionResponse

R_GAS = 8.314462618


@dataclass(frozen=True)
class CatalystProfile:
    aliases: tuple[str, ...]
    catalyst_type: str
    ea_range_kj_mol: tuple[float, float]
    prefactor: float
    selectivity: float
    stability: float
    economic_viability: float
    notes: str


HABER_CATALYSTS: dict[str, CatalystProfile] = {
    "Fe": CatalystProfile(
        aliases=("fe", "iron", "magnetite"),
        catalyst_type="Heterogeneous",
        ea_range_kj_mol=(110.0, 160.0),
        prefactor=1.00,
        selectivity=88.0,
        stability=86.0,
        economic_viability=96.0,
        notes="Industrial baseline; robust and inexpensive, typically promoted rather than used as pure Fe.",
    ),
    "Ru": CatalystProfile(
        aliases=("ru", "ruthenium"),
        catalyst_type="Heterogeneous",
        ea_range_kj_mol=(80.0, 130.0),
        prefactor=1.80,
        selectivity=91.0,
        stability=78.0,
        economic_viability=42.0,
        notes="Often intrinsically more active than Fe, but cost and support sensitivity limit broad use.",
    ),
    "Co": CatalystProfile(
        aliases=("co", "cobalt"),
        catalyst_type="Heterogeneous",
        ea_range_kj_mol=(130.0, 190.0),
        prefactor=0.45,
        selectivity=76.0,
        stability=70.0,
        economic_viability=70.0,
        notes="Possible transition-metal surface chemistry, but generally not a top Haber-Bosch catalyst.",
    ),
    "Ni": CatalystProfile(
        aliases=("ni", "nickel"),
        catalyst_type="Heterogeneous",
        ea_range_kj_mol=(140.0, 210.0),
        prefactor=0.32,
        selectivity=68.0,
        stability=64.0,
        economic_viability=78.0,
        notes="Can bind nitrogen-containing species but is not preferred for ammonia synthesis.",
    ),
}


def apply_chemistry_consistency(
    prediction: PredictionResponse,
    request: PredictionRequest,
) -> PredictionResponse:
    """Apply deterministic corrections after AI parsing."""
    if _is_haber_bosch(request, prediction):
        _correct_haber_bosch(prediction, request)

    _rank_and_cap_scores(prediction)
    return prediction


def _is_haber_bosch(request: PredictionRequest, prediction: PredictionResponse) -> bool:
    text = " ".join(
        [
            request.reaction_type or "",
            " ".join(request.reactants),
            prediction.reaction_type_identified or "",
            prediction.primary_reaction_equation or "",
        ]
    ).lower()
    has_n2 = "n2" in text or "nitrogen" in text
    has_h2 = "h2" in text or "hydrogen" in text
    has_ammonia = "nh3" in text or "ammonia" in text or "haber" in text
    return has_ammonia or (has_n2 and has_h2)


def _correct_haber_bosch(prediction: PredictionResponse, request: PredictionRequest) -> None:
    temp_c = request.temperature_celsius
    pressure_atm = request.pressure_atm or 1.0
    temp_k = temp_c + 273.15

    prediction.reaction_type_identified = "Ammonia synthesis (Haber-Bosch)"
    prediction.primary_reaction_equation = "N2 + 3H2 <=> 2NH3"
    prediction.thermodynamics = (
        "Exothermic equilibrium reaction; delta-H is approximately -90 to -100 kJ "
        "per N2 + 3H2 -> 2NH3 reaction. Equilibrium yield decreases as temperature "
        "increases and increases as pressure increases."
    )
    prediction.thermodynamic_assessment = _haber_thermodynamics(temp_c, pressure_atm)
    prediction.kinetic_assessment = (
        "Kinetics are treated separately with an Arrhenius dependence on catalyst-dependent "
        "activation-energy ranges; higher temperature increases rate even when equilibrium yield falls."
    )

    prediction.side_reactions = _filter_haber_side_reactions(prediction.side_reactions)
    prediction.byproducts = _filter_haber_side_reactions(prediction.byproducts)

    warnings = _haber_condition_warnings(temp_c, pressure_atm)
    prediction.condition_warnings = _merge_unique(prediction.condition_warnings, warnings)
    prediction.uncertainty_notes = _merge_unique(
        prediction.uncertainty_notes,
        [
            "Activation energies and yields are reported as broad engineering ranges; exact values depend on catalyst formulation, promoters, support, gas composition, and reactor design.",
            "The score is a decision aid, not a substitute for kinetic fitting or equilibrium calculation with thermochemical tables.",
        ],
    )

    requested = request.catalysts or [name for name in HABER_CATALYSTS]
    corrected: list[CatalystPrediction] = []
    validation_by_name = {v.substance.lower(): v for v in prediction.catalyst_validation}

    for name in requested:
        profile_key = _match_haber_profile(name)
        if not profile_key:
            continue
        profile = HABER_CATALYSTS[profile_key]
        rate_index = _arrhenius_relative_rate(profile, temp_k)
        equilibrium_index = _haber_equilibrium_index(temp_c, pressure_atm)
        yield_score = _haber_yield_score(equilibrium_index)
        rate_label = _rate_label(rate_index)
        yield_label = _yield_label(yield_score)
        components = _score_components(profile, rate_index, yield_score, temp_c, pressure_atm)
        raw_score = _weighted_score(components)
        capped_score, constraints = _apply_score_caps(raw_score, rate_index, yield_score, components)

        catalyst = CatalystPrediction(
            catalyst=profile_key,
            rank=0,
            catalyst_type=profile.catalyst_type,
            predicted_rate=rate_label,
            rate_quantitative=None,
            rate_basis=(
                "Relative Arrhenius estimate from catalyst-dependent Ea range; no site density, "
                "promoter loading, gas composition, or reactor residence time supplied."
            ),
            predicted_yield=yield_label,
            yield_quantitative=None,
            yield_basis=(
                "Condition-sensitive equilibrium trend for exothermic ammonia synthesis; "
                "higher pressure improves equilibrium yield, higher temperature lowers it."
            ),
            activation_energy_reduction=(
                f"Apparent Ea range approximately {profile.ea_range_kj_mol[0]:.0f}-"
                f"{profile.ea_range_kj_mol[1]:.0f} kJ/mol for this catalyst class; not a single fixed value."
            ),
            activation_energy_range_kj_mol=(
                f"{profile.ea_range_kj_mol[0]:.0f}-{profile.ea_range_kj_mol[1]:.0f}"
            ),
            rate_law=None,
            efficiency_score=round(capped_score / 100.0, 3),
            efficiency_basis=(
                "Weighted score = 0.30 activity + 0.20 selectivity + 0.20 stability "
                "+ 0.15 energy_efficiency + 0.15 economic_viability, with caps for low rate/yield."
            ),
            reasoning=(
                f"{profile.notes} At {temp_c:g} C and {pressure_atm:g} atm, the model separates "
                f"faster Arrhenius kinetics from the lower high-temperature equilibrium yield."
            ),
            activity=round(components["activity"], 1),
            selectivity=round(components["selectivity"], 1),
            stability=round(components["stability"], 1),
            energy_efficiency=round(components["energy_efficiency"], 1),
            economic_viability=round(components["economic_viability"], 1),
            weighted_score=round(capped_score, 1),
            score_constraints=constraints,
            relative_rate=round(rate_index, 4),
            equilibrium_yield_score=round(yield_score, 1),
            thermodynamic_assessment=prediction.thermodynamic_assessment,
            kinetic_assessment=(
                f"Relative rate index {rate_index:.3g}; higher T increases this term through exp(-Ea/RT)."
            ),
            condition_warnings=warnings,
            confidence="medium" if 350 <= temp_c <= 550 and pressure_atm >= 50 else "low",
        )
        corrected.append(catalyst)

        validation = validation_by_name.get(str(name).lower())
        if validation:
            validation.is_valid_catalyst = True
            validation.catalytic_mechanism = "Dissociative N2 adsorption and stepwise hydrogenation on a metal surface."
            validation.invalidity_reason = None

    if corrected:
        prediction.catalysts = corrected
        prediction.valid_catalyst_count = len(corrected)
        prediction.best_catalyst = None
        prediction.general_reasoning = (
            "For ammonia synthesis, equilibrium and kinetics are separated. Raising temperature "
            "increases rate by Arrhenius behavior but reduces exothermic equilibrium conversion; "
            "raising pressure increases ammonia equilibrium yield. Catalyst ranking is therefore "
            "computed from condition-sensitive rate, yield, stability, energy, and economics."
        )
        prediction.assumptions_made = _merge_unique(
            prediction.assumptions_made,
            [
                "Idealized gas-phase Haber-Bosch trend model used because detailed reactor data were not supplied.",
                "Catalyst promoters, supports, particle size, poisons, and H2:N2 ratio were not specified.",
            ],
        )


def _filter_haber_side_reactions(items: list[str]) -> list[str]:
    filtered = []
    for item in items or []:
        low = item.lower()
        if "hydrazine" in low or "n2h4" in low:
            continue
        filtered.append(item)
    return filtered


def _match_haber_profile(name: str) -> str | None:
    low = str(name).strip().lower()
    for canonical, profile in HABER_CATALYSTS.items():
        if low == canonical.lower() or any(alias in low for alias in profile.aliases):
            return canonical
    return None


def _arrhenius_relative_rate(profile: CatalystProfile, temp_k: float) -> float:
    ea_mid_j_mol = (sum(profile.ea_range_kj_mol) / 2.0) * 1000.0
    reference_k = 723.15
    relative = math.exp((-ea_mid_j_mol / R_GAS) * ((1.0 / temp_k) - (1.0 / reference_k)))
    return max(0.0, min(10.0, profile.prefactor * relative))


def _haber_equilibrium_index(temp_c: float, pressure_atm: float) -> float:
    pressure_term = math.log10(max(pressure_atm, 1.0)) / math.log10(200.0)
    pressure_term = max(0.0, min(1.2, pressure_term))
    temp_term = 1.0 / (1.0 + math.exp((temp_c - 430.0) / 75.0))
    return max(0.0, min(1.0, 0.15 + 0.85 * pressure_term * temp_term))


def _haber_yield_score(equilibrium_index: float) -> float:
    return max(5.0, min(95.0, 100.0 * equilibrium_index))


def _score_components(
    profile: CatalystProfile,
    rate_index: float,
    yield_score: float,
    temp_c: float,
    pressure_atm: float,
) -> dict[str, float]:
    activity = max(5.0, min(98.0, 20.0 + 55.0 * math.log10(1.0 + 4.0 * rate_index)))
    temp_penalty = max(0.0, abs(temp_c - 430.0) - 120.0) * 0.08
    pressure_penalty = max(0.0, pressure_atm - 200.0) * 0.03
    stability = max(20.0, min(98.0, profile.stability - temp_penalty - pressure_penalty))
    energy_efficiency = max(10.0, min(95.0, 92.0 - 0.06 * max(temp_c - 250.0, 0.0) - 0.05 * pressure_atm))
    selectivity = max(10.0, min(98.0, profile.selectivity - 0.10 * max(temp_c - 550.0, 0.0)))
    economic = max(5.0, min(98.0, profile.economic_viability))
    return {
        "activity": activity,
        "selectivity": selectivity,
        "stability": stability,
        "energy_efficiency": energy_efficiency,
        "economic_viability": economic,
        "yield": yield_score,
    }


def _weighted_score(components: dict[str, float]) -> float:
    return (
        0.30 * components["activity"]
        + 0.20 * components["selectivity"]
        + 0.20 * components["stability"]
        + 0.15 * components["energy_efficiency"]
        + 0.15 * components["economic_viability"]
    )


def _apply_score_caps(
    score: float,
    rate_index: float,
    yield_score: float,
    components: dict[str, float],
) -> tuple[float, list[str]]:
    constraints = []
    capped = score
    if rate_index < 0.08:
        capped = min(capped, 45.0)
        constraints.append("Rate is very low, so score capped at 45.")
    elif rate_index < 0.25:
        capped = min(capped, 60.0)
        constraints.append("Rate is low, so score capped at 60.")
    if yield_score < 25.0:
        capped = min(capped, 50.0)
        constraints.append("Equilibrium yield is low, so score capped at 50.")
    elif yield_score < 45.0:
        capped = min(capped, 70.0)
        constraints.append("Equilibrium yield is moderate-low, so high scores are prevented.")
    key_metrics = [
        components["activity"],
        components["selectivity"],
        components["stability"],
        components["energy_efficiency"],
        components["economic_viability"],
        yield_score,
    ]
    if capped > 80.0 and min(key_metrics) < 55.0:
        capped = 80.0
        constraints.append("A key metric is poor, so score cannot exceed 80.")
    return max(0.0, min(100.0, capped)), constraints


def _rate_label(rate_index: float) -> str:
    if rate_index < 0.25:
        return "Slow"
    if rate_index < 1.0:
        return "Medium"
    return "Fast"


def _yield_label(yield_score: float) -> str:
    if yield_score < 35.0:
        return "Low"
    if yield_score < 70.0:
        return "Medium"
    return "High"


def _haber_thermodynamics(temp_c: float, pressure_atm: float) -> str:
    equilibrium_index = _haber_equilibrium_index(temp_c, pressure_atm)
    label = _yield_label(_haber_yield_score(equilibrium_index)).lower()
    return (
        f"At {temp_c:g} C and {pressure_atm:g} atm, the equilibrium trend is {label} "
        "for NH3 because the reaction is exothermic and reduces gas moles."
    )


def _haber_condition_warnings(temp_c: float, pressure_atm: float) -> list[str]:
    warnings = []
    if temp_c < 250:
        warnings.append("Temperature is too low for practical Haber-Bosch kinetics even if equilibrium is favorable.")
    if temp_c > 650:
        warnings.append("Temperature is very high; rate may improve but ammonia equilibrium yield is strongly penalized.")
    if pressure_atm < 20:
        warnings.append("Pressure is far below typical industrial ammonia synthesis pressure; equilibrium yield should be low.")
    if pressure_atm > 300:
        warnings.append("Pressure is unusually high and creates major equipment and safety constraints.")
    return warnings


def _rank_and_cap_scores(prediction: PredictionResponse) -> None:
    for catalyst in prediction.catalysts:
        if catalyst.weighted_score is None:
            score = max(0.0, min(100.0, catalyst.efficiency_score * 100.0))
            if catalyst.predicted_rate.lower() == "slow":
                score = min(score, 45.0)
                catalyst.score_constraints.append("Predicted rate is slow, so score capped at 45.")
            if catalyst.predicted_yield.lower() == "low":
                score = min(score, 50.0)
                catalyst.score_constraints.append("Predicted yield is low, so score capped at 50.")
            catalyst.weighted_score = round(score, 1)
            catalyst.efficiency_score = round(score / 100.0, 3)

    prediction.catalysts.sort(key=lambda c: c.weighted_score or 0.0, reverse=True)
    for index, catalyst in enumerate(prediction.catalysts, start=1):
        catalyst.rank = index

    prediction.best_catalyst = prediction.catalysts[0].catalyst if prediction.catalysts else None
    prediction.consistency_checks = _merge_unique(
        prediction.consistency_checks,
        [
            "Slow-rate predictions are capped and cannot receive high scores.",
            "Low-yield predictions are capped and cannot receive high scores.",
            "Catalysts are ranked dynamically by weighted score, not by a hardcoded winner.",
        ],
    )


def _merge_unique(existing: list[str] | None, additions: list[str]) -> list[str]:
    merged = list(existing or [])
    seen = {item.lower() for item in merged}
    for item in additions:
        if item and item.lower() not in seen:
            merged.append(item)
            seen.add(item.lower())
    return merged
