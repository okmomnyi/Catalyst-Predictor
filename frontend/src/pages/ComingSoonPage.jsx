import { motion } from 'framer-motion';

const FEATURE_PREVIEWS = {
  analytics: [
    { icon: 'bar_chart',     text: 'Prediction accuracy trends over time' },
    { icon: 'pie_chart',     text: 'Safety level distribution across experiments' },
    { icon: 'show_chart',    text: 'Catalyst performance comparison charts' },
    { icon: 'analytics',     text: 'Reaction type frequency analysis' },
  ],
  logbook: [
    { icon: 'science',        text: 'Chronological experiment history' },
    { icon: 'compare_arrows', text: 'AI prediction vs lab result comparison' },
    { icon: 'download',       text: 'Export results as CSV or PDF' },
    { icon: 'search',         text: 'Full-text search across all experiments' },
  ],
  comparison: [
    { icon: 'table_chart',   text: 'Side-by-side catalyst comparison matrix' },
    { icon: 'leaderboard',   text: 'Ranked catalyst leaderboard by reaction type' },
    { icon: 'timeline',      text: 'Performance trends across conditions' },
    { icon: 'difference',    text: 'Differential analysis between experiments' },
  ],
  settings: [
    { icon: 'person',        text: 'User profile and credentials' },
    { icon: 'api',           text: 'API key management and usage stats' },
    { icon: 'palette',       text: 'Theme and display preferences' },
    { icon: 'notifications', text: 'Notification and alert configuration' },
  ],
};

export default function ComingSoonPage({ title, icon, description }) {
  const features = FEATURE_PREVIEWS[title?.toLowerCase()] ?? [];

  return (
    <div className="mesh-gradient min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl liquid-gradient flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30">
          <span className="material-symbols-outlined text-white" style={{ fontSize: 40 }}>{icon}</span>
        </div>

        {/* Badge */}
        <span className="inline-block text-xs font-bold text-primary uppercase tracking-[0.3em] mb-4 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
          Coming Soon
        </span>

        {/* Title */}
        <h1 className="font-syne font-extrabold text-on-background mb-4" style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>
          {title}
        </h1>

        <p className="text-on-surface-variant leading-relaxed mb-10" style={{ fontSize: 16 }}>
          {description}
        </p>

        {/* Feature preview list */}
        {features.length > 0 && (
          <div className="glass-panel rounded-2xl p-6 text-left">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Planned Features</p>
            <div className="space-y-3">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="flex items-center gap-3 text-sm text-slate-400"
                >
                  <span className="material-symbols-outlined text-primary/60 shrink-0" style={{ fontSize: 18 }}>{f.icon}</span>
                  {f.text}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
