"""
Data Pipeline for CongestionAI
Loads historical data, processes features, and prepares training dataset
"""

import pandas as pd
import numpy as np
import h3
import yaml
import os
from pathlib import Path
from datetime import datetime, timedelta
import holidays
from typing import Tuple, List

class DataPipeline:
    def __init__(self, config_path: str = "configs/params.yaml"):
        """Initialize data pipeline with configuration"""
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.raw_path = Path(self.config['data']['raw_path'])
        self.processed_path = Path(self.config['data']['processed_path'])
        self.h3_resolution = self.config['spatial']['h3_resolution']
        
        # Create directories if they don't exist
        self.raw_path.mkdir(parents=True, exist_ok=True)
        self.processed_path.mkdir(parents=True, exist_ok=True)
        
        # US holidays
        self.us_holidays = holidays.US()
    
    def generate_synthetic_data(self, n_samples: int = 50000) -> pd.DataFrame:
        """
        Generate synthetic traffic data for demonstration
        In production, replace with real data sources
        """
        print(f"Generating {n_samples} synthetic data samples...")
        
        np.random.seed(42)
        
        # Time range: last 6 months
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
        
        timestamps = pd.date_range(start=start_date, end=end_date, periods=n_samples)
        
        # Geographic bounds (San Francisco Bay Area example)
        lat_min, lat_max = 37.3, 38.0
        lon_min, lon_max = -122.5, -121.8
        
        data = {
            'timestamp': timestamps,
            'latitude': np.random.uniform(lat_min, lat_max, n_samples),
            'longitude': np.random.uniform(lon_min, lon_max, n_samples),
            'incident_count': np.random.poisson(2, n_samples),
            'temperature': np.random.normal(18, 8, n_samples),  # Celsius
            'precipitation': np.random.exponential(2, n_samples),  # mm
            'visibility': np.random.uniform(5, 15, n_samples),  # km
            'wind_speed': np.random.exponential(10, n_samples),  # km/h
            'humidity': np.random.uniform(40, 90, n_samples),  # %
        }
        
        df = pd.DataFrame(data)
        
        # Calculate congestion score (target variable)
        # Higher incidents, bad weather, peak hours → higher congestion
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        # Base congestion from incidents
        congestion = df['incident_count'] * 0.15
        
        # Peak hours effect (7-9 AM, 5-7 PM)
        peak_morning = ((df['hour'] >= 7) & (df['hour'] <= 9)).astype(int) * 0.3
        peak_evening = ((df['hour'] >= 17) & (df['hour'] <= 19)).astype(int) * 0.35
        congestion += peak_morning + peak_evening
        
        # Weekday effect
        congestion += (df['day_of_week'] < 5).astype(int) * 0.1
        
        # Weather effects
        congestion += (df['precipitation'] > 5) * 0.2  # Heavy rain
        congestion += (df['visibility'] < 8) * 0.15  # Low visibility
        congestion += (df['temperature'] < 0) * 0.1  # Freezing
        
        # Add noise and normalize to 0-1
        congestion += np.random.normal(0, 0.05, n_samples)
        df['congestion_score'] = np.clip(congestion, 0, 1)
        
        return df
    
    def encode_h3(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode latitude/longitude to H3 hexagonal cells"""
        print("Encoding geographic coordinates with H3...")
        
        df['h3_cell'] = df.apply(
            lambda row: h3.latlng_to_cell(row['latitude'], row['longitude'], self.h3_resolution),
            axis=1
        )
        
        return df
    
    def add_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add temporal features"""
        print("Adding time features...")
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['day_of_month'] = df['timestamp'].dt.day
        df['month'] = df['timestamp'].dt.month
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        df['is_holiday'] = df['timestamp'].dt.date.apply(lambda x: int(x in self.us_holidays))
        
        # Cyclical encoding for hour
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        
        # Cyclical encoding for day of week
        df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        
        return df
    
    def add_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add lag features for time series"""
        print("Adding lag features...")
        
        df = df.sort_values('timestamp')
        
        # Group by H3 cell for spatial consistency
        for window in self.config['features']['lag_features']['windows']:
            df[f'incident_lag_{window}h'] = df.groupby('h3_cell')['incident_count'].shift(window)
            df[f'congestion_lag_{window}h'] = df.groupby('h3_cell')['congestion_score'].shift(window)
        
        return df
    
    def add_rolling_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add rolling window statistics"""
        print("Adding rolling features...")
        
        df = df.sort_values('timestamp')
        
        for window in self.config['features']['rolling_features']['windows']:
            df[f'incident_rolling_mean_{window}h'] = df.groupby('h3_cell')['incident_count'].transform(
                lambda x: x.rolling(window=window, min_periods=1).mean()
            )
            df[f'incident_rolling_std_{window}h'] = df.groupby('h3_cell')['incident_count'].transform(
                lambda x: x.rolling(window=window, min_periods=1).std()
            )
        
        return df
    
    def process_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Complete data processing pipeline"""
        print("Starting data processing pipeline...")
        
        # Encode spatial features
        df = self.encode_h3(df)
        
        # Add time features
        df = self.add_time_features(df)
        
        # Add lag features
        df = self.add_lag_features(df)
        
        # Add rolling features
        df = self.add_rolling_features(df)
        
        # Fill NaN values from lag/rolling features
        df = df.fillna(0)
        
        print(f"Processing complete. Final shape: {df.shape}")
        return df
    
    def save_processed_data(self, df: pd.DataFrame):
        """Save processed data to CSV"""
        output_path = self.processed_path / self.config['data']['train_file']
        df.to_csv(output_path, index=False)
        print(f"Saved processed data to {output_path}")
        
        # Print summary statistics
        print("\n=== Data Summary ===")
        print(f"Total samples: {len(df)}")
        print(f"Unique H3 cells: {df['h3_cell'].nunique()}")
        print(f"Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
        print(f"\nCongestion score distribution:")
        print(df['congestion_score'].describe())
    
    def run(self):
        """Execute the complete pipeline"""
        print("=" * 60)
        print("CongestionAI Data Pipeline")
        print("=" * 60)
        
        # Generate or load data
        df = self.generate_synthetic_data(n_samples=50000)
        
        # Process data
        df = self.process_data(df)
        
        # Save processed data
        self.save_processed_data(df)
        
        print("\n[OK] Data pipeline completed successfully!")
        return df


if __name__ == "__main__":
    pipeline = DataPipeline()
    pipeline.run()
