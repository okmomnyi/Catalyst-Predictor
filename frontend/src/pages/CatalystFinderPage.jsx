import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { findCatalyst } from '../api/catalystApi';

const REACTION_TYPES = [
  '', 'Decomposition', 'Oxidation-Reduction', 'Esterification',
  'Heterogeneous Catalysis', 'Organometallic Synthesis',
  'Enzymatic Biotransformation', 'Polymerisation', 'Acid-Base Neutralisation',
];

const SUITABILITY_META = {
  Excellent: { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  stars: 5 },
  Good:      { color: 'text-primary',    bg: 'bg-primary/10 border-primary/20',      stars: 4 },
  Moderate:  { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20',stars: 3 },
  Poor:      { color: 'text-error',      bg: 'bg-error/10 border-error/20',           stars: 2 },
};

const SAFETY_META = {
  SAFE:        { color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20'  },
  CAUTION:     { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20'},
  RESTRICTED:  { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20'},
  DANGER:      { color: 'text-error',      bg: 'bg-error/10 border-error/20'          },
};

const TYPE_BADGE = {
  Heterogeneous:        'bg-blue-500/10 border-blue-500/20 text-blue-400',
  Homogeneous:          'bg-purple-500/10 border-purple-500/20 text-purple-400',
  'Biological (enzyme)':'bg-green-500/10 border-green-500/20 text-green-400',
};

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`material-symbols-outlined ${i < count ? 'text-amber-400' : 'text-slate-700'}`}
          style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>star</span>
      ))}
    </div>
  );
}

