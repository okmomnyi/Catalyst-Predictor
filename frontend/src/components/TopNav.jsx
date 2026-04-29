import { useEffect, useRef, useState } from 'react';
import { checkHealth } from '../api/catalystApi';

const CENTER_LINKS = [
  { label: 'Models',  tab: 'predictor'       },
  { label: 'Finder',  tab: 'catalyst-finder' },
  { label: 'History', tab: 'history'         },
];

const NOTIFICATIONS = [
  { icon: 'check_circle',  color: 'text-green-400',  title: 'Prediction complete',       body: 'MnO₂ ranked #1 for H₂O₂ decomposition',    time: '2m ago' },
  { icon: 'science',       color: 'text-primary',    title: 'Experiment logged',          body: 'Result: Correct match — Fast reaction',      time: '14m ago' },
  { icon: 'warning',       color: 'text-yellow-400', title: 'Safety alert',               body: 'CAUTION level detected in last prediction',  time: '1h ago' },
];

export default function TopNav({ onNewExperiment, activeTab, onTabChange }) {
  const [health, setHealth]           = useState(null);
  const [showNotif, setShowNotif]     = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTheme, setShowTheme]     = useState(false);
  const [unread, setUnread]           = useState(2);

  const notifRef   = useRef(null);
  const profileRef = useRef(null);
  const themeRef   = useRef(null);

  useEffect(() => {
    checkHealth().then(setHealth).catch(() => setHealth({ status: 'offline' }));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))   setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (themeRef.current && !themeRef.current.contains(e.target))   setShowTheme(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotifOpen = () => {
    setShowNotif(v => !v);
    setShowProfile(false);
    setShowTheme(false);
    setUnread(0);
  };

  return (
    <header className="bg-slate-950/80 backdrop-blur-xl fixed top-0 w-full z-50 border-b border-white/10 shadow-[0_0_20px_rgba(37,99,235,0.15)] flex justify-between items-center px-8 h-16">
      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => { onTabChange?.('predictor'); onNewExperiment?.(); }}>
        <div className="w-8 h-8 rounded-lg liquid-gradient flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white" style={{ fontSize: 18 }}>science</span>
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent font-syne hidden sm:block">
          Catalyst Predictor
        </span>
      </div>

      {/* Centre nav */}
      <nav className="hidden md:flex items-center gap-1">
        {CENTER_LINKS.map(({ label, tab }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange?.(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {label}
              {isActive && <span className="block h-0.5 bg-blue-500 rounded-full mt-0.5" />}
            </button>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {health && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 mr-2">
            <span className={`w-1.5 h-1.5 rounded-full ${health.status === 'ok' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {health.status === 'ok' ? 'API Online' : 'API Offline'}
          </div>
        )}

        {/* Theme picker */}
        <div ref={themeRef} className="relative">
          <button
            onClick={() => { setShowTheme(v => !v); setShowNotif(false); setShowProfile(false); }}
            className="p-2 hover:bg-white/5 transition-all rounded-full active:scale-95"
            title="Theme"
          >
            <span className="material-symbols-outlined text-slate-400 hover:text-slate-200" style={{ fontSize: 20 }}>contrast</span>
          </button>
          {showTheme && (
            <div className="absolute right-0 top-12 w-56 glass-panel rounded-xl p-3 shadow-2xl z-50 border border-white/10">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-1">Appearance</p>
              {[
                { label: 'Dark (Default)',  active: true,  icon: 'dark_mode' },
                { label: 'Light Mode',      active: false, icon: 'light_mode', soon: true },
                { label: 'High Contrast',   active: false, icon: 'contrast',   soon: true },
              ].map(t => (
                <button key={t.label} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${t.active ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
                  {t.label}
                  {t.soon && <span className="ml-auto text-xs text-slate-600 font-grotesk">soon</span>}
                  {t.active && <span className="ml-auto material-symbols-outlined text-primary" style={{ fontSize: 16 }}>check</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={handleNotifOpen}
            className="p-2 hover:bg-white/5 transition-all rounded-full active:scale-95 relative"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-slate-400 hover:text-slate-200" style={{ fontSize: 20 }}>notifications</span>
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-slate-950" />
            )}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-12 w-80 glass-panel rounded-xl shadow-2xl z-50 border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-sm font-semibold text-on-surface font-syne">Notifications</p>
                <span className="text-xs text-primary font-grotesk cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="divide-y divide-white/5">
                {NOTIFICATIONS.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors cursor-pointer">
                    <span className={`material-symbols-outlined shrink-0 mt-0.5 ${n.color}`} style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>{n.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-on-surface font-medium leading-tight">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                    </div>
                    <span className="text-xs text-slate-600 shrink-0 whitespace-nowrap">{n.time}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-white/5 text-center">
                <button
                  className="text-xs text-primary hover:underline font-grotesk"
                  onClick={() => { onTabChange?.('history'); setShowNotif(false); }}
                >
                  View prediction history →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setShowProfile(v => !v); setShowNotif(false); setShowTheme(false); }}
            className="p-2 hover:bg-white/5 transition-all rounded-full active:scale-95"
            title="Profile"
          >
            <span className="material-symbols-outlined text-slate-400 hover:text-slate-200" style={{ fontSize: 20 }}>account_circle</span>
          </button>
          {showProfile && (
            <div className="absolute right-0 top-12 w-64 glass-panel rounded-xl shadow-2xl z-50 border border-white/10 overflow-hidden">
              <div className="px-4 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#282a32] border border-white/10 overflow-hidden shrink-0">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUTE-k1j7kOCJcjuzAWldOooNXZwDt9ewG6UrZiqSdIE_f15Iv7qMrdWJYJxBopXE1UDIbvp72JVP1dfx7vr_H2Qflp3IZyhGHtwAwVIKyAbIWlkCSyrU9omUQbbZ3UC9U22Q5vRFEmDybXNlHbMuzbaNGJrTPQroVgjWlNaf1QFYDbdWWsMmty3isLcErAH4mlMeHHKsWubwi2DC8yKqG-RdawWFAyG5eh1hSYLgv0kdNwQggvB-MLDmA_Rmrc9QNxny6201JqYU-"
                    alt="Profile" className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">Research Division</p>
                  <p className="text-xs text-slate-500 truncate">Molecular Dynamics</p>
                </div>
              </div>
              {[
                { icon: 'manage_accounts', label: 'Account Settings', tab: 'settings' },
              ].map(item => (
                <button key={item.label}
                  onClick={() => { onTabChange?.(item.tab); setShowProfile(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              <div className="px-4 py-3 border-t border-white/5">
                <button className="w-full flex items-center gap-3 text-sm text-error hover:bg-error/5 px-0 py-1 rounded transition-colors">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
