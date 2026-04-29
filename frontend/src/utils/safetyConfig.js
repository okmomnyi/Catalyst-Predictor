/**
 * Frontend safety tier configuration.
 *
 * Maps the safety_level string returned by the API to all UI
 * behaviour: colours, themes, messages, and action types.
 *
 * NOTE: These colours are SEPARATE from the dark/light theme.
 * The safety overlay is applied on TOP of whichever theme is active.
 * Dark mode stays dark. Light mode stays light.
 * Only the accent/border/banner colours shift based on safety level.
 */

export const SAFETY_TIERS = {
  SAFE: {
    accentColor: '#22c55e',
    borderColor: '#16a34a',
    bannerBg: 'bg-green-500/15',
    textColor: 'text-green-400',
    label: 'SAFE TO PERFORM',
    icon: '✅',
    action: 'proceed',
    showResults: true,
    blockMessage: null,
  },
  CAUTION: {
    accentColor: '#eab308',
    borderColor: '#ca8a04',
    bannerBg: 'bg-yellow-500/15',
    textColor: 'text-yellow-400',
    label: 'CAUTION',
    icon: '⚠️',
    action: 'warn',
    showResults: true,
    blockMessage: null,
  },
  RESTRICTED: {
    accentColor: '#f97316',
    borderColor: '#ea580c',
    bannerBg: 'bg-orange-500/15',
    textColor: 'text-orange-400',
    label: 'RESTRICTED — SUPERVISOR REQUIRED',
    icon: '🔶',
    action: 'restrict',
    showResults: true,
    blockMessage: null,
  },
  DANGER: {
    accentColor: '#ef4444',
    borderColor: '#dc2626',
    bannerBg: 'bg-red-500/20',
    textColor: 'text-red-400',
    label: 'DANGER — SERIOUS RISK',
    icon: '🚨',
    action: 'full_warning',
    showResults: true,   // Show results but full UI turns red
    blockMessage: null,
  },
  DO_NOT_PERFORM: {
    accentColor: '#7f1d1d',
    borderColor: '#450a0a',
    bannerBg: 'bg-red-950/60',
    textColor: 'text-red-300',
    label: 'DO NOT PERFORM',
    icon: '☠️',
    action: 'block',
    showResults: false,  // Block all output
    blockMessage: 'This reaction cannot be safely conducted outside a professional laboratory. Results have been hidden for safety.',
  },
};

/**
 * Returns the safety tier config for a given level string.
 * Defaults to CAUTION if level is unrecognised.
 */
export const getSafetyTier = (level) =>
  SAFETY_TIERS[level] ?? SAFETY_TIERS['CAUTION'];
