# CongestionAI 🚦

An AI-powered platform that predicts traffic congestion 3–72 hours ahead for any location using machine learning and real-time data.

## 🎯 Features

- **Predictive Analytics**: XGBoost model predicts congestion scores 3-72 hours in advance
- **Interactive Map Dashboard**: Real-time heatmap visualization with H3 spatial indexing
- **Route Simulator**: Analyze route risk and get optimal departure time recommendations
- **Explainable AI**: SHAP values explain prediction factors
- **Smart Recommendations**: AI-driven action suggestions for traffic management

## 🏗️ Architecture

### Backend (FastAPI + Python)
- XGBoost regression model for congestion prediction
- SHAP explainability for feature importance
- H3 geospatial indexing (resolution 8)
- Real-time weather integration (OpenWeatherMap)
- RESTful API with FastAPI

### Frontend (Next.js 15 + React)
- Interactive map with React-Leaflet
- Real-time data visualization with Recharts
- Modern UI with TailwindCSS + shadcn/ui
- Responsive design for all devices

## 📦 Installation

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Run data pipeline
python -m src.data_pipeline

# Train model
python -m src.train_model

# Start API server
uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Development
npm run dev

# Production
npm run build
npm run start
```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env`:
```
OPENWEATHER_API_KEY=your_api_key_here
MODEL_PATH=models/model.pkl
DATA_PATH=data/processed/train_ready.csv
```

### Frontend Environment Variables

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

## 📊 API Endpoints

- `POST /forecast` - Get congestion prediction for a single location
- `POST /batch_forecast` - Get predictions for multiple locations
- `POST /route_simulate` - Simulate route risk and get recommendations
- `GET /insights` - Get global feature importance and statistics

## 🚀 Deployment

### Backend (Google Cloud Run / Render)
```bash
cd backend
docker build -t congestionai-backend .
# Deploy to your platform
```

### Frontend (Vercel)
```bash
cd frontend
vercel deploy --prod
```

## 🛠️ Tech Stack

**Backend:**
- FastAPI
- XGBoost
- SHAP
- H3 (Uber)
- Pandas, NumPy
- Scikit-learn

**Frontend:**
- Next.js 15
- React 18
- TailwindCSS
- shadcn/ui
- React-Leaflet
- Recharts
- Axios

## 📈 Model Performance

The XGBoost model is trained on historical data including:
- Traffic incidents and accidents
- Weather conditions (temperature, precipitation, visibility)
- Temporal features (hour, day, weekend, holidays)
- Spatial features (H3 cell encoding)
- Lag and rolling statistics

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 👨‍💻 Author

Built with ❤️ for smarter cities and better traffic management.
