"""
Convenience script to run the complete backend pipeline
"""

import sys
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}\n")
    
    try:
        result = subprocess.run(cmd, shell=True, check=True, text=True)
        print(f"✅ {description} completed successfully!\n")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error during {description}")
        print(f"Error: {e}\n")
        return False

def main():
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║          CongestionAI Backend Setup & Run                ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # Check if model exists
    model_path = Path("models/model.pkl")
    data_path = Path("data/processed/train_ready.csv")
    
    if not data_path.exists():
        print("📊 No processed data found. Running data pipeline...")
        if not run_command("python -m src.data_pipeline", "Data Pipeline"):
            sys.exit(1)
    else:
        print("✅ Processed data found, skipping data pipeline")
    
    if not model_path.exists():
        print("\n🤖 No trained model found. Training model...")
        if not run_command("python -m src.train_model", "Model Training"):
            sys.exit(1)
    else:
        print("✅ Trained model found, skipping training")
    
    print("\n🌐 Starting API server...")
    print("API will be available at: http://localhost:8000")
    print("API docs available at: http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server\n")
    
    try:
        subprocess.run("uvicorn src.api:app --reload --host 0.0.0.0 --port 8000", shell=True)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped. Goodbye!")

if __name__ == "__main__":
    main()
