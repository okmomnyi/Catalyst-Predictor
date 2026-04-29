import { useState, useCallback } from 'react';
import { predictCatalyst } from '../api/catalystApi';
import { useSafetyContext } from '../context/SafetyContext';
import { saveToHistory } from '../utils/historyStorage';

export function usePrediction() {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const { setSafetyLevel }          = useSafetyContext();

  const submit = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    setPrediction(null);
    setSafetyLevel(null);

    try {
      // Support both array (TagInput) and comma-string (legacy) inputs
      const toArray = v =>
        Array.isArray(v) ? v : v.split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
        reaction_type:        formData.reaction_type,
        reactants:            toArray(formData.reactants),
        catalysts:            toArray(formData.catalysts),
        temperature_celsius:  parseFloat(formData.temperature_celsius),
        pressure_atm:         parseFloat(formData.pressure_atm ?? 1.0),
        solvent:              formData.solvent ?? 'water',
      };

      const data = await predictCatalyst(payload);
      setPrediction(data);
      setSafetyLevel(data.safety_level);
      saveToHistory(payload, data);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [setSafetyLevel]);

  const reset = useCallback(() => {
    setPrediction(null);
    setError(null);
    setSafetyLevel(null);
  }, [setSafetyLevel]);

  return { prediction, loading, error, submit, reset };
}
