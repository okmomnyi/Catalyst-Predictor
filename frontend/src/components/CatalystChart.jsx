import { motion } from 'framer-motion';

export default function CatalystChart({ catalysts }) {
  if (!catalysts?.length) return null;

  const sorted = [...catalysts].sort((a, b) => a.rank - b.rank);
  const evaluated = sorted[0];
  const hasScores = sorted.some(c => typeof c.efficiency_score === 'number');

  return (
    <div className="glass-panel rounded-2xl p-8 flex flex-col justify-between min-h-[400px]">
      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Catalyst Evaluation
        </span>
        <h2 className="font-syne font-bold text-on-surface mt-2" style={{ fontSize: 30 }}>
          Condition Response
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Evaluated catalyst:{' '}
          <span className="text-primary font-grotesk font-medium">{evaluated.catalyst}</span>
          {' '}· Rate: <span className="text-on-surface-variant">{evaluated.predicted_rate}</span>
          {' '}· Yield: <span className="text-on-surface-variant">{evaluated.predicted_yield}</span>
        </p>
      </div>

      <div className="h-64 mt-8 flex items-end gap-3 px-2">
        {sorted.map((c, i) => {
          const pct = typeof c.efficiency_score === 'number'
            ? Math.round(c.efficiency_score * 100)
            : null;
          const heightPct = hasScores && pct !== null ? Math.max(15, pct) : 30;

          return (
            <motion.div
              key={c.catalyst}
              className="flex-1 flex flex-col items-center gap-2"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
              style={{ transformOrigin: 'bottom' }}
            >
              <span className="text-xs font-grotesk text-primary opacity-80">
                {pct === null ? c.confidence ?? 'Low' : `${pct}%`}
              </span>

              <div
                className="w-full relative overflow-hidden rounded-t-xl border border-primary/20"
                style={{ height: `${heightPct * 2.2}px` }}
              >
                <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-primary/40 to-primary/10" />
              </div>

              <span
                className="text-xs font-grotesk text-slate-400 text-center leading-tight max-w-full truncate px-1"
                title={c.catalyst}
              >
                {c.catalyst.length > 10 ? `${c.catalyst.slice(0, 10)}...` : c.catalyst}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
