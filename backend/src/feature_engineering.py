"""
Feature Engineering utilities for CongestionAI
"""

import pandas as pd
import numpy as np
import h3
from datetime import datetime, timedelta
import holidays
from typing import Dict, List, Tuple

class FeatureEngineer:
    def __init__(self, h3_resolution: int = 8):
        """Initialize feature engineer"""
        self.h3_resolution = h3_resolution
        self.us_holidays = holidays.US()
    
    def create_time_features(self, timestamp: datetime) -> Dict:
        """Create time-based features from timestamp"""
        features = {
            'hour': timestamp.hour,
            'day_of_week': timestamp.weekday(),
            'day_of_month': timestamp.day,
            'month': timestamp.month,
            'is_weekend': int(timestamp.weekday() >= 5),
            'is_holiday': int(timestamp.date() in self.us_holidays),
            'hour_sin': np.sin(2 * np.pi * timestamp.hour / 24),
            'hour_cos': np.cos(2 * np.pi * timestamp.hour / 24),
            'dow_sin': np.sin(2 * np.pi * timestamp.weekday() / 7),
            'dow_cos': np.cos(2 * np.pi * timestamp.weekday() / 7),
        }
        return features
    
    def encode_location(self, lat: float, lon: float) -> str:
        """Encode lat/lon to H3 cell"""
        return h3.latlng_to_cell(lat, lon, self.h3_resolution)
    
    def decode_h3(self, h3_cell: str) -> Tuple[float, float]:
        """Decode H3 cell to lat/lon"""
        lat, lon = h3.cell_to_latlng(h3_cell)
        return lat, lon
    
    def get_neighboring_cells(self, h3_cell: str, k: int = 1) -> List[str]:
        """Get neighboring H3 cells"""
        return list(h3.grid_disk(h3_cell, k))
    
    def create_weather_features(self, weather_data: Dict) -> Dict:
        """Extract and normalize weather features"""
        features = {
            'temperature': weather_data.get('temp', 20),
            'precipitation': weather_data.get('rain', {}).get('1h', 0),
            'visibility': weather_data.get('visibility', 10000) / 1000,  # Convert to km
            'wind_speed': weather_data.get('wind', {}).get('speed', 0) * 3.6,  # m/s to km/h
            'humidity': weather_data.get('humidity', 50),
        }
        return features
    
    def calculate_congestion_factors(self, features: Dict) -> List[Dict]:
        """
        Analyze features and return top contributing factors
        """
        factors = []
        
        # Check time-based factors
        hour = features.get('hour', 0)
        if 7 <= hour <= 9:
            factors.append({
                'factor': 'Morning Rush Hour',
                'impact': 0.3,
                'icon': '🌅'
            })
        elif 17 <= hour <= 19:
            factors.append({
                'factor': 'Evening Rush Hour',
                'impact': 0.35,
                'icon': '🌆'
            })
        
        # Check weather factors
        if features.get('precipitation', 0) > 5:
            factors.append({
                'factor': 'Heavy Precipitation',
                'impact': 0.2,
                'icon': '🌧️'
            })
        
        if features.get('visibility', 10) < 8:
            factors.append({
                'factor': 'Low Visibility',
                'impact': 0.15,
                'icon': '🌫️'
            })
        
        if features.get('temperature', 20) < 0:
            factors.append({
                'factor': 'Freezing Temperature',
                'impact': 0.1,
                'icon': '❄️'
            })
        
        # Check day factors
        if features.get('is_weekend', 0) == 0:
            factors.append({
                'factor': 'Weekday Traffic',
                'impact': 0.1,
                'icon': '📅'
            })
        
        if features.get('is_holiday', 0) == 1:
            factors.append({
                'factor': 'Holiday Period',
                'impact': 0.15,
                'icon': '🎉'
            })
        
        # Sort by impact and return top factors
        factors.sort(key=lambda x: x['impact'], reverse=True)
        return factors[:5]
    
    def prepare_inference_features(
        self, 
        lat: float, 
        lon: float, 
        timestamp: datetime,
        weather_data: Dict = None,
        historical_data: Dict = None
    ) -> pd.DataFrame:
        """
        Prepare features for model inference
        """
        # Basic features
        features = {
            'latitude': lat,
            'longitude': lon,
            'timestamp': timestamp,
        }
        
        # H3 encoding (for reference, not used as model feature)
        # features['h3_cell'] = self.encode_location(lat, lon)
        
        # Time features
        time_features = self.create_time_features(timestamp)
        features.update(time_features)
        
        # Weather features
        if weather_data:
            weather_features = self.create_weather_features(weather_data)
            features.update(weather_features)
        else:
            # Default weather values
            features.update({
                'temperature': 20,
                'precipitation': 0,
                'visibility': 10,
                'wind_speed': 10,
                'humidity': 50,
            })
        
        # Historical features (lag and rolling)
        if historical_data:
            features.update(historical_data)
        else:
            # Default historical values
            for window in [1, 3, 6, 12, 24]:
                features[f'incident_lag_{window}h'] = 0
                features[f'congestion_lag_{window}h'] = 0
            
            for window in [3, 6, 12, 24]:
                features[f'incident_rolling_mean_{window}h'] = 0
                features[f'incident_rolling_std_{window}h'] = 0
        
        # Convert to DataFrame
        df = pd.DataFrame([features])
        
        return df
    
    def get_feature_names(self) -> List[str]:
        """Return list of all feature names used in model"""
        feature_names = [
            'latitude', 'longitude',
            'hour', 'day_of_week', 'day_of_month', 'month',
            'is_weekend', 'is_holiday',
            'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos',
            'temperature', 'precipitation', 'visibility', 'wind_speed', 'humidity',
        ]
        
        # Add lag features
        for window in [1, 3, 6, 12, 24]:
            feature_names.append(f'incident_lag_{window}h')
            feature_names.append(f'congestion_lag_{window}h')
        
        # Add rolling features
        for window in [3, 6, 12, 24]:
            feature_names.append(f'incident_rolling_mean_{window}h')
            feature_names.append(f'incident_rolling_std_{window}h')
        
        return feature_names
