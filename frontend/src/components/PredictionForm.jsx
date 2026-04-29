import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TagInput from './TagInput';

const REACTION_TYPES = [
  'Auto-detect',
  'Heterogeneous Catalysis',
  'Organometallic Synthesis',
  'Enzymatic Biotransformation',
  'Photocatalytic Redox',
  'Acid-Base Neutralisation',
  'Decomposition',
  'Oxidation-Reduction',
  'Esterification',
  'Polymerisation',
];

const SOLVENTS = [
  'Auto-detect',
  'Water',
  'Ethanol',
  'Dichloromethane (DCM)',
  'Dimethyl Sulfoxide (DMSO)',
  'Tetrahydrofuran (THF)',
  'Toluene (HPLC Grade)',
  'Acetonitrile',
  'Diethyl Ether',
];

const DEFAULT = {
  reaction_type:       'Auto-detect',
  solvent:             'Auto-detect',
  reactants:           [],
  catalysts:           [],
  temperature_celsius: 25,
  pressure_atm:        1.0,
  // Advanced / optional
  concentration:       '',
  volume_ml:           '',
  catalyst_mass_g:     '',
  num_trials:          '',
};

const selectClass =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-on-surface appearance-none focus:outline-none focus:border-primary/50 transition-colors text-sm font-dm cursor-pointer';

const advancedInputClass =
  'w-full bg-surface-container-lowest border border-white/10 rounded-lg px-4 py-3 text-on-surface placeholder-slate-600 focus:outline-none focus:border-secondary/50 transition-colors text-sm font-dm';

