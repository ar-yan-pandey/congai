# 🚀 CongestionAI Quick Start

Get up and running in 5 minutes!

## Windows Users (Easiest Method)

### Step 1: Start Backend
Double-click `start-backend.bat`

This will:
- Create a virtual environment
- Install Python dependencies
- Generate synthetic data
- Train the ML model
- Start the API server at http://localhost:8000

**First run takes 3-5 minutes for model training.**

### Step 2: Start Frontend
Double-click `start-frontend.bat`

This will:
- Install Node.js dependencies
- Create environment file
- Start the Next.js app at http://localhost:3000

### Step 3: Open Browser
Navigate to http://localhost:3000

## Manual Setup (All Platforms)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m src.data_pipeline
python -m src.train_model
uvicorn src.api:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## What You'll See

### 1. Map Dashboard (Home)
- Interactive traffic heatmap
- Time slider (3-72 hours ahead)
- Click any marker for detailed analysis
- Color-coded risk levels

### 2. Route Simulator
- Enter start/end coordinates
- Get route congestion profile
- Find optimal departure time
- View waypoint analysis

### 3. Insights Dashboard
- Feature importance charts
- Peak hour analysis
- Risk distribution
- Model statistics

## Sample Locations (San Francisco Bay Area)

Use these coordinates to test:

- **San Francisco**: 37.7749, -122.4194
- **Oakland**: 37.8044, -122.2712
- **San Jose**: 37.3382, -121.8863

## API Testing

Visit http://localhost:8000/docs for interactive API documentation.

## Troubleshooting

**Backend won't start?**
- Ensure Python 3.9+ is installed: `python --version`
- Check if port 8000 is available

**Frontend won't start?**
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and run `npm install` again

**No predictions showing?**
- Wait for model training to complete (first run only)
- Check backend terminal for errors
- Ensure `.env.local` has correct API URL

## Next Steps

1. ✅ Explore the map dashboard
2. ✅ Try the route simulator
3. ✅ Check insights page
4. 📖 Read SETUP_GUIDE.md for detailed configuration
5. 📖 Read API_DOCUMENTATION.md for API details
6. 🚀 Customize and deploy!

## Need Help?

- Check SETUP_GUIDE.md for detailed troubleshooting
- Review API_DOCUMENTATION.md for API reference
- Examine terminal logs for error messages

---

**Enjoy predicting traffic! 🚦**
