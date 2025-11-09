/**
 * API Client for CongestionAI Backend
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds for batch predictions
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Methods
export const congestionAPI = {
  /**
   * Get health status of API
   */
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Forecast congestion for a single location
   */
  forecastSingle: async (latitude, longitude, timestamp = null) => {
    const response = await api.post('/forecast', {
      latitude,
      longitude,
      timestamp,
    });
    return response.data;
  },

  /**
   * Forecast congestion for multiple locations (heatmap)
   */
  forecastBatch: async (locations, timestamp = null) => {
    const response = await api.post('/batch_forecast', {
      locations,
      timestamp,
    });
    return response.data;
  },

  /**
   * Simulate route risk
   */
  simulateRoute: async (startLat, startLon, endLat, endLon, departureTime = null) => {
    const response = await api.post('/route_simulate', {
      start_lat: startLat,
      start_lon: startLon,
      end_lat: endLat,
      end_lon: endLon,
      departure_time: departureTime,
    });
    return response.data;
  },

  /**
   * Get timeseries forecast
   */
  forecastTimeseries: async (latitude, longitude, startTime = null, hoursAhead = 72) => {
    const response = await api.post('/timeseries', {
      latitude,
      longitude,
      start_time: startTime,
      hours_ahead: hoursAhead,
    });
    return response.data;
  },

  /**
   * Get global insights and statistics
   */
  getInsights: async () => {
    const response = await api.get('/insights');
    return response.data;
  },
};

export default api;
