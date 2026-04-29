import { motion } from 'framer-motion';

/**
 * "Optimal Efficiency Matrix" — the large 8-col bento card.
 * Renders catalyst efficiency as liquid-gradient CSS bars (matching Stitch exactly),
 * with catalyst labels below. No Recharts needed for this primary view.
 */
export default function CatalystChart({ catalysts }) {
  if (!catalysts?.length) return null;

  const sorted = [...catalysts].sort((a, b) => a.rank - b.rank);
  const best   = sorted[0];

  return (
    <div className="glass-panel rounded-2xl p-8 flex flex-col justify-between min-h-[400px]">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Yield Projection
        </span>
        <h2 className="font-syne font-bold text-on-surface mt-2" style={{ fontSize: 30 }}>
          Optimal Efficiency Matrix
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Best performer: <span className="text-primary font-grotesk font-medium">{best.catalyst}</span>
          &nbsp;·&nbsp;Rate: <span className="text-on-surface-variant">{best.predicted_rate}</span>
          &nbsp;·&nbsp;Yield: <span className="text-on-surface-variant">{best.predicted_yield}</span>
        </p>
      </div>

      {/* Liquid bars */}
      <div className="h-64 mt-8 flex items-end gap-3 px-2">
        {sorted.map((c, i) => {
          const pct     = Math.round(c.efficiency_score * 100);
          const isTop   = i === 0;
          // Height as % of container, min 15%, proportional to efficiency
          const heightPct = Math.max(15, pct);

          return (
            <motion.div
              key={c.catalyst}
              className="flex-1 flex flex-col items-center gap-2"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
              style={{ transformOrigin: 'bottom' }}
            >
              {/* Efficiency label */}
              <span className="text-xs font-grotesk text-primary opacity-80">{pct}%</span>

              {/* Bar */}
              <div
                className="w-full relative overflow-hidden rounded-t-xl border border-primary/20"
                style={{ height: `${heightPct * 2.2}px` }}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 h-full ${
                    isTop
                      ? 'bg-gradient-to-t from-primary/60 to-primary/20'
                      : 'bg-gradient-to-t from-primary/40 to-primary/10'
                  }`}
                />
                {isTop && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-white/25" />
                )}
              </div>

              {/* Catalyst name */}
              <span
                className="text-xs font-grotesk text-slate-400 text-center leading-tight max-w-full truncate px-1"
                title={c.catalyst}
              >
                {c.catalyst.length > 10 ? c.catalyst.slice(0, 10) + '…' : c.catalyst}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
