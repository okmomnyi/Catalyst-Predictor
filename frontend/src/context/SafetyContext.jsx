import { createContext, useContext, useState } from 'react';
import { getSafetyTier } from '../utils/safetyConfig';

const SafetyContext = createContext(null);

export function SafetyProvider({ children }) {
  const [safetyLevel, setSafetyLevel] = useState(null);

  const safetyTier = safetyLevel ? getSafetyTier(safetyLevel) : null;

  // True when the full UI should go into danger/red mode
  const isDangerMode =
    safetyLevel === 'DANGER' || safetyLevel === 'DO_NOT_PERFORM';

  // True when results must be hidden entirely
  const isBlocked = safetyLevel === 'DO_NOT_PERFORM';

  return (
    <SafetyContext.Provider
      value={{ safetyLevel, setSafetyLevel, safetyTier, isDangerMode, isBlocked }}
    >
      {children}
    </SafetyContext.Provider>
  );
}

export const useSafetyContext = () => {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafetyContext must be used within SafetyProvider');
  return ctx;
};
