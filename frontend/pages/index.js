import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/Loader';
import RiskPanel from '@/components/RiskPanel';
import { congestionAPI } from '@/utils/api';
import { generateLocationGrid } from '../lib/utils.js';
import { Clock, RefreshCw, MapPin, Search } from 'lucide-react';

// Dynamic import for AIAssistant to avoid SSR issues with Three.js
const AIAssistant = dynamic(() => import('@/components/AIAssistant'), {
  ssr: false,
  loading: () => null
});

// Dynamic import for MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <Loader text="Loading map..." />
});

// Popular areas with their coordinates
const AREAS = {
  // United States - Bay Area
  'San Francisco Downtown': { lat: 37.7749, lon: -122.4194, zoom: 14, country: 'USA' },
  'Oakland Downtown': { lat: 37.8044, lon: -122.2712, zoom: 14, country: 'USA' },
  'San Jose Downtown': { lat: 37.3382, lon: -121.8863, zoom: 14, country: 'USA' },
  'Berkeley': { lat: 37.8715, lon: -122.2730, zoom: 14, country: 'USA' },
  'Palo Alto': { lat: 37.4419, lon: -122.1430, zoom: 14, country: 'USA' },
  
  // India - Delhi NCR
  'Connaught Place, Delhi': { lat: 28.6315, lon: 77.2167, zoom: 14, country: 'India' },
  'Cyber City, Gurgaon': { lat: 28.4950, lon: 77.0890, zoom: 14, country: 'India' },
  'Cyber City Gurgaon': { lat: 28.4950, lon: 77.0890, zoom: 14, country: 'India' },
  'Noida Sector 18': { lat: 28.5688, lon: 77.3232, zoom: 14, country: 'India' },
  'Sector 18': { lat: 28.5688, lon: 77.3232, zoom: 14, country: 'India' },
  'Sector 8 Gurgaon': { lat: 28.4601, lon: 77.0365, zoom: 14, country: 'India' },
  'Sector 8': { lat: 28.4601, lon: 77.0365, zoom: 14, country: 'India' },
  'Dwarka, Delhi': { lat: 28.5921, lon: 77.0460, zoom: 14, country: 'India' },
  'Saket, Delhi': { lat: 28.5244, lon: 77.2066, zoom: 14, country: 'India' },
  
  // India - Mumbai
  'Bandra Kurla Complex, Mumbai': { lat: 19.0596, lon: 72.8656, zoom: 14, country: 'India' },
  'Andheri, Mumbai': { lat: 19.1136, lon: 72.8697, zoom: 14, country: 'India' },
  'Lower Parel, Mumbai': { lat: 18.9984, lon: 72.8301, zoom: 14, country: 'India' },
  'Powai, Mumbai': { lat: 19.1197, lon: 72.9058, zoom: 14, country: 'India' },
  'Nariman Point, Mumbai': { lat: 18.9250, lon: 72.8258, zoom: 14, country: 'India' },
  
  // India - Bangalore
  'MG Road, Bangalore': { lat: 12.9716, lon: 77.5946, zoom: 14, country: 'India' },
  'Whitefield, Bangalore': { lat: 12.9698, lon: 77.7499, zoom: 14, country: 'India' },
  'Koramangala, Bangalore': { lat: 12.9352, lon: 77.6245, zoom: 14, country: 'India' },
  'Electronic City, Bangalore': { lat: 12.8456, lon: 77.6603, zoom: 14, country: 'India' },
  'Indiranagar, Bangalore': { lat: 12.9719, lon: 77.6412, zoom: 14, country: 'India' },
  
  // India - Hyderabad
  'HITEC City, Hyderabad': { lat: 17.4435, lon: 78.3772, zoom: 14, country: 'India' },
  'Gachibowli, Hyderabad': { lat: 17.4399, lon: 78.3489, zoom: 14, country: 'India' },
  'Banjara Hills, Hyderabad': { lat: 17.4239, lon: 78.4738, zoom: 14, country: 'India' },
  'Secunderabad': { lat: 17.4399, lon: 78.4983, zoom: 14, country: 'India' },
  
  // India - Pune
  'Hinjewadi, Pune': { lat: 18.5912, lon: 73.7389, zoom: 14, country: 'India' },
  'Koregaon Park, Pune': { lat: 18.5362, lon: 73.8958, zoom: 14, country: 'India' },
  'Viman Nagar, Pune': { lat: 18.5679, lon: 73.9143, zoom: 14, country: 'India' },
  
  // India - Chennai
  'Anna Nagar, Chennai': { lat: 13.0850, lon: 80.2101, zoom: 14, country: 'India' },
  'OMR, Chennai': { lat: 12.8996, lon: 80.2209, zoom: 14, country: 'India' },
  'T Nagar, Chennai': { lat: 13.0418, lon: 80.2341, zoom: 14, country: 'India' },
  
  // India - Kolkata
  'Salt Lake, Kolkata': { lat: 22.5726, lon: 88.4194, zoom: 14, country: 'India' },
  'Park Street, Kolkata': { lat: 22.5535, lon: 88.3515, zoom: 14, country: 'India' },
};

