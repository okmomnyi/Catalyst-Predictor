import { motion, AnimatePresence } from 'framer-motion';
import { useSafetyContext } from '../context/SafetyContext';
import SafetyBanner from './SafetyBanner';
import CatalystChart from './CatalystChart';
import ComparisonTable from './ComparisonTable';
import ExperimentLogger from './ExperimentLogger';

function ThermalCard({ temperature }) {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center text-center">
      <span className="material-symbols-outlined text-tertiary mb-4 mx-auto block" style={{ fontSize: 40 }}>
        temp_preferences_custom
      </span>
      <h4 className="font-syne font-semibold text-on-surface text-xl">Thermal Stability</h4>
      <p className="text-slate-500 text-sm mt-2 leading-relaxed">
        Predicted stability peak at{' '}
        <span className="text-tertiary font-grotesk font-medium">{temperature}°C</span>{' '}
        with minimal degradation.
      </p>
    </div>
  );
}

function ConfidenceCard({ efficiency, catalyst }) {
  const pct = Math.round(efficiency * 100);
  return (
    <div
      className="glass-panel rounded-2xl p-6 bg-gradient-to-br from-secondary-container/20 to-transparent"
      style={{ borderColor: 'rgba(210,187,255,0.15)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="material-symbols-outlined text-secondary" style={{ fontSize: 24 }}>auto_awesome</span>
        <span className="text-xs font-grotesk text-secondary uppercase tracking-widest">AI Confidence</span>
      </div>
      <div className="font-syne font-bold text-on-surface" style={{ fontSize: 38 }}>{pct}%</div>
      <p className="text-slate-500 text-sm mt-2 leading-relaxed">
        Top catalyst <span className="text-secondary font-grotesk font-medium">{catalyst}</span> scored {pct}% based on reaction kinetics analysis.
      </p>
    </div>
  );
}

/** Quality badge — QUANTITATIVE (green) or QUALITATIVE (amber) */
function QualityBadge({ quality, missing }) {
  const isQuant = quality === 'QUANTITATIVE';
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
      isQuant
        ? 'bg-green-500/10 border-green-500/20'
        : 'bg-yellow-500/10 border-yellow-500/20'
    }`}>
      <span
        className={`material-symbols-outlined shrink-0 mt-px ${isQuant ? 'text-green-400' : 'text-yellow-400'}`}
        style={{ fontSize: 18 }}
      >
        {isQuant ? 'verified' : 'info'}
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-bold font-grotesk uppercase tracking-widest ${isQuant ? 'text-green-400' : 'text-yellow-400'}`}>
          {isQuant ? 'Quantitative Prediction' : 'Qualitative Prediction'}
        </p>
        {!isQuant && missing?.length > 0 && (
          <p className="text-xs text-slate-400 mt-1">
            Add to unlock quantitative results:{' '}
            <span className="text-yellow-400">{missing.join(', ')}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Catalyst validation — shows which substances were flagged as non-catalysts */
function ValidationPanel({ validations }) {
  const invalid = validations.filter(v => !v.is_valid_catalyst);
  if (!invalid.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-5 border border-error/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-error" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
          block
        </span>
        <h4 className="font-syne font-semibold text-error text-base">
          {invalid.length} Substance{invalid.length > 1 ? 's' : ''} Rejected — Not a Catalyst
        </h4>
      </div>
      <div className="space-y-3">
        {invalid.map(v => (
          <div key={v.substance} className="flex items-start gap-3 bg-error/5 rounded-lg px-4 py-3 border border-error/15">
            <span className="material-symbols-outlined text-error shrink-0 mt-px" style={{ fontSize: 16 }}>cancel</span>
            <div>
              <p className="text-sm font-medium text-on-surface font-grotesk">{v.substance}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{v.invalidity_reason}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/** Reaction analysis panel — primary equation, side reactions, byproducts, thermodynamics, mechanism */
function ReactionAnalysisPanel({ prediction }) {
  const {
    reaction_type_identified,
    primary_reaction_equation,
    side_reactions,
    byproducts,
    thermodynamics,
    reaction_mechanism_summary,
    ai_suggested_catalysts,
  } = prediction;

  if (!reaction_type_identified && !primary_reaction_equation) return null;

  const isExo = thermodynamics?.toLowerCase().includes('exo');
  const isEndo = thermodynamics?.toLowerCase().includes('endo');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="glass-panel rounded-2xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>biotech</span>
        <h3 className="font-syne font-semibold text-on-surface text-base">Reaction Analysis</h3>
        {reaction_type_identified && (
          <span className="ml-auto text-xs font-grotesk text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
            {reaction_type_identified}
          </span>
        )}
        {ai_suggested_catalysts && (
          <span className="text-xs font-grotesk text-secondary bg-secondary/10 border border-secondary/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            AI-suggested catalysts
          </span>
        )}
      </div>

      {/* Primary equation */}
      {primary_reaction_equation && (
        <div className="rounded-lg bg-surface-container px-4 py-3 border border-white/5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Primary Equation</p>
          <p className="text-on-surface font-grotesk text-sm font-medium leading-relaxed">{primary_reaction_equation}</p>
        </div>
      )}

      {/* Thermodynamics */}
      {thermodynamics && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-grotesk ${
          isExo
            ? 'bg-orange-500/10 border-orange-500/20 text-orange-300'
            : isEndo
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            : 'bg-surface-container border-white/5 text-slate-400'
        }`}>
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16 }}>
            {isExo ? 'local_fire_department' : isEndo ? 'ac_unit' : 'thermometer'}
          </span>
          <span>{thermodynamics}</span>
        </div>
      )}

      {/* Mechanism */}
      {reaction_mechanism_summary && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Mechanism</p>
          <p className="text-slate-400 text-sm leading-relaxed">{reaction_mechanism_summary}</p>
        </div>
      )}

      {/* Side reactions + byproducts */}
      {(side_reactions?.length > 0 || byproducts?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {side_reactions?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-yellow-500" style={{ fontSize: 14 }}>device_hub</span>
                Side Reactions
              </p>
              <ul className="space-y-1.5">
                {side_reactions.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                    <span className="text-yellow-500 shrink-0 mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {byproducts?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 14 }}>science</span>
                Byproducts
              </p>
              <ul className="space-y-1.5">
                {byproducts.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                    <span className="text-purple-400 shrink-0 mt-0.5">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** Assumptions strip — shown when the AI made notable assumptions */
function AssumptionsStrip({ assumptions }) {
  if (!assumptions?.length) return null;
  return (
    <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-surface-container border border-white/5">
      <span className="material-symbols-outlined text-slate-500 shrink-0 mt-px" style={{ fontSize: 16 }}>help_outline</span>
      <div className="text-xs text-slate-500 leading-relaxed">
        <span className="font-medium text-slate-400">Assumptions: </span>
        {assumptions.join(' · ')}
      </div>
    </div>
  );
}

export default function ResultsPanel({ prediction, formTemp }) {
  const { isBlocked, isDangerMode } = useSafetyContext();

  if (!prediction) return null;

  const bestCat = prediction.catalysts.find(c => c.catalyst === prediction.best_catalyst)
    ?? prediction.catalysts[0];

  return (
    <AnimatePresence>
      <motion.div
        key="results"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {isDangerMode && (
          <div
            className="fixed inset-0 pointer-events-none z-10"
            style={{ boxShadow: 'inset 0 0 120px rgba(255,180,171,0.08)' }}
          />
        )}

        <SafetyBanner
          safetyMessage={prediction.safety_message}
          precautions={prediction.precautions}
        />

        {!isBlocked && (
          <>
            {/* Quality badge + validation panel + reaction analysis */}
            <section className="px-gutter pb-6 max-w-7xl mx-auto space-y-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <QualityBadge
                  quality={prediction.prediction_quality}
                  missing={prediction.missing_for_quantitative}
                />
              </motion.div>
              {prediction.catalyst_validation?.length > 0 && (
                <ValidationPanel validations={prediction.catalyst_validation} />
              )}
              <ReactionAnalysisPanel prediction={prediction} />
            </section>

            {/* Bento grid */}
            {prediction.catalysts.length > 0 && (
              <section className="px-gutter pb-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
                <motion.div className="md:col-span-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <CatalystChart catalysts={prediction.catalysts} />
                </motion.div>
                <div className="md:col-span-4 flex flex-col gap-6">
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <ThermalCard temperature={formTemp ?? 85} />
                  </motion.div>
                  {bestCat && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                      <ConfidenceCard efficiency={bestCat.efficiency_score} catalyst={prediction.best_catalyst} />
                    </motion.div>
                  )}
                </div>
              </section>
            )}

            {/* No-valid-catalyst message */}
            {prediction.catalysts.length === 0 && (
              <section className="px-gutter pb-8 max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-2xl p-8 text-center border border-error/20">
                  <span className="material-symbols-outlined text-error mb-3 block mx-auto" style={{ fontSize: 48 }}>
                    science_off
                  </span>
                  <h3 className="font-syne font-semibold text-on-surface text-xl mb-2">No Valid Catalysts Found</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto">
                    None of the submitted substances are valid catalysts for this reaction. Review the validation panel above and try again with correct catalyst names.
                  </p>
                </motion.div>
              </section>
            )}

            {/* Reaction summary + reasoning */}
            <section className="px-gutter pb-8 max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                className="glass-panel rounded-2xl p-6 mb-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>biotech</span>
                  <h3 className="font-syne font-semibold text-on-surface text-base">Reaction Summary</h3>
                  {prediction.best_catalyst && (
                    <span className="ml-auto text-xs font-grotesk text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                      ★ Best: {prediction.best_catalyst}
                    </span>
                  )}
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed">{prediction.reaction_summary}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{prediction.general_reasoning}</p>

                {/* Safety basis */}
                {prediction.safety_basis && (
                  <div className="flex items-start gap-2 pt-2 border-t border-white/5">
                    <span className="material-symbols-outlined text-slate-500 shrink-0 mt-px" style={{ fontSize: 14 }}>shield</span>
                    <p className="text-xs text-slate-500">
                      <span className="text-slate-400 font-medium">Safety basis: </span>{prediction.safety_basis}
                    </p>
                  </div>
                )}

                <AssumptionsStrip assumptions={prediction.assumptions_made} />
              </motion.div>
            </section>

            {/* Comparison table */}
            {prediction.catalysts.length > 0 && (
              <section className="px-gutter pb-8 max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <ComparisonTable
                    catalysts={prediction.catalysts}
                    bestCatalyst={prediction.best_catalyst}
                    predictionQuality={prediction.prediction_quality}
                  />
                </motion.div>
              </section>
            )}

            {/* Experiment logger */}
            {prediction.catalysts.length > 0 && (
              <section className="px-gutter pb-16 max-w-7xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <ExperimentLogger
                    predictionId={prediction.prediction_id}
                    catalysts={prediction.catalysts}
                  />
                </motion.div>
              </section>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
