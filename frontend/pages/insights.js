import { useState, useEffect } from 'react';
import Head from 'next/head';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Loader from '@/components/Loader';
import { congestionAPI } from '@/utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Activity, Clock, Zap } from 'lucide-react';

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await congestionAPI.getInsights();
      if (response.success) {
        setInsights(response.data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      alert('Failed to fetch insights. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 overflow-y-auto max-h-screen">
        <Loader text="Loading insights..." />
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="container mx-auto px-4 py-8 overflow-y-auto max-h-screen">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No insights available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare data for charts
  const featureData = insights.feature_importance.slice(0, 10).map(f => ({
    name: f.feature.replace(/_/g, ' '),
    importance: f.importance * 100
  }));

  const riskDistData = Object.entries(insights.risk_distribution).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value,
    color: key === 'critical' ? '#DC2626' : 
           key === 'high' ? '#EA580C' : 
           key === 'medium' ? '#F59E0B' : '#22C55E'
  }));

  const peakHoursData = insights.peak_hours.map(p => ({
    hour: `${p.hour}:00`,
    congestion: p.avg_congestion * 100
  }));

  return (
    <>
      <Head>
        <title>Insights - CongestionAI</title>
      </Head>

      <div className="container mx-auto px-4 py-8 overflow-y-auto max-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <TrendingUp className="h-8 w-8 mr-3 text-primary" />
            Global Insights
          </h1>
          <p className="text-gray-600">
            AI model performance and traffic pattern analysis
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Congestion</p>
                  <p className="text-2xl font-bold text-primary">
                    {(insights.statistics.avg_congestion * 100).toFixed(1)}%
                  </p>
                </div>
                <Activity className="h-10 w-10 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Peak Congestion</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {(insights.statistics.max_congestion * 100).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Model Features</p>
                  <p className="text-2xl font-bold text-green-600">
                    {insights.model_info.features_count}
                  </p>
                </div>
                <Zap className="h-10 w-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Variability</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ±{(insights.statistics.std_congestion * 100).toFixed(1)}%
                  </p>
                </div>
                <Clock className="h-10 w-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Importance */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Feature Importance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={featureData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="importance" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-4">
                Feature importance scores from XGBoost model showing which factors most influence congestion predictions.
              </p>
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Level Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={riskDistData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-4">
                Distribution of risk levels across sampled predictions showing overall traffic conditions.
              </p>
            </CardContent>
          </Card>

          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Congestion Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHoursData}>
                  <XAxis dataKey="hour" />
                  <YAxis label={{ value: 'Congestion %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="congestion" fill="#EA580C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {insights.peak_hours.slice(0, 3).map((peak, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium">
                      {peak.hour}:00 - {peak.hour + 1}:00
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      {(peak.avg_congestion * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Model Info */}
          <Card>
            <CardHeader>
              <CardTitle>Model Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Architecture</h3>
                  <p className="text-sm text-gray-700">
                    {insights.model_info.model_type}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Gradient boosting ensemble with {insights.model_info.features_count} input features
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Explainability</h3>
                  <p className="text-sm text-gray-700">
                    SHAP (SHapley Additive exPlanations)
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Provides interpretable feature contributions for each prediction
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Key Features</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Temporal patterns (hour, day, season)</li>
                    <li>• Weather conditions (rain, temp, visibility)</li>
                    <li>• Historical trends (lag & rolling stats)</li>
                    <li>• Spatial encoding (H3 hexagonal grid)</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Prediction Horizon</h3>
                  <p className="text-sm text-gray-700">
                    3 to 72 hours ahead
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Forecasts updated every 3 hours with real-time weather data
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Statistical Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-1">Mean Congestion</p>
                <p className="text-xl font-bold">
                  {(insights.statistics.avg_congestion * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-1">Max Observed</p>
                <p className="text-xl font-bold">
                  {(insights.statistics.max_congestion * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-1">Min Observed</p>
                <p className="text-xl font-bold">
                  {(insights.statistics.min_congestion * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600 mb-1">Std Deviation</p>
                <p className="text-xl font-bold">
                  {(insights.statistics.std_congestion * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
