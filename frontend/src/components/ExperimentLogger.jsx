import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateExperiment } from '../api/catalystApi';

const MATCH_META = {
  Correct:   { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', icon: 'check_circle' },
  Partial:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: 'warning' },
  Incorrect: { color: 'text-error',      bg: 'bg-error/10 border-error/30',          icon: 'cancel' },
};

const fieldClass =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-on-surface placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm font-dm';

export default function ExperimentLogger({ predictionId, catalysts }) {
  const [open,     setOpen]     = useState(false);
  const [catalyst, setCatalyst] = useState(catalysts[0]?.catalyst ?? '');
  const [time,     setTime]     = useState('');
  const [notes,    setNotes]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await validateExperiment({
        prediction_id:             predictionId,
        catalyst,
        time_to_completion_seconds: parseFloat(time),
        observation_notes:          notes,
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>science</span>
          <h3 className="font-syne font-semibold text-on-surface text-base">Log Experimental Result</h3>
          <span className="hidden sm:block text-xs text-slate-500">
            — compare your lab data vs AI prediction
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="material-symbols-outlined text-slate-500"
          style={{ fontSize: 18 }}
        >
          expand_more
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-white/5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Catalyst select */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Catalyst Tested
                  </label>
                  <div className="relative">
                    <select
                      value={catalyst}
                      onChange={e => setCatalyst(e.target.value)}
                      className={fieldClass + ' appearance-none'}
                      required
                    >
                      {catalysts.map(c => (
                        <option key={c.catalyst} value={c.catalyst}>{c.catalyst}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" style={{ fontSize: 18 }}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Time input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Reaction Time (seconds)
                  </label>
                  <input
                    type="number"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    placeholder="e.g. 45"
                    min="0" step="0.1"
                    className={fieldClass}
                    required
                  />
                  <p className="text-xs text-slate-600">
                    Fast: &lt;30s · Medium: 30–120s · Slow: &gt;120s
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Observation Notes <span className="text-slate-600 normal-case font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Vigorous bubbling observed, slight colour change…"
                    rows={3}
                    className={fieldClass + ' resize-none'}
                  />
                </div>

                {error && (
                  <p className="text-sm text-error bg-error/10 border border-error/30 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl liquid-gradient text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Comparing…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>straighten</span>
                      Compare with AI Prediction
                    </>
                  )}
                </button>
              </form>

              {/* Result card */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 rounded-xl border p-5 ${MATCH_META[result.match_assessment]?.bg ?? ''}`}
                  >
                    <div className={`flex items-center gap-2 font-syne font-semibold text-base mb-3 ${MATCH_META[result.match_assessment]?.color ?? 'text-on-surface'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
                        {MATCH_META[result.match_assessment]?.icon}
                      </span>
                      Prediction Match: {result.match_assessment}
                    </div>
                    <div className="space-y-1.5 text-sm text-on-surface-variant">
                      <p>AI predicted rate: <span className="text-on-surface font-grotesk font-medium">{result.ai_predicted_rate}</span></p>
                      <p>Your observation: <span className="text-on-surface font-grotesk font-medium">{result.actual_time_seconds}s
                        ({result.actual_time_seconds < 30 ? 'Fast' : result.actual_time_seconds <= 120 ? 'Medium' : 'Slow'})
                      </span></p>
                      {result.notes && <p className="text-slate-500 text-xs mt-2">{result.notes}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