function CatalystCard({ catalyst, index }) {
  const suit   = SUITABILITY_META[catalyst.suitability] ?? SUITABILITY_META.Good;
  const safety = SAFETY_META[catalyst.safety]           ?? SAFETY_META.CAUTION;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="glass-panel rounded-2xl p-6 flex flex-col gap-4"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-syne font-bold text-on-surface text-xl">{catalyst.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-grotesk ${TYPE_BADGE[catalyst.catalyst_type] ?? 'text-slate-400 border-slate-600 bg-slate-700/30'}`}>
              {catalyst.catalyst_type}
            </span>
          </div>
          {catalyst.full_name && catalyst.full_name !== catalyst.name && (
            <p className="text-xs text-slate-500 font-grotesk">{catalyst.full_name}</p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${suit.bg}`}>
            <Stars count={suit.stars} />
            <span className={`text-xs font-bold font-grotesk ${suit.color}`}>{catalyst.suitability}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-grotesk ${safety.bg} ${safety.color}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>shield</span>
            {catalyst.safety}
          </div>
        </div>
      </div>

      {/* Why */}
      <p className="text-sm text-on-surface-variant leading-relaxed">{catalyst.why}</p>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-xs text-primary hover:underline self-start"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{expanded ? 'expand_less' : 'expand_more'}</span>
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
              {catalyst.conditions && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Supported Conditions</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{catalyst.conditions}</p>
                </div>
              )}
              {catalyst.availability && (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Availability</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{catalyst.availability}</p>
                </div>
              )}
              {catalyst.safety_note && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Safety Note</p>
                  <p className={`text-xs leading-relaxed ${safety.color}`}>{catalyst.safety_note}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CatalystFinderPage() {
  const [description,   setDescription]   = useState('');
  const [reactionType,  setReactionType]   = useState('');
  const [temperature,   setTemperature]    = useState('');
  const [context,       setContext]        = useState('');
  const [loading,       setLoading]        = useState(false);
  const [result,        setResult]         = useState(null);
  const [error,         setError]          = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await findCatalyst({
        description: description.trim(),
        reaction_type: reactionType || undefined,
        temperature_celsius: temperature ? parseFloat(temperature) : undefined,
        context: context.trim() || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail ?? err.message ?? 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setDescription('');
    setReactionType('');
    setTemperature('');
    setContext('');
  };

  return (
    <div className="mesh-gradient min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <span className="block text-xs font-bold text-primary uppercase tracking-[0.3em] mb-4">AI-Powered Search</span>
          <h1 className="font-syne font-extrabold text-on-background mb-4" style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}>
            Catalyst{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #b4c5ff 0%, #d2bbff 50%, #ffb596 100%)' }}>
              Finder
            </span>
          </h1>
          <p className="text-on-surface-variant max-w-xl mx-auto leading-relaxed" style={{ fontSize: 16 }}>
            Describe the reaction you want to perform in plain language — the AI will suggest suitable catalysts, explain why they work, and flag safety considerations.
          </p>
        </motion.div>

        {/* Search form */}
        {!result && (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSearch}
            className="glass-panel rounded-2xl p-8 mb-8 inner-glow-blue"
          >
            {/* Description */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Describe Your Reaction <span className="text-error">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. I want to decompose hydrogen peroxide for a school science experiment. I need something safe and easy to obtain..."
                rows={4}
                required
                className="w-full bg-surface-container-lowest border border-white/10 rounded-xl px-4 py-3 text-on-surface placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm font-dm resize-none leading-relaxed"
              />
              <p className="text-xs text-slate-600">{description.length}/1000 characters</p>
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Reaction Type <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={reactionType}
                    onChange={e => setReactionType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-on-surface appearance-none focus:outline-none focus:border-primary/50 transition-colors text-sm font-dm cursor-pointer"
                  >
                    {REACTION_TYPES.map(r => <option key={r} value={r}>{r || 'Auto-detect'}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" style={{ fontSize: 18 }}>expand_more</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Temperature °C <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={temperature}
                  onChange={e => setTemperature(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-on-surface placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm font-dm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Context <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="e.g. school lab, low budget"
                  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-on-surface placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm font-dm"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-6 rounded-lg bg-error-container/20 border border-error/30 px-4 py-3 text-sm text-error">
                  <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>error</span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="w-full py-5 rounded-xl liquid-gradient text-white font-bold text-lg flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/40 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Searching Catalyst Database…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>search</span>
                  Find Catalysts
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Reaction interpretation */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-5 mb-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary shrink-0 mt-px" style={{ fontSize: 20 }}>auto_awesome</span>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Reaction Interpreted As</p>
                      <p className="text-on-surface text-sm leading-relaxed">{result.reaction_understood}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap shrink-0">
                    {result.overall_safety && (() => {
                      const s = SAFETY_META[result.overall_safety] ?? SAFETY_META.CAUTION;
                      return (
                        <span className={`text-xs px-3 py-1.5 rounded-full border font-grotesk font-bold ${s.bg} ${s.color}`}>
                          {result.overall_safety}
                        </span>
                      );
                    })()}
                    <button onClick={handleReset}
                      className="text-xs text-slate-400 hover:text-primary transition-colors flex items-center gap-1 border border-white/10 px-3 py-1.5 rounded-lg hover:border-primary/30">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
                      New Search
                    </button>
                  </div>
                </div>
                {result.recommended_conditions && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2 text-xs text-slate-400">
                    <span className="material-symbols-outlined text-secondary shrink-0" style={{ fontSize: 14 }}>tune</span>
                    <span><span className="text-slate-300 font-medium">Recommended conditions:</span> {result.recommended_conditions}</span>
                  </div>
                )}
              </motion.div>

              {/* Catalyst cards */}
              <div className="space-y-4 mb-6">
                {result.catalysts.map((c, i) => (
                  <CatalystCard key={c.name} catalyst={c} index={i} />
                ))}
              </div>

              {/* Notes */}
              {result.notes && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="glass-panel rounded-2xl p-5 flex items-start gap-3">
                  <span className="material-symbols-outlined text-secondary shrink-0 mt-px" style={{ fontSize: 20 }}>lightbulb</span>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Additional Notes</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{result.notes}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
