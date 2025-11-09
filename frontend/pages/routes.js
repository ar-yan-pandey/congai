import { useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Loader from '@/components/Loader';
import { congestionAPI } from '@/utils/api';
import { getCongestionColor, getRiskClasses } from '@/lib/utils';
import { Navigation, Clock, TrendingUp, AlertTriangle, MapPin, ChevronDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar, CartesianGrid, Legend } from 'recharts';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <Loader text="Loading map..." />
});

// Popular locations worldwide
const LOCATIONS = {
  // United States - Bay Area
  'San Francisco Downtown': { lat: 37.7749, lon: -122.4194, country: 'USA' },
  'Oakland': { lat: 37.8044, lon: -122.2712, country: 'USA' },
  'San Jose': { lat: 37.3382, lon: -121.8863, country: 'USA' },
  'Berkeley': { lat: 37.8715, lon: -122.2730, country: 'USA' },
  'Palo Alto': { lat: 37.4419, lon: -122.1430, country: 'USA' },
  
  // India - Delhi NCR
  'Connaught Place, Delhi': { lat: 28.6315, lon: 77.2167, country: 'India' },
  'Cyber City, Gurgaon': { lat: 28.4950, lon: 77.0890, country: 'India' },
  'Noida Sector 18': { lat: 28.5688, lon: 77.3232, country: 'India' },
  'IGI Airport, Delhi': { lat: 28.5562, lon: 77.1000, country: 'India' },
  'Saket, Delhi': { lat: 28.5244, lon: 77.2066, country: 'India' },
  'Dwarka, Delhi': { lat: 28.5921, lon: 77.0460, country: 'India' },
  
  // India - Mumbai
  'BKC, Mumbai': { lat: 19.0596, lon: 72.8656, country: 'India' },
  'Andheri, Mumbai': { lat: 19.1136, lon: 72.8697, country: 'India' },
  'Lower Parel, Mumbai': { lat: 18.9984, lon: 72.8301, country: 'India' },
  'Nariman Point, Mumbai': { lat: 18.9250, lon: 72.8258, country: 'India' },
  'Mumbai Airport': { lat: 19.0896, lon: 72.8656, country: 'India' },
  
  // India - Bangalore
  'MG Road, Bangalore': { lat: 12.9716, lon: 77.5946, country: 'India' },
  'Whitefield, Bangalore': { lat: 12.9698, lon: 77.7499, country: 'India' },
  'Koramangala, Bangalore': { lat: 12.9352, lon: 77.6245, country: 'India' },
  'Electronic City, Bangalore': { lat: 12.8456, lon: 77.6603, country: 'India' },
  'Bangalore Airport': { lat: 13.1986, lon: 77.7066, country: 'India' },
  
  // India - Hyderabad
  'HITEC City, Hyderabad': { lat: 17.4435, lon: 78.3772, country: 'India' },
  'Gachibowli, Hyderabad': { lat: 17.4399, lon: 78.3489, country: 'India' },
  'Banjara Hills, Hyderabad': { lat: 17.4239, lon: 78.4738, country: 'India' },
  'Hyderabad Airport': { lat: 17.2403, lon: 78.4294, country: 'India' },
  
  // India - Pune
  'Hinjewadi, Pune': { lat: 18.5912, lon: 73.7389, country: 'India' },
  'Koregaon Park, Pune': { lat: 18.5362, lon: 73.8958, country: 'India' },
  'Viman Nagar, Pune': { lat: 18.5679, lon: 73.9143, country: 'India' },
  'Pune Airport': { lat: 18.5821, lon: 73.9197, country: 'India' },
  
  // India - Chennai
  'Anna Nagar, Chennai': { lat: 13.0850, lon: 80.2101, country: 'India' },
  'OMR, Chennai': { lat: 12.8996, lon: 80.2209, country: 'India' },
  'T Nagar, Chennai': { lat: 13.0418, lon: 80.2341, country: 'India' },
  'Chennai Airport': { lat: 12.9941, lon: 80.1709, country: 'India' },
};

