const NAV_ITEMS = [
  { icon: 'biotech',  label: 'Predictor',       id: 'predictor'       },
  { icon: 'search',   label: 'Catalyst Finder', id: 'catalyst-finder' },
  { icon: 'history',  label: 'History',         id: 'history'         },
  { icon: 'settings', label: 'Settings',        id: 'settings'        },
];

export default function Sidebar({ onNewExperiment, activeTab, onTabChange }) {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 border-r border-white/5 bg-slate-950/90 backdrop-blur-2xl hidden lg:flex flex-col z-40">
      {/* User profile */}
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-full bg-[#282a32] border border-white/10 overflow-hidden shrink-0">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUTE-k1j7kOCJcjuzAWldOooNXZwDt9ewG6UrZiqSdIE_f15Iv7qMrdWJYJxBopXE1UDIbvp72JVP1dfx7vr_H2Qflp3IZyhGHtwAwVIKyAbIWlkCSyrU9omUQbbZ3UC9U22Q5vRFEmDybXNlHbMuzbaNGJrTPQroVgjWlNaf1QFYDbdWWsMmty3isLcErAH4mlMeHHKsWubwi2DC8yKqG-RdawWFAyG5eh1hSYLgv0kdNwQggvB-MLDmA_Rmrc9QNxny6201JqYU-"
            alt="Research scientist"
            className="w-full h-full object-cover"
            onError={e => { e.target.style.display = 'none'; }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">Research Division</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest truncate">Molecular Dynamics</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 mt-2 overflow-y-auto">
        {NAV_ITEMS.map(({ icon, label, id }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                onTabChange?.(id);
                if (id === 'predictor') onNewExperiment?.();
              }}
              className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-medium uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-300 border-r-2 border-transparent hover:bg-white/3'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* New Experiment CTA */}
      <div className="p-6">
        <button
          onClick={() => { onTabChange?.('predictor'); onNewExperiment?.(); }}
          className="w-full py-3 rounded-lg liquid-gradient text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-transform hover:brightness-110"
        >
          New Experiment
        </button>
      </div>
    </aside>
  );
}
