import { useCallback, useRef, useState } from 'react';
import { SafetyProvider }        from './context/SafetyContext';
import { usePrediction }         from './hooks/usePrediction';
import TopNav                    from './components/TopNav';
import Sidebar                   from './components/Sidebar';
import PredictionForm            from './components/PredictionForm';
import ResultsPanel              from './components/ResultsPanel';
import CatalystFinderPage        from './pages/CatalystFinderPage';
import HistoryPage               from './pages/HistoryPage';
import ComingSoonPage            from './pages/ComingSoonPage';

function PredictorView({ onSubmit, loading, error, prediction, formTemp, resultsRef }) {
  return (
    <div className="mesh-gradient min-h-screen relative">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-20 min-h-[819px]">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video autoPlay loop muted playsInline
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover opacity-50">
            <source src="https://catalyst.kelvinmomanyi.tech/video_generation_0.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(12,14,22,0.85)_100%)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] opacity-20 rotate-12" style={{ mixBlendMode: 'screen' }}>
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAHMgikqpfN-qpdrXTiTuKq6LQBkZYJB0EAkjG9fRFAUOlQdIVn9H9Go58WHYE0935gwd5aXfKH74hlg2zfxqzXWOapqA9UXLZ_0nrJjq3d9h-tquN8LJHGfXveoqb6_aUl2s_dpCLIJgfDHtWFuRhOwMRGDsZEkyN8sVKLjBfhH53arC4EOlwywzIrQJClf_BlWvI46ocNUfbDPRVA2hp9IQxxlKdA2PI33ZLfS-gSoIsfiaZVrWGk4DmkTYWc-UyXttnbCZMQWMRW"
              alt="" aria-hidden="true" className="w-full h-full object-contain"
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto">
          <span className="block text-xs font-bold text-primary uppercase tracking-[0.3em] mb-6">
            Neural Intelligence Hub
          </span>
          <h1 className="font-syne font-extrabold text-on-background mb-6 leading-none"
            style={{ fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.02em' }}>
            Predicting{' '}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #b4c5ff 0%, #d2bbff 50%, #ffb596 100%)' }}>
              Molecular Synergy
            </span>{' '}
            with Precision
          </h1>
          <p className="text-on-surface-variant max-w-2xl mx-auto mb-12 leading-relaxed" style={{ fontSize: 18 }}>
            Harness the power of high-fidelity neural networks to simulate catalyst
            effectiveness in complex chemical environments before entering the wet lab.
          </p>
          <PredictionForm onSubmit={onSubmit} loading={loading} error={error} />
        </div>
      </section>

      {/* Results */}
      <div ref={resultsRef}>
        <ResultsPanel prediction={prediction} formTemp={formTemp} />
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 relative z-10" style={{ background: '#020308' }}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-slate-500">© 2024 Catalyst Effect Predictor. Powered by Neural Molecular Dynamics.</p>
          <nav className="flex gap-8">
            {['Documentation', 'Safety Protocol', 'Ethics Registry', 'Support'].map(link => (
              <a key={link} href="#" className="text-xs text-slate-600 hover:text-blue-400 transition-colors">{link}</a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

function AppLayout() {
  const { prediction, loading, error, submit, reset } = usePrediction();
  const [activeTab, setActiveTab] = useState('predictor');
  const resultsRef  = useRef(null);
  const lastTempRef = useRef(85);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const handleNewExperiment = useCallback(() => {
    reset();
    setActiveTab('predictor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [reset]);

  const handleSubmit = async (formData) => {
    lastTempRef.current = parseFloat(formData.temperature_celsius) || 85;
    await submit(formData);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  return (
    <div className="min-h-screen" style={{ background: '#0c0e16' }}>
      <TopNav onNewExperiment={handleNewExperiment} activeTab={activeTab} onTabChange={handleTabChange} />
      <Sidebar onNewExperiment={handleNewExperiment} activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="lg:pl-64 pt-16 min-h-screen">
        {activeTab === 'predictor' && (
          <PredictorView
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            prediction={prediction}
            formTemp={lastTempRef.current}
            resultsRef={resultsRef}
          />
        )}
        {activeTab === 'catalyst-finder' && <CatalystFinderPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'settings' && (
          <ComingSoonPage title="Settings" icon="settings"
            description="Configure your profile, manage API keys, set notification preferences, and customise the display theme." />
        )}
      </main>

      {/* FABs */}
      <div className="fixed top-20 right-6 z-[60] flex flex-col gap-3">
        <button onClick={handleNewExperiment} title="New experiment"
          className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-primary shadow-xl hover:scale-110 active:scale-95 transition-all border border-primary/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
        </button>
        <button onClick={() => handleTabChange('catalyst-finder')} title="Catalyst Finder"
          className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-secondary shadow-xl hover:scale-110 active:scale-95 transition-all border border-secondary/20">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>search</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SafetyProvider>
      <AppLayout />
    </SafetyProvider>
  );
}