export default function Routes() {
  const [startLocation, setStartLocation] = useState('San Francisco Downtown');
  const [endLocation, setEndLocation] = useState('Oakland');
  const [departureTime, setDepartureTime] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const start = LOCATIONS[startLocation];
      const end = LOCATIONS[endLocation];
      const departure = departureTime || new Date().toISOString();
      
      const response = await congestionAPI.simulateRoute(
        start.lat,
        start.lon,
        end.lat,
        end.lon,
        departure
      );

      if (response.success) {
        setRouteData(response.data);
      }
    } catch (error) {
      console.error('Error simulating route:', error);
      alert('Failed to simulate route. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoute = (start, end) => {
    setStartLocation(start);
    setEndLocation(end);
  };

  // Prepare chart data
  const chartData = routeData?.route.waypoints.map((wp, idx) => ({
    name: `${wp.eta_minutes}min`,
    congestion: wp.congestion_score * 100,
    risk: wp.risk_level
  })) || [];

  return (
    <>
      <Head>
        <title>Route Simulator - CongestionAI</title>
      </Head>

      <div className="container mx-auto px-4 py-8 overflow-y-auto max-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Navigation className="h-8 w-8 mr-3 text-primary" />
            Route Simulator
          </h1>
          <p className="text-gray-600">
            Analyze route risk and find optimal departure times
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Route Presets */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-2">🚀 Quick Routes</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">🇺🇸 USA</p>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => handleQuickRoute('San Francisco Downtown', 'Oakland')}
                          className="text-xs px-2 py-1 bg-white border border-blue-200 rounded hover:bg-blue-100"
                        >
                          SF → Oakland
                        </button>
                        <button
                          onClick={() => handleQuickRoute('San Francisco Downtown', 'San Jose')}
                          className="text-xs px-2 py-1 bg-white border border-blue-200 rounded hover:bg-blue-100"
                        >
                          SF → SJ
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">🇮🇳 India</p>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => handleQuickRoute('Connaught Place, Delhi', 'Cyber City, Gurgaon')}
                          className="text-xs px-2 py-1 bg-white border border-orange-200 rounded hover:bg-orange-50"
                        >
                          CP → Gurgaon
                        </button>
                        <button
                          onClick={() => handleQuickRoute('BKC, Mumbai', 'Mumbai Airport')}
                          className="text-xs px-2 py-1 bg-white border border-orange-200 rounded hover:bg-orange-50"
                        >
                          BKC → Airport
                        </button>
                        <button
                          onClick={() => handleQuickRoute('MG Road, Bangalore', 'Whitefield, Bangalore')}
                          className="text-xs px-2 py-1 bg-white border border-orange-200 rounded hover:bg-orange-50"
                        >
                          MG → Whitefield
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-green-600" />
                    Start Location
                  </label>
                  <select
                    value={startLocation}
                    onChange={(e) => setStartLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary"
                  >
                    <optgroup label="🇺🇸 United States">
                      {Object.entries(LOCATIONS)
                        .filter(([_, data]) => data.country === 'USA')
                        .map(([loc]) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </optgroup>
                    <optgroup label="🇮🇳 India">
                      {Object.entries(LOCATIONS)
                        .filter(([_, data]) => data.country === 'India')
                        .map(([loc]) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-red-600" />
                    End Location
                  </label>
                  <select
                    value={endLocation}
                    onChange={(e) => setEndLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary"
                  >
                    <optgroup label="🇺🇸 United States">
                      {Object.entries(LOCATIONS)
                        .filter(([_, data]) => data.country === 'USA')
                        .map(([loc]) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </optgroup>
                    <optgroup label="🇮🇳 India">
                      {Object.entries(LOCATIONS)
                        .filter(([_, data]) => data.country === 'India')
                        .map(([loc]) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Departure Time (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for current time</p>
                </div>

                <Button onClick={handleSimulate} disabled={loading} className="w-full">
                  {loading ? 'Simulating...' : 'Simulate Route'}
                </Button>

                {/* Advanced Analysis Toggle */}
                {routeData && (
                  <div className="pt-4 border-t">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                        <span className="font-medium">Advanced Analysis</span>
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      {showAdvanced ? 'Showing detailed charts and waypoint analysis' : 'Click to view detailed graphs and analysis'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <Card>
                <CardContent className="p-8">
                  <Loader text="Simulating route..." />
                </CardContent>
              </Card>
            ) : routeData ? (
              <>
                {/* Risk Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Average Congestion</p>
                        <p className="text-3xl font-bold text-primary">
                          {(routeData.risk_analysis.average_congestion * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Peak Congestion</p>
                        <p className="text-3xl font-bold text-orange-600">
                          {(routeData.risk_analysis.max_congestion * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Overall Risk</p>
                        <span className={getRiskClasses(routeData.risk_analysis.overall_risk)}>
                          {routeData.risk_analysis.overall_risk.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Optimization */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Departure Optimization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                        <div>
                          <p className="text-sm text-gray-600">Requested Departure</p>
                          <p className="font-semibold">
                            {new Date(routeData.optimization.requested_departure).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded border-2 border-green-500">
                        <div>
                          <p className="text-sm text-gray-600">Optimal Departure</p>
                          <p className="font-semibold">
                            {new Date(routeData.optimization.optimal_departure).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Time Shift</p>
                          <p className="font-bold text-green-600">
                            {routeData.optimization.time_shift_hours > 0 ? '+' : ''}
                            {routeData.optimization.time_shift_hours}h
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Recommendation</p>
                          <p className="text-sm text-gray-700">
                            {routeData.optimization.potential_savings}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Congestion Chart - Only show in Advanced mode */}
                {showAdvanced && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Route Congestion Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorCongestion" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'Congestion %', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="congestion" 
                          stroke="#1E3A8A" 
                          fillOpacity={1} 
                          fill="url(#colorCongestion)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                )}

                {/* Waypoints Table - Only show in Advanced mode */}
                {showAdvanced && (
                <Card>
                  <CardHeader>
                    <CardTitle>Route Waypoints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">ETA</th>
                            <th className="text-left p-2">Location</th>
                            <th className="text-left p-2">Congestion</th>
                            <th className="text-left p-2">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routeData.route.waypoints.map((wp, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-2">{wp.eta_minutes} min</td>
                              <td className="p-2 font-mono text-xs">
                                {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                              </td>
                              <td className="p-2">
                                <div className="flex items-center">
                                  <div 
                                    className="w-16 h-2 rounded-full mr-2"
                                    style={{ 
                                      width: `${wp.congestion_score * 100}%`,
                                      backgroundColor: getCongestionColor(wp.congestion_score)
                                    }}
                                  />
                                  <span>{(wp.congestion_score * 100).toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="p-2">
                                <span className={getRiskClasses(wp.risk_level)}>
                                  {wp.risk_level}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Navigation className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">
                    Enter route details and click "Simulate Route" to analyze traffic patterns
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
