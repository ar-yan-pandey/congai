"""
FastAPI Application for CongestionAI
RESTful API for traffic congestion predictions
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import numpy as np
from pathlib import Path

from .infer import CongestionPredictor

# Initialize FastAPI app
app = FastAPI(
    title="CongestionAI API",
    version="1.0.0",
    description="AI-powered traffic congestion prediction platform"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize predictor (lazy loading)
predictor = None

def get_predictor():
    """Get or initialize predictor"""
    global predictor
    if predictor is None:
        model_path = Path("models/model.pkl")
        if not model_path.exists():
            raise HTTPException(
                status_code=503,
                detail="Model not found. Please train the model first using: python -m src.train_model"
            )
        predictor = CongestionPredictor(str(model_path))
    return predictor


# Pydantic models for request/response
class LocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    timestamp: Optional[str] = Field(None, description="ISO format timestamp (default: now + 3h)")

class BatchLocationRequest(BaseModel):
    locations: List[dict] = Field(..., description="List of {latitude, longitude} objects")
    timestamp: Optional[str] = Field(None, description="ISO format timestamp")

class RouteRequest(BaseModel):
    start_lat: float = Field(..., ge=-90, le=90)
    start_lon: float = Field(..., ge=-180, le=180)
    end_lat: float = Field(..., ge=-90, le=90)
    end_lon: float = Field(..., ge=-180, le=180)
    departure_time: Optional[str] = Field(None, description="ISO format timestamp")

class TimeseriesRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    start_time: Optional[str] = Field(None, description="ISO format timestamp")
    hours_ahead: int = Field(72, ge=3, le=168, description="Hours to forecast (3-168)")


# API Endpoints
@app.get("/")
async def root():
    """API health check"""
    return {
        "service": "CongestionAI API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "forecast": "/forecast",
            "batch_forecast": "/batch_forecast",
            "route_simulate": "/route_simulate",
            "timeseries": "/timeseries",
            "insights": "/insights"
        }
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        pred = get_predictor()
        return {
            "status": "healthy",
            "model_loaded": pred.model is not None,
            "features_count": len(pred.feature_names) if pred.feature_names else 0
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/forecast")
async def forecast_single(request: LocationRequest):
    """
    Predict congestion for a single location and time
    
    Returns congestion score, risk level, contributing factors, and recommendations
    """
    try:
        pred = get_predictor()
        
        # Parse timestamp
        if request.timestamp:
            timestamp = datetime.fromisoformat(request.timestamp.replace('Z', '+00:00'))
        else:
            timestamp = datetime.now() + timedelta(hours=3)
        
        # Get prediction
        result = pred.predict_single(
            lat=request.latitude,
            lon=request.longitude,
            timestamp=timestamp
        )
        
        return {
            "success": True,
            "data": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch_forecast")
async def forecast_batch(request: BatchLocationRequest):
    """
    Predict congestion for multiple locations at the same time
    
    Useful for generating heatmaps
    """
    try:
        pred = get_predictor()
        
        # Parse timestamp
        if request.timestamp:
            timestamp = datetime.fromisoformat(request.timestamp.replace('Z', '+00:00'))
        else:
            timestamp = datetime.now() + timedelta(hours=3)
        
        # Extract locations
        locations = [
            (loc['latitude'], loc['longitude']) 
            for loc in request.locations
        ]
        
        # Get predictions
        results = pred.predict_batch(locations, timestamp)
        
        return {
            "success": True,
            "count": len(results),
            "timestamp": timestamp.isoformat(),
            "data": results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/route_simulate")
async def simulate_route(request: RouteRequest):
    """
    Simulate route risk from start to end location
    
    Returns overall route risk, waypoint predictions, and optimal departure time
    """
    try:
        pred = get_predictor()
        
        # Parse timestamp
        if request.departure_time:
            departure = datetime.fromisoformat(request.departure_time.replace('Z', '+00:00'))
        else:
            departure = datetime.now()
        
        # Generate waypoints along route (simplified - linear interpolation)
        num_waypoints = 10
        waypoints = []
        
        for i in range(num_waypoints + 1):
            t = i / num_waypoints
            lat = request.start_lat + t * (request.end_lat - request.start_lat)
            lon = request.start_lon + t * (request.end_lon - request.start_lon)
            
            # Estimate time to reach this waypoint (assume 60 km/h average)
            distance_km = t * 20  # Assume 20km total route
            hours_offset = distance_km / 60
            waypoint_time = departure + timedelta(hours=hours_offset)
            
            # Predict congestion
            prediction = pred.predict_single(lat, lon, waypoint_time)
            
            waypoints.append({
                'latitude': lat,
                'longitude': lon,
                'congestion_score': prediction['congestion_score'],
                'risk_level': prediction['risk_level'],
                'eta_minutes': int(hours_offset * 60)
            })
        
        # Calculate overall route risk
        avg_congestion = np.mean([w['congestion_score'] for w in waypoints])
        max_congestion = max([w['congestion_score'] for w in waypoints])
        
        overall_risk = pred.get_risk_level(avg_congestion)
        
        # Find optimal departure time (test ±3 hours)
        optimal_departure = departure
        min_congestion = avg_congestion
        
        for hour_offset in range(-3, 4):
            test_time = departure + timedelta(hours=hour_offset)
            test_predictions = [
                pred.predict_single(w['latitude'], w['longitude'], test_time)
                for w in waypoints[::2]  # Sample every other waypoint
            ]
            test_avg = np.mean([p['congestion_score'] for p in test_predictions])
            
            if test_avg < min_congestion:
                min_congestion = test_avg
                optimal_departure = test_time
        
        # Calculate time savings
        time_shift_hours = (optimal_departure - departure).total_seconds() / 3600
        
        return {
            "success": True,
            "data": {
                "route": {
                    "start": {"latitude": request.start_lat, "longitude": request.start_lon},
                    "end": {"latitude": request.end_lat, "longitude": request.end_lon},
                    "waypoints": waypoints
                },
                "risk_analysis": {
                    "average_congestion": round(float(avg_congestion), 3),
                    "max_congestion": round(float(max_congestion), 3),
                    "overall_risk": overall_risk
                },
                "optimization": {
                    "requested_departure": departure.isoformat(),
                    "optimal_departure": optimal_departure.isoformat(),
                    "time_shift_hours": round(time_shift_hours, 1),
                    "potential_savings": f"{abs(time_shift_hours)} hours" if time_shift_hours != 0 else "No change recommended"
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/timeseries")
async def forecast_timeseries(request: TimeseriesRequest):
    """
    Predict congestion timeseries for a location over multiple hours
    
    Useful for trend analysis and charts
    """
    try:
        pred = get_predictor()
        
        # Parse start time
        if request.start_time:
            start_time = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
        else:
            start_time = datetime.now()
        
        # Get timeseries predictions
        results = pred.predict_timeseries(
            lat=request.latitude,
            lon=request.longitude,
            start_time=start_time,
            hours_ahead=request.hours_ahead
        )
        
        return {
            "success": True,
            "location": {
                "latitude": request.latitude,
                "longitude": request.longitude
            },
            "start_time": start_time.isoformat(),
            "hours_ahead": request.hours_ahead,
            "data": results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insights")
async def get_insights():
    """
    Get global insights: feature importance, statistics, and trends
    """
    try:
        pred = get_predictor()
        
        # Get feature importance from model
        feature_importance = []
        if hasattr(pred.model, 'feature_importances_'):
            importances = pred.model.feature_importances_
            for i, feature in enumerate(pred.feature_names):
                feature_importance.append({
                    'feature': feature,
                    'importance': float(importances[i])
                })
            
            # Sort by importance
            feature_importance.sort(key=lambda x: x['importance'], reverse=True)
        
        # Generate sample predictions for statistics
        sample_locations = [
            (37.7749, -122.4194),  # San Francisco
            (37.8044, -122.2712),  # Oakland
            (37.3382, -121.8863),  # San Jose
        ]
        
        sample_predictions = []
        current_time = datetime.now()
        
        for lat, lon in sample_locations:
            for hours in [3, 12, 24, 48, 72]:
                pred_time = current_time + timedelta(hours=hours)
                result = pred.predict_single(lat, lon, pred_time)
                sample_predictions.append(result)
        
        # Calculate statistics
        congestion_scores = [p['congestion_score'] for p in sample_predictions]
        
        # Peak hours analysis
        peak_hours = {}
        for p in sample_predictions:
            hour = datetime.fromisoformat(p['timestamp']).hour
            if hour not in peak_hours:
                peak_hours[hour] = []
            peak_hours[hour].append(p['congestion_score'])
        
        peak_analysis = [
            {
                'hour': hour,
                'avg_congestion': float(np.mean(scores))
            }
            for hour, scores in peak_hours.items()
        ]
        peak_analysis.sort(key=lambda x: x['avg_congestion'], reverse=True)
        
        return {
            "success": True,
            "data": {
                "feature_importance": feature_importance[:15],
                "statistics": {
                    "avg_congestion": round(float(np.mean(congestion_scores)), 3),
                    "max_congestion": round(float(np.max(congestion_scores)), 3),
                    "min_congestion": round(float(np.min(congestion_scores)), 3),
                    "std_congestion": round(float(np.std(congestion_scores)), 3)
                },
                "peak_hours": peak_analysis[:5],
                "risk_distribution": {
                    "low": sum(1 for p in sample_predictions if p['risk_level'] == 'low'),
                    "medium": sum(1 for p in sample_predictions if p['risk_level'] == 'medium'),
                    "high": sum(1 for p in sample_predictions if p['risk_level'] == 'high'),
                    "critical": sum(1 for p in sample_predictions if p['risk_level'] == 'critical')
                },
                "model_info": {
                    "features_count": len(pred.feature_names),
                    "model_type": "XGBoost Regressor"
                }
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
