import { motion, AnimatePresence } from 'framer-motion';
import { useSafetyContext } from '../context/SafetyContext';

// Maps each tier to Stitch-exact colours and copy
const TIER_META = {
  SAFE: {
    borderColor: '#22c55e',
    iconBg:      'bg-green-500/10 border-green-500/20',
    iconColor:   'text-green-400',
    titleColor:  'text-green-400',
    barColor:    'bg-green-500',
    barWidth:    '15%',
    riskLabel:   '15% RISK',
    title:       'All Clear — Safe to Proceed',
  },
  CAUTION: {
    borderColor: '#eab308',
    iconBg:      'bg-yellow-500/10 border-yellow-500/20',
    iconColor:   'text-yellow-400',
    titleColor:  'text-yellow-400',
    barColor:    'bg-yellow-500',
    barWidth:    '35%',
    riskLabel:   '35% RISK',
    title:       'Caution Required',
  },
  RESTRICTED: {
    borderColor: '#f97316',
    iconBg:      'bg-orange-500/10 border-orange-500/20',
    iconColor:   'text-orange-400',
    titleColor:  'text-orange-400',
    barColor:    'bg-orange-500',
    barWidth:    '60%',
    riskLabel:   '60% RISK',
    title:       'Restricted — Supervisor Required',
  },
  DANGER: {
    borderColor: '#ffb4ab',
    iconBg:      'bg-error/10 border-error/20',
    iconColor:   'text-error',
    titleColor:  'text-error',
    barColor:    'bg-error',
    barWidth:    '82%',
    riskLabel:   '82% RISK',
    title:       'Critical Safety Alert',
  },
  DO_NOT_PERFORM: {
    borderColor: '#7f1d1d',
    iconBg:      'bg-red-950/50 border-red-900/50',
    iconColor:   'text-red-300',
    titleColor:  'text-red-300',
    barColor:    'bg-red-900',
    barWidth:    '100%',
    riskLabel:   '100% RISK',
    title:       'DO NOT PERFORM',
  },
};

export default function SafetyBanner({ safetyMessage, precautions }) {
  const { safetyLevel } = useSafetyContext();
  if (!safetyLevel) return null;

  const meta    = TIER_META[safetyLevel] ?? TIER_META.CAUTION;
  const blocked = safetyLevel === 'DO_NOT_PERFORM';

  return (
    <AnimatePresence>
      <motion.section
        key="safety-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4 }}
        className="px-gutter py-12"
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative"
            style={{ borderColor: `${meta.borderColor}33` }}
          >
            {/* Left accent stripe */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
              style={{ background: meta.borderColor }}
            />

            {/* Icon + text */}
            <div className="flex items-start gap-5 pl-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border shrink-0 ${meta.iconBg}`}>
                <span
                  className={`material-symbols-outlined ${meta.iconColor}`}
                  style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
              </div>
              <div className="min-w-0">
                <h3 className={`font-syne font-semibold text-xl mb-1 ${meta.titleColor}`}>
                  {meta.title}
                </h3>
                <p className="text-on-surface-variant text-sm max-w-xl leading-relaxed">
                  {safetyMessage}
                  {safetyLevel === 'DANGER' && (
                    <> Current configuration risk levels are rated as{' '}
                      <span className={`font-bold ${meta.titleColor}`}>DANGER (Tier 4)</span>.
                      Protocol 8A required.
                    </>
                  )}
                </p>

                {/* Precautions */}
                {!blocked && precautions?.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {precautions.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className={`material-symbols-outlined shrink-0 mt-px ${meta.iconColor}`} style={{ fontSize: 14 }}>
                          chevron_right
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Blocked message */}
                {blocked && (
                  <div className="mt-3 rounded-lg bg-red-950/60 border border-red-900 px-4 py-3 text-red-200 text-sm font-medium">
                    ⛔ This reaction CANNOT be safely performed outside a professional laboratory. Results are hidden.
                  </div>
                )}
              </div>
            </div>

            {/* Risk meter */}
            <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[220px] pl-3 md:pl-0">
              <div className="flex-1 md:w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: meta.barWidth }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                  className={`h-full rounded-full ${meta.barColor}`}
                />
              </div>
              <span className={`font-grotesk font-bold text-sm shrink-0 ${meta.titleColor}`}>
                {meta.riskLabel}
              </span>
            </div>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
