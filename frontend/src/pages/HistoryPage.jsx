import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory, deleteEntry, clearHistory } from '../utils/historyStorage';

const SAFETY_COLORS = {
  SAFE:           { bg: 'bg-green-500/15',  border: 'border-green-500/30',  text: 'text-green-400',  icon: 'check_circle'     },
  CAUTION:        { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'warning'          },
  RESTRICTED:     { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'report'           },
  DANGER:         { bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400',    icon: 'dangerous'        },
  DO_NOT_PERFORM: { bg: 'bg-red-900/20',    border: 'border-red-700/40',    text: 'text-red-300',    icon: 'do_not_disturb_on'},
};

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function SafetyChip({ level }) {
  const c = SAFETY_COLORS[level] ?? SAFETY_COLORS.CAUTION;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-grotesk border ${c.bg} ${c.border} ${c.text}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>{c.icon}</span>
      {level}
    </span>
  );
}

function CatalystCard({ catalyst }) {
  const rate = catalyst.predicted_rate ?? '—';
  const yield_ = catalyst.predicted_yield ?? '—';
  return (
    <div className="flex items-start gap-3 bg-surface-container rounded-lg px-4 py-3 border border-white/5">
      <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {catalyst.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-on-surface font-grotesk">{catalyst.catalyst}</p>
        {catalyst.catalyst_type && (
          <p className="text-xs text-slate-500 mt-0.5">{catalyst.catalyst_type}</p>
        )}
        <div className="flex gap-4 mt-1.5">
          <span className="text-xs text-slate-500">Rate: <span className="text-slate-300">{rate}</span></span>
          <span className="text-xs text-slate-500">Yield: <span className="text-slate-300">{yield_}</span></span>
          <span className="text-xs text-slate-500">Score: <span className="text-secondary">{Math.round((catalyst.efficiency_score ?? 0) * 100)}%</span></span>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const p = entry.prediction;
  const safety = SAFETY_COLORS[p.safety_level] ?? SAFETY_COLORS.CAUTION;
  const isExo = p.thermodynamics?.toLowerCase().includes('exo');
  const isEndo = p.thermodynamics?.toLowerCase().includes('endo');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`glass-panel rounded-2xl border overflow-hidden ${safety.border}`}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <SafetyChip level={p.safety_level} />
            {p.prediction_quality === 'QUANTITATIVE' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-grotesk bg-green-500/10 border border-green-500/20 text-green-400">
                QUANTITATIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-grotesk bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                QUALITATIVE
              </span>
            )}
            {p.ai_suggested_catalysts && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-grotesk bg-secondary/10 border border-secondary/20 text-secondary">
                <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                AI suggested
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-slate-600 whitespace-nowrap">{formatDate(entry.timestamp)}</span>
            <button
              onClick={() => onDelete(entry.id)}
              className="ml-1 p-1 rounded-full hover:bg-error/10 text-slate-600 hover:text-error transition-colors"
              title="Delete"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
            </button>
          </div>
        </div>

        {/* Reactants */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.reactants.map(r => (
            <span key={r} className="px-2.5 py-0.5 rounded-full text-xs font-grotesk bg-primary/15 border border-primary/25 text-primary">
              {r}
            </span>
          ))}
          {entry.temperature && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-grotesk bg-surface-container border border-white/8 text-slate-400">
              {entry.temperature}°C
            </span>
          )}
        </div>

        {/* Reaction type + equation */}
        {p.reaction_type_identified && (
          <p className="text-xs text-slate-500 mb-1">
            <span className="text-slate-400 font-medium">Type:</span> {p.reaction_type_identified}
          </p>
        )}
        {p.primary_reaction_equation && (
          <p className="text-xs font-grotesk text-on-surface/80 mb-2 bg-surface-container px-3 py-2 rounded-lg border border-white/5">
            {p.primary_reaction_equation}
          </p>
        )}

        {/* Summary */}
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{p.reaction_summary}</p>

        {/* Best catalyst + expand toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            {p.best_catalyst ? (
              <>
                <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="text-xs text-slate-400">Top evaluated: <span className="text-on-surface font-medium">{p.best_catalyst}</span></span>
              </>
            ) : (
              <span className="text-xs text-slate-600">No valid catalysts</span>
            )}
            {p.thermodynamics && (
              <span className={`ml-2 text-xs font-grotesk px-2 py-0.5 rounded-full border ${
                isExo ? 'bg-orange-500/10 border-orange-500/20 text-orange-300'
                : isEndo ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
                : 'bg-surface-container border-white/5 text-slate-500'
              }`}>
                {isExo ? 'Exothermic' : isEndo ? 'Endothermic' : p.thermodynamics}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:text-blue-300 transition-colors font-medium"
          >
            {expanded ? 'Hide details' : 'View details'}
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="material-symbols-outlined"
              style={{ fontSize: 14 }}
            >
              expand_more
            </motion.span>
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">

              {/* Mechanism */}
              {p.reaction_mechanism_summary && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Mechanism</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.reaction_mechanism_summary}</p>
                </div>
              )}

              {/* Side reactions + byproducts */}
              {(p.side_reactions?.length > 0 || p.byproducts?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {p.side_reactions?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Side Reactions</p>
                      <ul className="space-y-1">
                        {p.side_reactions.map((r, i) => (
                          <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                            <span className="text-yellow-500 shrink-0 mt-0.5">•</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {p.byproducts?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Byproducts</p>
                      <ul className="space-y-1">
                        {p.byproducts.map((b, i) => (
                          <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                            <span className="text-purple-400 shrink-0 mt-0.5">•</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Catalysts */}
              {p.catalysts?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Catalysts ({p.catalysts.length})
                  </p>
                  <div className="space-y-2">
                    {p.catalysts.map(c => <CatalystCard key={c.catalyst} catalyst={c} />)}
                  </div>
                </div>
              )}

              {/* Precautions */}
              {p.precautions?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: 12 }}>warning</span>
                    Precautions
                  </p>
                  <ul className="space-y-1">
                    {p.precautions.map((p_, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                        <span className="text-yellow-400 shrink-0 mt-0.5">—</span>{p_}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* General reasoning */}
              {p.general_reasoning && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">AI Reasoning</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{p.general_reasoning}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);

  const reload = useCallback(() => setEntries(getHistory()), []);

  useEffect(() => { reload(); }, [reload]);

  const handleDelete = useCallback((id) => {
    deleteEntry(id);
    reload();
  }, [reload]);

  const handleClear = useCallback(() => {
    if (window.confirm('Delete all history? This cannot be undone.')) {
      clearHistory();
      reload();
    }
  }, [reload]);

  return (
    <div className="mesh-gradient min-h-screen">
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="block text-xs font-bold text-primary uppercase tracking-[0.3em] mb-2">
              Experiment Records
            </span>
            <h1 className="font-syne font-extrabold text-on-background text-3xl">History</h1>
            <p className="text-slate-500 text-sm mt-1">
              {entries.length} saved prediction{entries.length !== 1 ? 's' : ''}
            </p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-error/30 text-error hover:bg-error/10 transition-colors text-xs font-semibold"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete_sweep</span>
              Clear all
            </button>
          )}
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-12 text-center border border-white/5"
          >
            <span className="material-symbols-outlined text-slate-600 mb-4 block mx-auto" style={{ fontSize: 56 }}>
              history
            </span>
            <h3 className="font-syne font-semibold text-on-surface text-xl mb-2">No history yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              Run a prediction in the Predictor tab and your results will automatically appear here.
            </p>
          </motion.div>
        )}

        {/* Cards */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {entries.map(entry => (
              <HistoryCard key={entry.id} entry={entry} onDelete={handleDelete} />
            ))}
          </div>
        </AnimatePresence>
      </div>
    </div>
  );
}
