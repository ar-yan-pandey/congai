import { Cloud, AlertTriangle, CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';
import { getRiskClasses } from '../lib/utils.js';
import { useState, useEffect } from 'react';

export default function RiskPanel({ data, onClose }) {
  const [showWeather, setShowWeather] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  
  if (!data) return null;

  const getRiskIcon = (level) => {
    switch (level) {
      case 'critical':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-6 w-6 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'low':
      default:
        return <CheckCircle className="h-6 w-6 text-green-600" />;
    }
  };

  const handleWeatherAnalysis = async () => {
    const lat = data.location?.latitude;
    const lon = data.location?.longitude;
    
    if (!lat || !lon) {
      alert('Location data not available for weather analysis');
      return;
    }

    setShowWeather(true);
    setLoadingWeather(true);

    try {
      // Using Open-Meteo free weather API (no API key needed)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`
      );
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Weather fetch error:', error);
      setWeatherData({ error: 'Failed to fetch weather data' });
    } finally {
      setLoadingWeather(false);
    }
  };

  const getWeatherDescription = (code) => {
    const weatherCodes = {
      0: '☀️ Clear sky',
      1: '🌤️ Mainly clear',
      2: '⛅ Partly cloudy',
      3: '☁️ Overcast',
      45: '🌫️ Foggy',
      48: '🌫️ Foggy',
      51: '🌦️ Light drizzle',
      61: '🌧️ Light rain',
      63: '🌧️ Moderate rain',
      65: '🌧️ Heavy rain',
      71: '🌨️ Light snow',
      73: '🌨️ Moderate snow',
      75: '🌨️ Heavy snow',
      95: '⛈️ Thunderstorm',
    };
    return weatherCodes[code] || '🌤️ Unknown';
  };

  return (
    <div className="absolute top-24 right-4 z-[1000] w-80 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-2xl border border-white/40 p-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary to-blue-900 p-1.5 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Risk Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center transition-all"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {/* Congestion Score - Large Display */}
          <div className="bg-gradient-to-br from-primary/10 to-blue-900/10 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-600 mb-1">Congestion Level</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-900 bg-clip-text text-transparent">
              {(data.congestion_score * 100).toFixed(0)}%
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {getRiskIcon(data.risk_level)}
              <span className={`text-xs font-semibold ${getRiskClasses(data.risk_level)}`}>
                {data.risk_level?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200/60 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all bg-gradient-to-r"
              style={{
                width: `${data.congestion_score * 100}%`,
                backgroundImage: data.risk_level === 'critical' ? 'linear-gradient(to right, #DC2626, #991B1B)' :
                  data.risk_level === 'high' ? 'linear-gradient(to right, #EA580C, #C2410C)' :
                  data.risk_level === 'medium' ? 'linear-gradient(to right, #F59E0B, #D97706)' : 
                  'linear-gradient(to right, #22C55E, #16A34A)'
              }}
            />
          </div>

          {/* Location & Confidence Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50/80 backdrop-blur-sm p-2 rounded-lg">
              <p className="text-xs text-gray-600 mb-0.5">Location</p>
              <p className="font-mono text-xs font-semibold text-gray-800">
                {data.location?.latitude.toFixed(4)}
              </p>
              <p className="font-mono text-xs font-semibold text-gray-800">
                {data.location?.longitude.toFixed(4)}
              </p>
            </div>
            <div className="bg-gray-50/80 backdrop-blur-sm p-2 rounded-lg">
              <p className="text-xs text-gray-600 mb-0.5">Confidence</p>
              <p className="text-2xl font-bold text-primary">
                {(data.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Timestamp */}
          {data.timestamp && (
            <div className="bg-blue-50/80 backdrop-blur-sm p-2 rounded-lg">
              <p className="text-xs text-gray-600 mb-0.5">Forecast Time</p>
              <p className="text-xs font-semibold text-gray-800">
                {new Date(data.timestamp).toLocaleString()}
              </p>
            </div>
          )}

          {/* Top Factors */}
          {data.top_factors && data.top_factors.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold mb-2 text-gray-700">Contributing Factors</h3>
              <div className="space-y-1.5">
                {data.top_factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-gradient-to-r from-blue-50/80 to-purple-50/80 rounded-lg backdrop-blur-sm">
                    <span className="text-base">{factor.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-800">{factor.factor}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Impact: {(factor.impact * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weather Analysis Button */}
          <button 
            onClick={handleWeatherAnalysis} 
            className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-sky-600 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <Cloud className="h-3.5 w-3.5" />
            {showWeather ? 'Refresh Weather' : 'Weather Analysis'}
          </button>

          {/* Weather Widget */}
          {showWeather && (
            <div className="bg-gradient-to-br from-sky-50/90 to-blue-50/90 backdrop-blur-sm rounded-xl p-3 border border-sky-200/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-800">Current Weather</h4>
                <button
                  onClick={() => setShowWeather(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {loadingWeather ? (
                <div className="text-center py-4">
                  <Cloud className="h-8 w-8 mx-auto text-sky-500 animate-pulse" />
                  <p className="text-xs text-gray-600 mt-2">Loading weather...</p>
                </div>
              ) : weatherData?.error ? (
                <p className="text-xs text-red-600">{weatherData.error}</p>
              ) : weatherData?.current ? (
                <div className="space-y-2">
                  <div className="text-center py-2">
                    <p className="text-3xl mb-1">
                      {getWeatherDescription(weatherData.current.weather_code).split(' ')[0]}
                    </p>
                    <p className="text-2xl font-bold text-sky-700">
                      {Math.round(weatherData.current.temperature_2m)}°C
                    </p>
                    <p className="text-xs text-gray-600">
                      {getWeatherDescription(weatherData.current.weather_code).substring(3)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-gray-600">Feels Like</p>
                      <p className="font-semibold text-gray-800">
                        {Math.round(weatherData.current.apparent_temperature)}°C
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-gray-600">Humidity</p>
                      <p className="font-semibold text-gray-800">
                        {weatherData.current.relative_humidity_2m}%
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-gray-600">Wind Speed</p>
                      <p className="font-semibold text-gray-800">
                        {Math.round(weatherData.current.wind_speed_10m)} km/h
                      </p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2">
                      <p className="text-gray-600">Precipitation</p>
                      <p className="font-semibold text-gray-800">
                        {weatherData.current.precipitation} mm
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
