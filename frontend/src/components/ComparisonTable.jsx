import { motion } from 'framer-motion';

const RATE_STYLE = {
  Fast: 'bg-green-500/15 border border-green-500/30 text-green-400',
  Medium: 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-400',
  Slow: 'bg-red-500/15 border border-red-500/30 text-red-400',
  Unknown: 'bg-slate-700/50 border border-slate-600 text-slate-400',
};

const YIELD_STYLE = {
  High: 'bg-primary/15 border border-primary/30 text-primary',
  Medium: 'bg-secondary/15 border border-secondary/30 text-secondary',
  Low: 'bg-slate-700/50 border border-slate-600 text-slate-400',
  Unknown: 'bg-slate-700/50 border border-slate-600 text-slate-400',
};

const TYPE_STYLE = {
  Heterogeneous: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  Homogeneous: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
  'Biological (enzyme)': 'bg-green-500/10 border-green-500/20 text-green-400',
};

function Chip({ label, styleMap, fallback = 'text-slate-400' }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-grotesk font-medium border ${styleMap?.[label] ?? fallback}`}>
      {label ?? 'Unknown'}
    </span>
  );
}

export default function ComparisonTable({ catalysts, bestCatalyst, predictionQuality }) {
  if (!catalysts?.length) return null;

  const sorted = [...catalysts].sort((a, b) => a.rank - b.rank);
  const isQuant = predictionQuality === 'QUANTITATIVE';

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3 flex-wrap">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>compare_arrows</span>
        <h3 className="font-syne font-semibold text-on-surface text-base">Catalyst Comparison</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-grotesk ${
          isQuant
            ? 'bg-green-500/10 border-green-500/20 text-green-400'
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
        }`}>
          {isQuant ? 'Quantitative' : 'Qualitative'}
        </span>
        <span className="ml-auto text-xs font-grotesk text-slate-500">
          {catalysts.length} catalyst{catalysts.length !== 1 ? 's' : ''} evaluated
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(12,14,22,0.6)' }}>
              {['#', 'Catalyst', 'Type', 'Rate', 'Yield', 'Confidence', 'Kinetics', 'Scientific Reasoning'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const isTop = bestCatalyst && c.catalyst === bestCatalyst;
              const pct = typeof c.efficiency_score === 'number'
                ? Math.round(c.efficiency_score * 100)
                : null;

              return (
                <motion.tr
                  key={c.catalyst}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`border-t border-white/5 hover:bg-white/[0.03] transition-colors ${isTop ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-grotesk bg-surface-container text-slate-400">
                      {c.rank}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-on-surface whitespace-nowrap">{c.catalyst}</span>
                      {isTop && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-grotesk">
                          Top evaluated
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {c.catalyst_type ? (
                      <Chip label={c.catalyst_type} styleMap={TYPE_STYLE} />
                    ) : (
                      <span className="text-slate-600 text-xs">insufficient data</span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <Chip label={c.predicted_rate} styleMap={RATE_STYLE} />
                      {c.rate_quantitative && (
                        <p className="text-xs text-slate-400 font-grotesk leading-tight max-w-[140px]">{c.rate_quantitative}</p>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <Chip label={c.predicted_yield} styleMap={YIELD_STYLE} />
                      {c.yield_quantitative && (
                        <p className="text-xs text-slate-400 font-grotesk leading-tight">{c.yield_quantitative}</p>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {pct === null ? (
                      <div className="space-y-1 min-w-[120px]">
                        <span className="text-xs font-grotesk text-yellow-400">{c.confidence ?? 'Low'}</span>
                        <p className="text-xs text-slate-500">insufficient data</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-[100px]">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 + 0.2, ease: 'easeOut' }}
                            className="h-1.5 rounded-full"
                            style={{ background: 'linear-gradient(90deg, #6001d1, #b4c5ff)' }}
                          />
                        </div>
                        <span className="text-xs font-grotesk text-primary w-9 text-right shrink-0">
                          {pct}%
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="space-y-1 min-w-[160px]">
                      {c.activation_energy_reduction ? (
                        <p className="text-xs text-slate-400 font-grotesk leading-tight">{c.activation_energy_reduction}</p>
                      ) : (
                        <span className="text-slate-600 text-xs">unknown</span>
                      )}
                      {c.rate_law && (
                        <p className="text-xs text-secondary/70 font-grotesk italic leading-tight">{c.rate_law}</p>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-400 text-xs leading-relaxed max-w-xs">
                    {c.reasoning || 'insufficient data'}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
