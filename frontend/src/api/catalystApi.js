import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 65000,
  headers: { 'Content-Type': 'application/json' }
});

export const predictCatalyst = async (formData) => {
  const response = await api.post('/predict', formData);
  return response.data;
};

export const findCatalyst = async (searchData) => {
  const response = await api.post('/find-catalyst', searchData);
  return response.data;
};

export const validateExperiment = async (result) => {
  const response = await api.post('/validate', result);
  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};
