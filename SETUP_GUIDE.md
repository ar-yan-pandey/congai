# CongestionAI Setup Guide

Complete step-by-step guide to get CongestionAI running on your machine.

## 📋 Prerequisites

- Python 3.9+ (for backend)
- Node.js 18+ (for frontend)
- pip (Python package manager)
- npm or yarn (Node package manager)

## 🚀 Quick Start

### Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
copy .env.example .env
# Edit .env and add your OpenWeatherMap API key (optional)

# Run data pipeline to generate synthetic data
python -m src.data_pipeline

# Train the model (this may take a few minutes)
python -m src.train_model

# Start the API server
uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

### Step 2: Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
copy .env.local.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔧 Detailed Configuration

### Backend Configuration

#### Environment Variables (`.env`)

```env
OPENWEATHER_API_KEY=your_api_key_here  # Optional: Get from openweathermap.org
MODEL_PATH=models/model.pkl
DATA_PATH=data/processed/train_ready.csv
ENVIRONMENT=development
LOG_LEVEL=INFO
```

#### Model Parameters (`configs/params.yaml`)

You can customize model parameters, H3 resolution, feature engineering settings, and more in this file.

### Frontend Configuration

#### Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=your_token_here  # Optional: For Mapbox tiles
```

## 📊 Using the Application

### 1. Map Dashboard (`/`)

- **Interactive Heatmap**: Visualize congestion predictions across the region
- **Time Slider**: Adjust forecast horizon from 3 to 72 hours
- **Click Markers**: View detailed risk analysis for any location
- **Real-time Updates**: Refresh data to get latest predictions

### 2. Route Simulator (`/routes`)

- **Enter Coordinates**: Start and end locations
- **Set Departure Time**: Choose when you plan to travel
- **Analyze Route**: Get congestion profile along the route
- **Optimization**: Find optimal departure time to avoid traffic

### 3. Insights Dashboard (`/insights`)

- **Feature Importance**: See which factors most affect predictions
- **Peak Hours**: Identify high-congestion time periods
- **Risk Distribution**: Overall traffic condition statistics
- **Model Info**: Technical details about the AI model

## 🧪 Testing the API

You can test the API endpoints directly:

```bash
# Health check
curl http://localhost:8000/health

# Single location forecast
curl -X POST http://localhost:8000/forecast \
  -H "Content-Type: application/json" \
  -d '{"latitude": 37.7749, "longitude": -122.4194}'

# Get insights
curl http://localhost:8000/insights
```

Or visit the interactive API documentation at `http://localhost:8000/docs`

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError`
- **Solution**: Make sure virtual environment is activated and dependencies are installed

**Problem**: `Model not found` error
- **Solution**: Run the training pipeline: `python -m src.train_model`

**Problem**: Port 8000 already in use
- **Solution**: Change port: `uvicorn src.api:app --port 8001`

### Frontend Issues

**Problem**: `Module not found` errors
- **Solution**: Delete `node_modules` and run `npm install` again

**Problem**: Map not loading
- **Solution**: This is normal on first load. The map uses dynamic imports to avoid SSR issues.

**Problem**: API connection failed
- **Solution**: Ensure backend is running and `NEXT_PUBLIC_API_URL` is correct in `.env.local`

### Data Issues

**Problem**: No predictions showing
- **Solution**: Make sure you ran the data pipeline and trained the model

**Problem**: Low model accuracy
- **Solution**: The synthetic data is for demonstration. Use real traffic data for production.

## 📦 Production Deployment

### Backend (Google Cloud Run / Render)

```bash
# Build Docker image
cd backend
docker build -t congestionai-backend .

# Run locally to test
docker run -p 8000:8000 congestionai-backend

# Deploy to your platform
# Follow platform-specific instructions
```

### Frontend (Vercel)

```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy --prod

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use environment variables for all sensitive data
- In production, restrict CORS origins in `backend/src/api.py`
- Use HTTPS for all production deployments
- Implement rate limiting for public APIs

## 📈 Performance Optimization

### Backend
- Use Redis for caching weather data
- Implement request batching for multiple predictions
- Use async/await for concurrent API calls
- Consider model quantization for faster inference

### Frontend
- Enable Next.js image optimization
- Implement virtual scrolling for large datasets
- Use React.memo for expensive components
- Lazy load charts and maps

## 🤝 Getting Help

- Check the main README.md for architecture details
- Review API documentation at `/docs` endpoint
- Examine example predictions in the Insights page
- Check browser console for frontend errors
- Check terminal logs for backend errors

## 🎯 Next Steps

1. **Customize the Model**: Adjust parameters in `configs/params.yaml`
2. **Add Real Data**: Replace synthetic data with actual traffic/weather data
3. **Enhance Features**: Add more data sources (events, road closures, etc.)
4. **Improve UI**: Customize colors, add more visualizations
5. **Deploy**: Push to production for real-world use

Happy predicting! 🚦