export default function Home() {
  const [predictions, setPredictions] = useState([]);
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoursAhead, setHoursAhead] = useState(3);
  const [selectedArea, setSelectedArea] = useState('San Francisco Downtown');
  const [center, setCenter] = useState([37.7749, -122.4194]);
  const [zoom, setZoom] = useState(14);
  const [viewMode, setViewMode] = useState('roads'); // 'roads' or 'grid'
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    fetchPredictions();
  }, [hoursAhead]);

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      // Generate a denser grid for better heatmap coverage (10x10 = 100 locations)
      const gridSize = viewMode === 'roads' ? 10 : 8;
      const spacing = viewMode === 'roads' ? 0.006 : 0.02; // Tighter spacing for heatmap
      const locations = generateLocationGrid(center[0], center[1], gridSize, spacing);
      
      // Calculate timestamp
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() + hoursAhead);
      
      // Fetch batch predictions
      const response = await congestionAPI.forecastBatch(locations, timestamp.toISOString());
      
      if (response.success) {
        setPredictions(response.data);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
      alert('Failed to fetch predictions. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaChange = (area) => {
    const areaData = AREAS[area];
    setSelectedArea(area);
    setCenter([areaData.lat, areaData.lon]);
    setZoom(areaData.zoom);
  };

  const handleMarkerClick = (prediction) => {
    setSelectedPrediction(prediction);
  };

  const handleRefresh = () => {
    fetchPredictions();
  };

  const handleLocationSelect = (areaName) => {
    handleAreaChange(areaName);
    setShowLocationSearch(false);
    setSearchQuery('');
  };

  const filteredAreas = Object.keys(AREAS).filter(area =>
    area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Head>
        <title>CongestionAI - Traffic Prediction Dashboard</title>
      </Head>

      <div className="absolute inset-0 top-0">
        {/* AI Avatar Button - Bottom Right */}
        {!showAIAssistant && (
          <div className="absolute bottom-4 right-4 z-[1000]">
            <button 
              onClick={() => setShowAIAssistant(true)}
              className="bg-white/80 backdrop-blur-xl backdrop-saturate-150 rounded-full shadow-2xl border border-white/40 p-3 hover:scale-110 transition-all group"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
            </button>
          </div>
        )}

        {/* Control Panel - Glassmorphism */}
        <div className="absolute top-24 left-4 z-[1000]">
          <div className="w-72 bg-white/80 backdrop-blur-xl backdrop-saturate-150 rounded-2xl shadow-2xl border border-white/40 p-4 space-y-3">
            {/* Header - Compact */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200/50">
              <div className="bg-gradient-to-br from-primary to-blue-900 p-1.5 rounded-lg">
                <MapPin className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Traffic Heatmap</h2>
                <p className="text-xs text-gray-600">Real-time predictions</p>
              </div>
            </div>

            {/* Location Search Button */}
            <div>
              <label className="flex items-center text-xs font-medium mb-1.5 text-gray-700">
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                Current Location
              </label>
              <button
                onClick={() => setShowLocationSearch(true)}
                className="w-full px-3 py-2 bg-white/60 border border-gray-300/50 rounded-lg text-xs text-left hover:bg-white/80 transition-all backdrop-blur-sm flex items-center justify-between"
              >
                <span className="font-medium text-gray-800 truncate">{selectedArea}</span>
                <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
              </button>
              <button
                onClick={fetchPredictions}
                disabled={loading}
                className="w-full mt-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-blue-900 text-white text-xs font-medium rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load Area'}
              </button>
            </div>

            {/* Time & Heatmap Controls - Compact Row */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="flex items-center text-xs font-medium mb-1 text-gray-700">
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  {hoursAhead}h
                </label>
                <input
                  type="range"
                  min="3"
                  max="72"
                  step="3"
                  value={hoursAhead}
                  onChange={(e) => setHoursAhead(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200/60 rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`p-2 rounded-lg transition-all ${
                  showHeatmap ? 'bg-primary text-white' : 'bg-gray-200/60 text-gray-600'
                }`}
                title="Toggle Heatmap"
              >
                <MapPin className="h-4 w-4" />
              </button>
            </div>

            {/* Legend - Compact */}
            <div className="bg-gradient-to-br from-gray-50/80 to-gray-100/80 rounded-lg p-2.5 backdrop-blur-sm">
              <p className="text-xs font-semibold mb-1.5 text-gray-800">Legend</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span className="text-gray-700">Low</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-yellow-500"></div>
                  <span className="text-gray-700">Medium</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-orange-500"></div>
                  <span className="text-gray-700">High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-600"></div>
                  <span className="text-gray-700">Critical</span>
                </div>
              </div>
            </div>

            {/* Stats - Compact */}
            {predictions.length > 0 && (
              <div className="flex items-center justify-between text-xs bg-primary/10 rounded-lg p-2">
                <span className="text-gray-700">{predictions.length} points</span>
                <span className="font-semibold text-primary">
                  {(predictions.reduce((sum, p) => sum + p.congestion_score, 0) / predictions.length * 100).toFixed(0)}% avg
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Risk Panel */}
        {selectedPrediction && (
          <RiskPanel 
            data={selectedPrediction} 
            onClose={() => setSelectedPrediction(null)} 
          />
        )}

        {/* AI Assistant */}
        {showAIAssistant && (
          <AIAssistant 
            onClose={() => setShowAIAssistant(false)}
            onQueryRoute={(routeData) => {
              // Zoom map to destination location
              if (routeData && routeData.destination) {
                const destination = routeData.destination.toLowerCase();
                
                // Try to find matching area in AREAS
                const matchingArea = Object.keys(AREAS).find(area => 
                  area.toLowerCase().includes(destination) || 
                  destination.includes(area.toLowerCase().split(',')[0].toLowerCase())
                );
                
                if (matchingArea) {
                  const location = AREAS[matchingArea];
                  setCenter([location.lat, location.lon]);
                  setZoom(15); // Zoom in closer for destination
                  setSelectedArea(matchingArea);
                  
                  // Fetch predictions for the new location
                  setTimeout(() => {
                    fetchPredictions();
                  }, 500);
                } else {
                  console.log('Location not found in AREAS:', routeData.destination);
                }
              }
            }}
          />
        )}

        {/* Map */}
        <div className="w-full h-full">
          {loading && predictions.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Loader text="Loading predictions..." />
            </div>
          ) : (
            <MapView
              predictions={predictions}
              center={center}
              zoom={zoom}
              onMarkerClick={handleMarkerClick}
              showHeatmap={showHeatmap}
            />
          )}
        </div>

        {/* Location Search Modal */}
        {showLocationSearch && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-2xl mx-4">
              {/* Search Box - Enhanced Glassmorphism */}
              <div className="bg-white/80 backdrop-blur-2xl backdrop-saturate-150 rounded-3xl shadow-2xl border border-white/50 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Search className="h-6 w-6 text-primary" />
                  <input
                    type="text"
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && filteredAreas.length > 0) {
                        handleLocationSelect(filteredAreas[0]);
                      } else if (e.key === 'Escape') {
                        setShowLocationSearch(false);
                        setSearchQuery('');
                      }
                    }}
                    autoFocus
                    className="flex-1 text-lg px-4 py-3 bg-white/60 backdrop-blur-sm border-2 border-white/40 rounded-xl focus:border-primary focus:bg-white/80 focus:outline-none transition-all placeholder:text-gray-400"
                  />
                  <button
                    onClick={() => {
                      setShowLocationSearch(false);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                  >
                    <span className="text-2xl text-gray-400">×</span>
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {filteredAreas.length > 0 ? (
                    filteredAreas.map((area) => (
                      <button
                        key={area}
                        onClick={() => handleLocationSelect(area)}
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/60 hover:backdrop-blur-sm transition-all flex items-center gap-3 group border border-transparent hover:border-white/50"
                      >
                        <MapPin className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{area}</p>
                          <p className="text-xs text-gray-500">
                            {AREAS[area].country === 'India' ? '🇮🇳 India' : '🇺🇸 United States'}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No locations found</p>
                      <p className="text-sm">Try a different search term</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Press <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> to select first result • <kbd className="px-2 py-1 bg-gray-100 rounded">Esc</kbd> to close
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
