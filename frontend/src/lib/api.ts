import axios from 'axios';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}`;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface FlowFeatures {
  [key: string]: number;
}

export interface PredictionResult {
  attack: string;
  severity: number;
  action: string;
}

export const predictFlow = async (features: FlowFeatures) => {
  try {
    const response = await api.post('/predict/', { features });
    return response.data;
  } catch (error) {
    console.error('Prediction error:', error);
    return null;
  }
};

export const batchPredict = async (items: FlowFeatures[]) => {
  try {
    // Chunking logic could be moved here if needed, but for now simple batch
    const response = await api.post('/predict/batch', { items });
    return response.data.results;
  } catch (error) {
    console.error('Batch prediction error:', error);
    return [];
  }
};

export const getNextFlow = async (index: number) => {
  try {
    const response = await api.get(`/monitor/next/${index}`);
    return response.data;
  } catch (error) {
    console.error('Monitor error:', error);
    return null;
  }
};

export const generateReport = async (data: any) => {
  try {
    const response = await api.post('/reports/generate', data);
    return response.data.report;
  } catch (error) {
    console.error('Report generation error:', error);
    return null;
  }
};

export const getFeatureImportance = async () => {
  try {
    const response = await api.get('/predict/feature-importance');
    return response.data;
  } catch (error) {
    console.error('Feature importance error:', error);
    return null;
  }
};

export const getDashboardStats = async () => {
  try {
    const response = await api.get('/monitor/stats');
    return response.data;
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return null;
  }
};
