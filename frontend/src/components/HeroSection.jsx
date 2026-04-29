import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { checkHealth } from '../api/catalystApi';
import ThemeToggle from './ThemeToggle';

export default function HeroSection() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950 text-white">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-500/10"
            style={{
              width: Math.random() * 80 + 20,
              height: Math.random() * 80 + 20,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚗️</span>
            <span className="font-mono text-sm text-blue-300 tracking-wider">
              CATALYST PREDICTOR
            </span>
          </div>
          <div className="flex items-center gap-4">
            {health && (
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    health.status === 'ok' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                <span className="text-slate-400">
                  {health.status === 'ok' ? `API online · ${health.model}` : 'API offline'}
                </span>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Catalyst Effect{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Predictor
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Enter your reaction parameters and let AI predict how different catalysts
            affect reaction rate, yield, and safety — backed by chemistry science.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          {['AI-Powered Analysis', 'Safety Classification', 'Lab Validation', 'Multi-Catalyst Comparison'].map(
            (tag) => (
              <span
                key={tag}
                className="px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium"
              >
                {tag}
              </span>
            )
          )}
        </motion.div>
      </div>
    </header>
  );
}
