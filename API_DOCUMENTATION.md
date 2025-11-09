# CongestionAI API Documentation

Complete API reference for the CongestionAI backend service.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently, no authentication is required. In production, implement API keys or OAuth.

## Endpoints

### 1. Health Check

Check API status and model availability.

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "features_count": 37
}
```

---

### 2. Single Location Forecast

Predict congestion for a specific location and time.

**Endpoint**: `POST /forecast`

**Request Body**:
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "timestamp": "2024-01-15T14:00:00Z"  // Optional, defaults to now + 3h
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "congestion_score": 0.654,
    "risk_level": "medium",
    "timestamp": "2024-01-15T14:00:00Z",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "h3_cell": "882830829bfffff"
    },
    "top_factors": [
      {
        "factor": "Evening Rush Hour",
        "impact": 0.35,
        "icon": "🌆"
      },
      {
        "factor": "Weekday Traffic",
        "impact": 0.1,
        "icon": "📅"
      }
    ],
    "shap_factors": [
      {
        "feature": "hour",
        "impact": 0.123
      },
      {
        "feature": "temperature",
        "impact": -0.045
      }
    ],
    "recommendations": [
      "⏰ Delay departure by 1-2 hours if possible",
      "🚗 Pre-position emergency vehicles in nearby areas"
    ],
    "confidence": 0.85
  }
}
```

---

### 3. Batch Forecast

Get predictions for multiple locations (useful for heatmaps).

**Endpoint**: `POST /batch_forecast`

**Request Body**:
```json
{
  "locations": [
    {"latitude": 37.7749, "longitude": -122.4194},
    {"latitude": 37.8044, "longitude": -122.2712},
    {"latitude": 37.3382, "longitude": -121.8863}
  ],
  "timestamp": "2024-01-15T14:00:00Z"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "count": 3,
  "timestamp": "2024-01-15T14:00:00Z",
  "data": [
    {
      "congestion_score": 0.654,
      "risk_level": "medium",
      "location": {...},
      // ... full prediction object for each location
    }
  ]
}
```

---

### 4. Route Simulation

Analyze traffic risk along a route from start to end.

**Endpoint**: `POST /route_simulate`

**Request Body**:
```json
{
  "start_lat": 37.7749,
  "start_lon": -122.4194,
  "end_lat": 37.8044,
  "end_lon": -122.2712,
  "departure_time": "2024-01-15T08:00:00Z"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "route": {
      "start": {"latitude": 37.7749, "longitude": -122.4194},
      "end": {"latitude": 37.8044, "longitude": -122.2712},
      "waypoints": [
        {
          "latitude": 37.7749,
          "longitude": -122.4194,
          "congestion_score": 0.45,
          "risk_level": "medium",
          "eta_minutes": 0
        },
        // ... more waypoints
      ]
    },
    "risk_analysis": {
      "average_congestion": 0.523,
      "max_congestion": 0.789,
      "overall_risk": "medium"
    },
    "optimization": {
      "requested_departure": "2024-01-15T08:00:00Z",
      "optimal_departure": "2024-01-15T10:00:00Z",
      "time_shift_hours": 2.0,
      "potential_savings": "2.0 hours"
    }
  }
}
```

---

### 5. Timeseries Forecast

Get congestion predictions over time for a single location.

**Endpoint**: `POST /timeseries`

**Request Body**:
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "start_time": "2024-01-15T08:00:00Z",  // Optional
  "hours_ahead": 72  // 3-168 hours
}
```

**Response**:
```json
{
  "success": true,
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "start_time": "2024-01-15T08:00:00Z",
  "hours_ahead": 72,
  "data": [
    {
      "hours_ahead": 0,
      "congestion_score": 0.45,
      "risk_level": "medium",
      "timestamp": "2024-01-15T08:00:00Z",
      // ... full prediction object
    },
    {
      "hours_ahead": 3,
      "congestion_score": 0.67,
      "risk_level": "high",
      "timestamp": "2024-01-15T11:00:00Z",
      // ... full prediction object
    }
    // ... predictions every 3 hours
  ]
}
```

---

### 6. Global Insights

Get model performance metrics and traffic statistics.

**Endpoint**: `GET /insights`

**Response**:
```json
{
  "success": true,
  "data": {
    "feature_importance": [
      {
        "feature": "hour",
        "importance": 0.234
      },
      {
        "feature": "temperature",
        "importance": 0.156
      }
      // ... top 15 features
    ],
    "statistics": {
      "avg_congestion": 0.456,
      "max_congestion": 0.892,
      "min_congestion": 0.123,
      "std_congestion": 0.187
    },
    "peak_hours": [
      {
        "hour": 17,
        "avg_congestion": 0.789
      },
      {
        "hour": 8,
        "avg_congestion": 0.734
      }
      // ... top 5 peak hours
    ],
    "risk_distribution": {
      "low": 45,
      "medium": 32,
      "high": 18,
      "critical": 5
    },
    "model_info": {
      "features_count": 37,
      "model_type": "XGBoost Regressor"
    }
  }
}
```

---

## Risk Levels

Congestion scores are mapped to risk levels:

- **Low**: 0.0 - 0.3 (Green)
- **Medium**: 0.3 - 0.6 (Yellow)
- **High**: 0.6 - 0.8 (Orange)
- **Critical**: 0.8 - 1.0 (Red)

## Error Responses

All endpoints return errors in this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `500`: Internal Server Error
- `503`: Service Unavailable (model not loaded)

## Rate Limiting

Currently no rate limiting. Implement in production using:
- Redis-based rate limiter
- API Gateway rate limiting
- Per-user quotas

## CORS

CORS is currently set to allow all origins (`*`). In production, restrict to specific domains:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Interactive Documentation

Visit `http://localhost:8000/docs` for interactive Swagger UI documentation where you can test all endpoints directly in your browser.

## Example Usage (Python)

```python
import requests

# Single forecast
response = requests.post(
    "http://localhost:8000/forecast",
    json={
        "latitude": 37.7749,
        "longitude": -122.4194
    }
)
data = response.json()
print(f"Congestion: {data['data']['congestion_score']}")

# Route simulation
response = requests.post(
    "http://localhost:8000/route_simulate",
    json={
        "start_lat": 37.7749,
        "start_lon": -122.4194,
        "end_lat": 37.8044,
        "end_lon": -122.2712
    }
)
route_data = response.json()
print(f"Average congestion: {route_data['data']['risk_analysis']['average_congestion']}")
```

## Example Usage (JavaScript)

```javascript
// Single forecast
const response = await fetch('http://localhost:8000/forecast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.7749,
    longitude: -122.4194
  })
});
const data = await response.json();
console.log('Congestion:', data.data.congestion_score);

// Get insights
const insights = await fetch('http://localhost:8000/insights');
const insightsData = await insights.json();
console.log('Feature importance:', insightsData.data.feature_importance);
```

## Support

For issues or questions:
1. Check the SETUP_GUIDE.md for troubleshooting
2. Review the main README.md for architecture details
3. Examine server logs for error details
