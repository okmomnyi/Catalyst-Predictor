const KEY = 'catalyst_predictor_history';
const MAX = 50;

export function saveToHistory(formData, prediction) {
  const entries = getHistory();
  const entry = {
    id: prediction.prediction_id,
    timestamp: Date.now(),
    reactants: formData.reactants ?? [],
    reaction_type: formData.reaction_type,
    temperature: formData.temperature_celsius,
    pressure: formData.pressure_atm,
    solvent: formData.solvent,
    catalysts_submitted: formData.catalysts ?? [],
    prediction,
  };
  const updated = [entry, ...entries].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {
    // storage full — drop oldest entries
    const trimmed = [entry, ...entries].slice(0, MAX / 2);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  }
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function deleteEntry(id) {
  const updated = getHistory().filter(e => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