export default function PredictionForm({ onSubmit, loading, error }) {
  const [form, setForm]               = useState(DEFAULT);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [aiSuggestMode, setAiSuggestMode] = useState(false);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.reactants.length === 0) return;
    if (!aiSuggestMode && form.catalysts.length === 0) return;
    onSubmit({
      ...form,
      catalysts:       aiSuggestMode ? [] : form.catalysts,
      concentration:   form.concentration   !== '' ? parseFloat(form.concentration)   : undefined,
      volume_ml:       form.volume_ml        !== '' ? parseFloat(form.volume_ml)        : undefined,
      catalyst_mass_g: form.catalyst_mass_g  !== '' ? parseFloat(form.catalyst_mass_g)  : undefined,
      num_trials:      form.num_trials       !== '' ? parseInt(form.num_trials, 10)      : undefined,
    });
  };

  // Count how many advanced fields are filled
  const advancedFilled = [form.concentration, form.volume_ml, form.catalyst_mass_g, form.num_trials]
    .filter(v => v !== '').length;

  return (
    <div className="glass-panel rounded-xl p-8 max-w-[720px] mx-auto text-left inner-glow-blue">
      {/* Card header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-on-surface font-syne font-semibold text-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>experiment</span>
          Prediction Parameters
        </h3>
        <div className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary font-grotesk text-xs">
          MODEL-V2.4 ACTIVE
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Row 1: Reaction Type + Solvent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
              Reaction Type
            </label>
            <div className="relative">
              <select
                value={form.reaction_type}
                onChange={e => set('reaction_type', e.target.value)}
                className={selectClass}
              >
                {REACTION_TYPES.map(r => <option key={r}>{r}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" style={{ fontSize: 18 }}>expand_more</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
              Solvent System
            </label>
            <div className="relative">
              <select
                value={form.solvent}
                onChange={e => set('solvent', e.target.value)}
                className={selectClass}
              >
                {SOLVENTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" style={{ fontSize: 18 }}>science</span>
            </div>
          </div>
        </div>

        {/* Reactants + Catalysts */}
        <div className="space-y-6 mb-8">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Reactants</label>
            <TagInput
              tags={form.reactants}
              onChange={tags => set('reactants', tags)}
              placeholder="e.g. Hydrogen Peroxide, Aniline… (Enter to confirm)"
              chipClass="bg-primary/20 border border-primary/40 text-primary"
              maxTags={8}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Catalysts</label>
              <button
                type="button"
                onClick={() => setAiSuggestMode(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-grotesk transition-all border ${
                  aiSuggestMode
                    ? 'bg-secondary/20 border-secondary/40 text-secondary'
                    : 'bg-surface-container border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {aiSuggestMode ? 'auto_awesome' : 'auto_awesome'}
                </span>
                {aiSuggestMode ? 'AI suggesting' : 'Let AI suggest'}
              </button>
            </div>
            <AnimatePresence mode="wait">
              {aiSuggestMode ? (
                <motion.div
                  key="ai-mode"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2 px-4 py-3 rounded-lg bg-secondary/5 border border-secondary/20"
                >
                  <span className="material-symbols-outlined text-secondary shrink-0 mt-px" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-secondary font-medium">AI suggest mode:</span> the AI will identify the reaction type and recommend the 2–4 most effective catalysts, including mechanism, side reactions, byproducts, and thermodynamics.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="manual-mode"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <TagInput
                    tags={form.catalysts}
                    onChange={tags => set('catalysts', tags)}
                    placeholder="Enter your catalyst here… (Enter to confirm, max 6)"
                    chipClass="bg-tertiary/20 border border-tertiary/40 text-tertiary"
                    maxTags={6}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Temperature</label>
              <span className="font-grotesk text-primary text-sm">{form.temperature_celsius.toFixed(1)}°C</span>
            </div>
            <input type="range" min={-100} max={300} step={0.5}
              value={form.temperature_celsius}
              onChange={e => set('temperature_celsius', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pressure</label>
              <span className="font-grotesk text-primary text-sm">{form.pressure_atm.toFixed(1)} atm</span>
            </div>
            <input type="range" min={0.1} max={10} step={0.1}
              value={form.pressure_atm}
              onChange={e => set('pressure_atm', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Advanced Parameters toggle */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-secondary/20 bg-secondary/5 hover:bg-secondary/10 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>tune</span>
              <span className="text-secondary text-sm font-semibold font-grotesk">Advanced Parameters</span>
              <span className="text-xs text-slate-500 hidden sm:inline">— add for quantitative results</span>
              {advancedFilled > 0 && (
                <span className="bg-secondary/20 text-secondary text-xs px-2 py-0.5 rounded-full font-grotesk">
                  {advancedFilled} set
                </span>
              )}
            </div>
            <motion.span
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="material-symbols-outlined text-secondary"
              style={{ fontSize: 18 }}
            >
              expand_more
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {showAdvanced && (
              <motion.div
                key="advanced"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  {/* Info banner */}
                  <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-secondary/5 border border-secondary/15">
                    <span className="material-symbols-outlined text-secondary shrink-0 mt-px" style={{ fontSize: 16 }}>info</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <span className="text-secondary font-medium">GIGO principle:</span> the more precise your inputs, the more precise the prediction.
                      Omitting these fields gives qualitative results (Fast/Slow). Adding them unlocks quantitative outputs — completion time, activation energy, yield %.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Concentration <span className="text-secondary normal-case font-normal">(mol/L)</span>
                      </label>
                      <input
                        type="number" min="0" step="0.001"
                        value={form.concentration}
                        onChange={e => set('concentration', e.target.value)}
                        placeholder="e.g. 0.1"
                        className={advancedInputClass}
                      />
                      <p className="text-xs text-slate-600">Enables quantitative rate prediction</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Volume <span className="text-secondary normal-case font-normal">(mL)</span>
                      </label>
                      <input
                        type="number" min="0" step="0.1"
                        value={form.volume_ml}
                        onChange={e => set('volume_ml', e.target.value)}
                        placeholder="e.g. 50"
                        className={advancedInputClass}
                      />
                      <p className="text-xs text-slate-600">Enables yield calculation</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Catalyst Mass <span className="text-secondary normal-case font-normal">(g)</span>
                      </label>
                      <input
                        type="number" min="0" step="0.001"
                        value={form.catalyst_mass_g}
                        onChange={e => set('catalyst_mass_g', e.target.value)}
                        placeholder="e.g. 0.5"
                        className={advancedInputClass}
                      />
                      <p className="text-xs text-slate-600">Required for quantitative yield</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Number of Trials
                      </label>
                      <input
                        type="number" min="1" step="1"
                        value={form.num_trials}
                        onChange={e => set('num_trials', e.target.value)}
                        placeholder="e.g. 3"
                        className={advancedInputClass}
                      />
                      <p className="text-xs text-slate-600">Planning repeated experiments?</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-lg bg-error-container/20 border border-error/30 px-4 py-3 text-sm text-error"
            >
              <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: 16 }}>error</span>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || form.reactants.length === 0 || (!aiSuggestMode && form.catalysts.length === 0)}
          className="w-full py-5 rounded-xl liquid-gradient text-white font-bold text-lg flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/40 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analysing Neural Pathways…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{aiSuggestMode ? 'auto_awesome' : 'bolt'}</span>
              {aiSuggestMode ? 'Find Catalysts & Analyse' : 'Predict Effectiveness'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
