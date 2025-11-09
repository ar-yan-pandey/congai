"""
Inference Engine for CongestionAI
Real-time prediction and weather integration
"""

import pickle
import pandas as pd
import numpy as np
import shap
import requests
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv

from .feature_engineering import FeatureEngineer

load_dotenv()

class CongestionPredictor:
    def __init__(self, model_path: str = "models/model.pkl"):
        """Initialize predictor with trained model"""
        self.model_path = Path(model_path)
        self.model = None
        self.feature_names = None
        self.config = None
        self.explainer = None
        self.feature_engineer = FeatureEngineer()
        
        # Weather API configuration
        self.weather_api_key = os.getenv('OPENWEATHER_API_KEY', '')
        self.weather_cache = {}
        self.cache_ttl = 3600  # 1 hour
        
        self.load_model()
    
    def load_model(self):
        """Load trained model from disk"""
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found at {self.model_path}")
        
        print(f"Loading model from {self.model_path}...")
        
        with open(self.model_path, 'rb') as f:
            model_data = pickle.load(f)
        
        self.model = model_data['model']
        self.feature_names = model_data['feature_names']
        self.config = model_data.get('config', {})
        
        # Skip SHAP explainer initialization (causes hanging with XGBoost 3.x)
        # Will calculate feature importance from model directly if needed
        self.explainer = None
        print("[INFO] SHAP explainer disabled for faster startup")
        
        print("[OK] Model loaded successfully!")
    
    def fetch_weather(self, lat: float, lon: float) -> Optional[Dict]:
        """Fetch weather data from OpenWeatherMap API"""
        if not self.weather_api_key:
            return None
        
        # Check cache
        cache_key = f"{lat:.2f},{lon:.2f}"
        if cache_key in self.weather_cache:
            cached_data, cached_time = self.weather_cache[cache_key]
            if (datetime.now() - cached_time).seconds < self.cache_ttl:
                return cached_data
        
        # Fetch from API
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.weather_api_key,
                'units': 'metric'
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            
            weather_data = response.json()
            
            # Cache the result
            self.weather_cache[cache_key] = (weather_data, datetime.now())
            
            return weather_data
        
        except Exception as e:
            print(f"Weather API error: {e}")
            return None
    
    def predict_single(
        self, 
        lat: float, 
        lon: float, 
        timestamp: datetime,
        weather_data: Optional[Dict] = None
    ) -> Dict:
        """
        Predict congestion for a single location and time
        """
        # Fetch weather if not provided
        if weather_data is None and self.weather_api_key:
            weather_data = self.fetch_weather(lat, lon)
        
        # Prepare features
        features_df = self.feature_engineer.prepare_inference_features(
            lat, lon, timestamp, weather_data
        )
        
        # Select only model features
        X = features_df[self.feature_names]
        
        # Predict
        congestion_score = float(self.model.predict(X)[0])
        congestion_score = np.clip(congestion_score, 0, 1)
        
        # Calculate SHAP values for explainability
        top_factors = []
        if self.explainer is not None:
            try:
                shap_values = self.explainer.shap_values(X)
                
                # Get top contributing factors
                feature_contributions = []
                for i, feature in enumerate(self.feature_names):
                    feature_contributions.append({
                        'feature': feature,
                        'value': float(X.iloc[0][feature]),
                        'shap_value': float(shap_values[0][i])
                    })
                
                # Sort by absolute SHAP value
                feature_contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)
                top_factors = feature_contributions[:5]
            except Exception as e:
                print(f"[WARNING] Could not calculate SHAP values: {e}")
                # Fallback: use feature importance from model
                top_factors = []
        
        # Determine risk level
        risk_level = self.get_risk_level(congestion_score)
        
        # Get human-readable factors
        readable_factors = self.feature_engineer.calculate_congestion_factors(
            features_df.iloc[0].to_dict()
        )
        
        # Generate recommendations
        recommendations = self.generate_recommendations(congestion_score, risk_level, readable_factors)
        
        # Calculate h3_cell for location info
        h3_cell = self.feature_engineer.encode_location(lat, lon)
        
        return {
            'congestion_score': round(congestion_score, 3),
            'risk_level': risk_level,
            'timestamp': timestamp.isoformat(),
            'location': {
                'latitude': lat,
                'longitude': lon,
                'h3_cell': h3_cell
            },
            'top_factors': readable_factors[:3],
            'shap_factors': [
                {
                    'feature': f['feature'],
                    'impact': round(f['shap_value'], 3)
                }
                for f in top_factors
            ],
            'recommendations': recommendations,
            'confidence': self.calculate_confidence(X)
        }
    
    def predict_batch(
        self, 
        locations: List[Tuple[float, float]], 
        timestamp: datetime
    ) -> List[Dict]:
        """
        Predict congestion for multiple locations (optimized batch processing)
        """
        predictions = []
        
        # Prepare all features at once
        all_features = []
        for lat, lon in locations:
            try:
                features_df = self.feature_engineer.prepare_inference_features(
                    lat, lon, timestamp, None
                )
                all_features.append((lat, lon, features_df))
            except Exception as e:
                print(f"Error preparing features for ({lat}, {lon}): {e}")
                predictions.append({
                    'error': str(e),
                    'location': {'latitude': lat, 'longitude': lon}
                })
        
        # Batch predict all at once
        if all_features:
            try:
                # Combine all features into one DataFrame
                X_batch = pd.concat([f[2][self.feature_names] for f in all_features], ignore_index=True)
                
                # Predict all at once
                scores = self.model.predict(X_batch)
                scores = np.clip(scores, 0, 1)
                
                # Create predictions for each location (optimized for speed)
                for i, (lat, lon, features_df) in enumerate(all_features):
                    congestion_score = float(scores[i])
                    risk_level = self.get_risk_level(congestion_score)
                    
                    # Minimal response for batch (skip expensive calculations)
                    predictions.append({
                        'congestion_score': round(congestion_score, 3),
                        'risk_level': risk_level,
                        'timestamp': timestamp.isoformat(),
                        'location': {
                            'latitude': lat,
                            'longitude': lon,
                        },
                        'top_factors': [],  # Skip for batch performance
                        'recommendations': [],  # Skip for batch performance
                        'confidence': 0.85
                    })
            except Exception as e:
                print(f"Batch prediction error: {e}")
                # Fallback to individual predictions
                for lat, lon, _ in all_features:
                    predictions.append({
                        'error': str(e),
                        'location': {'latitude': lat, 'longitude': lon}
                    })
        
        return predictions
    
    def predict_timeseries(
        self,
        lat: float,
        lon: float,
        start_time: datetime,
        hours_ahead: int = 72
    ) -> List[Dict]:
        """
        Predict congestion for multiple time points
        """
        predictions = []
        
        for hour in range(0, hours_ahead + 1, 3):  # Every 3 hours
            timestamp = start_time + timedelta(hours=hour)
            pred = self.predict_single(lat, lon, timestamp)
            pred['hours_ahead'] = hour
            predictions.append(pred)
        
        return predictions
    
    def get_risk_level(self, congestion_score: float) -> str:
        """Determine risk level from congestion score"""
        thresholds = self.config.get('prediction', {}).get('risk_thresholds', {
            'low': 0.3,
            'medium': 0.6,
            'high': 0.8,
            'critical': 0.9
        })
        
        if congestion_score >= thresholds['critical']:
            return 'critical'
        elif congestion_score >= thresholds['high']:
            return 'high'
        elif congestion_score >= thresholds['medium']:
            return 'medium'
        else:
            return 'low'
    
    def calculate_confidence(self, X: pd.DataFrame) -> float:
        """Calculate prediction confidence (simplified)"""
        # In production, use proper uncertainty quantification
        # For now, return a fixed high confidence
        return 0.85
    
    def generate_recommendations(
        self, 
        congestion_score: float, 
        risk_level: str,
        factors: List[Dict]
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if risk_level == 'critical':
            recommendations.append("⚠️ Avoid this route if possible - severe congestion expected")
            recommendations.append("🚨 Consider alternative transportation methods")
            recommendations.append("📢 Enable traffic advisories for this area")
        elif risk_level == 'high':
            recommendations.append("⏰ Delay departure by 1-2 hours if possible")
            recommendations.append("🚗 Pre-position emergency vehicles in nearby areas")
            recommendations.append("📱 Enable real-time traffic monitoring")
        elif risk_level == 'medium':
            recommendations.append("⚡ Allow extra travel time (15-30 minutes)")
            recommendations.append("🗺️ Check alternative routes before departure")
        else:
            recommendations.append("✅ Normal traffic conditions expected")
            recommendations.append("🚀 Good time for travel")
        
        # Add weather-specific recommendations
        for factor in factors:
            if 'Precipitation' in factor['factor']:
                recommendations.append("☔ Drive carefully - wet road conditions")
            elif 'Visibility' in factor['factor']:
                recommendations.append("🌫️ Use fog lights and reduce speed")
            elif 'Freezing' in factor['factor']:
                recommendations.append("❄️ Watch for ice - reduce speed significantly")
        
        return recommendations[:5]  # Return top 5


if __name__ == "__main__":
    # Test inference
    predictor = CongestionPredictor()
    
    # Test prediction
    result = predictor.predict_single(
        lat=37.7749,
        lon=-122.4194,
        timestamp=datetime.now() + timedelta(hours=6)
    )
    
    print("\n=== Test Prediction ===")
    print(f"Congestion Score: {result['congestion_score']}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Top Factors: {result['top_factors']}")
    print(f"Recommendations: {result['recommendations']}")
