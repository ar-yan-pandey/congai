"""
Model Training for CongestionAI
Train XGBoost model with SHAP explainability
"""

import pandas as pd
import numpy as np
import pickle
import yaml
import shap
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor

# Try to import matplotlib, but continue without it if not available
try:
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    print("Warning: matplotlib not available. SHAP plots will be skipped.")

class ModelTrainer:
    def __init__(self, config_path: str = "configs/params.yaml"):
        """Initialize model trainer"""
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.model = None
        self.feature_names = None
        self.shap_values = None
        self.explainer = None
        
        # Create models directory
        Path("models").mkdir(exist_ok=True)
    
    def load_data(self) -> pd.DataFrame:
        """Load processed training data"""
        data_path = Path(self.config['data']['processed_path']) / self.config['data']['train_file']
        print(f"Loading data from {data_path}...")
        
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} samples")
        
        return df
    
    def prepare_features(self, df: pd.DataFrame):
        """Prepare features and target for training"""
        print("Preparing features and target...")
        
        # Define feature columns (exclude target and metadata)
        exclude_cols = ['congestion_score', 'timestamp', 'h3_cell', 'incident_count']
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        X = df[feature_cols]
        y = df['congestion_score']
        
        self.feature_names = feature_cols
        
        print(f"Features: {len(feature_cols)}")
        print(f"Target: congestion_score")
        
        return X, y
    
    def train_model(self, X_train, y_train, X_val, y_val):
        """Train XGBoost model"""
        print("\nTraining XGBoost model...")
        
        model_params = self.config['model']['params']
        
        self.model = XGBRegressor(**model_params)
        
        # Train with early stopping
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=50
        )
        
        print("[OK] Model training completed!")
        
        return self.model
    
    def evaluate_model(self, X_test, y_test):
        """Evaluate model performance"""
        print("\n=== Model Evaluation ===")
        
        y_pred = self.model.predict(X_test)
        
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"RMSE: {rmse:.4f}")
        print(f"MAE: {mae:.4f}")
        print(f"R² Score: {r2:.4f}")
        
        # Calculate accuracy within thresholds
        errors = np.abs(y_test - y_pred)
        acc_10 = (errors < 0.1).mean() * 100
        acc_20 = (errors < 0.2).mean() * 100
        
        print(f"Accuracy within ±0.1: {acc_10:.2f}%")
        print(f"Accuracy within ±0.2: {acc_20:.2f}%")
        
        return {
            'rmse': rmse,
            'mae': mae,
            'r2': r2,
            'acc_10': acc_10,
            'acc_20': acc_20
        }
    
    def analyze_feature_importance(self, X_sample):
        """Analyze feature importance using SHAP"""
        print("\n=== Feature Importance Analysis ===")
        
        # XGBoost built-in feature importance
        importance = self.model.feature_importances_
        feature_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Features (XGBoost):")
        print(feature_importance.head(10).to_string(index=False))
        
        # SHAP analysis
        print("\nCalculating SHAP values...")
        self.explainer = shap.TreeExplainer(self.model)
        self.shap_values = self.explainer.shap_values(X_sample)
        
        # Calculate mean absolute SHAP values
        shap_importance = pd.DataFrame({
            'feature': self.feature_names,
            'shap_importance': np.abs(self.shap_values).mean(axis=0)
        }).sort_values('shap_importance', ascending=False)
        
        print("\nTop 10 Features (SHAP):")
        print(shap_importance.head(10).to_string(index=False))
        
        return feature_importance, shap_importance
    
    def save_model(self):
        """Save trained model and metadata"""
        model_path = Path(self.config['model']['save_path'])
        
        model_data = {
            'model': self.model,
            'feature_names': self.feature_names,
            'config': self.config
        }
        
        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"\n[OK] Model saved to {model_path}")
    
    def save_shap_plots(self, X_sample):
        """Save SHAP visualization plots"""
        if not MATPLOTLIB_AVAILABLE:
            print("\n[WARNING] Skipping SHAP plots (matplotlib not installed)")
            return
        
        print("\nGenerating SHAP plots...")
        
        plots_dir = Path("models/plots")
        plots_dir.mkdir(exist_ok=True)
        
        try:
            # Summary plot
            plt.figure(figsize=(10, 8))
            shap.summary_plot(self.shap_values, X_sample, feature_names=self.feature_names, show=False)
            plt.tight_layout()
            plt.savefig(plots_dir / "shap_summary.png", dpi=150, bbox_inches='tight')
            plt.close()
            
            # Bar plot
            plt.figure(figsize=(10, 8))
            shap.summary_plot(self.shap_values, X_sample, feature_names=self.feature_names, 
                             plot_type="bar", show=False)
            plt.tight_layout()
            plt.savefig(plots_dir / "shap_bar.png", dpi=150, bbox_inches='tight')
            plt.close()
            
            print(f"[OK] SHAP plots saved to {plots_dir}")
        except Exception as e:
            print(f"[WARNING] Could not save SHAP plots: {e}")
    
    def run(self):
        """Execute complete training pipeline"""
        print("=" * 60)
        print("CongestionAI Model Training")
        print("=" * 60)
        
        # Load data
        df = self.load_data()
        
        # Prepare features
        X, y = self.prepare_features(df)
        
        # Split data
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y, test_size=0.15, random_state=42
        )
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=0.15, random_state=42
        )
        
        print(f"\nTrain set: {len(X_train)} samples")
        print(f"Validation set: {len(X_val)} samples")
        print(f"Test set: {len(X_test)} samples")
        
        # Train model
        self.train_model(X_train, y_train, X_val, y_val)
        
        # Evaluate model
        metrics = self.evaluate_model(X_test, y_test)
        
        # Analyze feature importance
        X_sample = X_test.sample(min(1000, len(X_test)), random_state=42)
        feature_importance, shap_importance = self.analyze_feature_importance(X_sample)
        
        # Save SHAP plots
        self.save_shap_plots(X_sample)
        
        # Save model
        self.save_model()
        
        print("\n" + "=" * 60)
        print("[OK] Model training completed successfully!")
        print("=" * 60)
        
        return self.model, metrics


if __name__ == "__main__":
    trainer = ModelTrainer()
    trainer.run()
