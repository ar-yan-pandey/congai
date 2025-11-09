# CongestionAI Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│                     (Browser - Port 3000)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/REST
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      FRONTEND LAYER                              │
│                      (Next.js 15)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Map Dashboard│  │Route Simulator│  │   Insights   │          │
│  │   (index.js) │  │  (routes.js)  │  │(insights.js) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │           React Components                        │           │
│  │  • MapView (Leaflet)  • RiskPanel                │           │
│  │  • Navbar             • Footer                   │           │
│  │  • Charts (Recharts)  • UI (shadcn)              │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │           API Client (Axios)                      │           │
│  │  • congestionAPI.forecastSingle()                │           │
│  │  • congestionAPI.forecastBatch()                 │           │
│  │  • congestionAPI.simulateRoute()                 │           │
│  │  • congestionAPI.getInsights()                   │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API Calls
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      BACKEND LAYER                               │
│                   (FastAPI - Port 8000)                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │              API Endpoints                        │           │
│  │  POST /forecast         - Single prediction      │           │
│  │  POST /batch_forecast   - Multiple predictions   │           │
│  │  POST /route_simulate   - Route analysis         │           │
│  │  POST /timeseries       - Time series forecast   │           │
│  │  GET  /insights         - Global statistics      │           │
│  │  GET  /health           - Health check           │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │         Inference Engine (infer.py)               │           │
│  │  • CongestionPredictor class                     │           │
│  │  • predict_single()                              │           │
│  │  • predict_batch()                               │           │
│  │  • predict_timeseries()                          │           │
│  │  • SHAP explainer integration                    │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │      Feature Engineering (feature_engineering.py)│           │
│  │  • Time features (hour, day, cyclical)          │           │
│  │  • Weather features (temp, rain, visibility)    │           │
│  │  • Spatial features (H3 encoding)               │           │
│  │  • Historical features (lag, rolling)           │           │
│  └──────────────────────────────────────────────────┘           │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────┐           │
│  │         ML Model (XGBoost)                        │           │
│  │  • Trained model (model.pkl)                     │           │
│  │  • 37+ input features                            │           │
│  │  • Congestion score output (0-1)                │           │
│  │  • SHAP TreeExplainer                            │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ External API Calls
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  ┌──────────────────────────────────────────────────┐           │
│  │  OpenWeatherMap API                               │           │
│  │  • Real-time weather data                        │           │
│  │  • Temperature, precipitation, visibility        │           │
│  │  • Cached for 1 hour                             │           │
│  └──────────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Training Pipeline

```
┌─────────────┐
│  Raw Data   │
│  (CSV/API)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Data Pipeline      │
│  (data_pipeline.py) │
│  • Load data        │
│  • H3 encoding      │
│  • Time features    │
│  • Lag features     │
│  • Rolling stats    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Processed Data     │
│  (train_ready.csv)  │
│  50,000 samples     │
│  37+ features       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Model Training     │
│  (train_model.py)   │
│  • XGBoost          │
│  • SHAP analysis    │
│  • Evaluation       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Trained Model      │
│  (model.pkl)        │
│  + Feature names    │
│  + Config           │
└─────────────────────┘
```

### 2. Prediction Pipeline

```
┌─────────────────┐
│  User Request   │
│  (lat, lon,     │
│   timestamp)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Feature Engineering    │
│  • Time features        │
│  • Weather API call     │
│  • H3 encoding          │
│  • Historical lookup    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Model Prediction       │
│  • XGBoost inference    │
│  • Congestion score     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  SHAP Explanation       │
│  • Feature impacts      │
│  • Top contributors     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Post-processing        │
│  • Risk level           │
│  • Recommendations      │
│  • Confidence score     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  JSON Response          │
│  • Congestion score     │
│  • Risk level           │
│  • Top factors          │
│  • Recommendations      │
└─────────────────────────┘
```

## Component Interactions

### Map Dashboard Flow

```
User adjusts time slider (3-72h)
         │
         ▼
Generate grid of locations (15x15)
         │
         ▼
Call /batch_forecast API
         │
         ▼
Backend predicts all locations
         │
         ▼
Return predictions array
         │
         ▼
Render colored markers on map
         │
         ▼
User clicks marker
         │
         ▼
Show RiskPanel with details
```

### Route Simulator Flow

```
User enters start/end coordinates
         │
         ▼
Generate 10 waypoints along route
         │
         ▼
Call /route_simulate API
         │
         ▼
Backend predicts each waypoint
         │
         ▼
Calculate average/max congestion
         │
         ▼
Test ±3 hour departure times
         │
         ▼
Find optimal departure
         │
         ▼
Return route analysis + optimization
         │
         ▼
Display charts and recommendations
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  • Next.js 15 (React 18)                                │
│  • TailwindCSS (styling)                                │
│  • shadcn/ui (components)                               │
│  • React-Leaflet (maps)                                 │
│  • Recharts (visualizations)                            │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│  • FastAPI (web framework)                              │
│  • Pydantic (validation)                                │
│  • Uvicorn (ASGI server)                                │
│  • CORS middleware                                       │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC LAYER                  │
│  • Inference engine                                      │
│  • Feature engineering                                   │
│  • Recommendation engine                                 │
│  • Weather integration                                   │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                    DATA/MODEL LAYER                      │
│  • XGBoost model                                         │
│  • SHAP explainer                                        │
│  • H3 spatial indexing                                   │
│  • Pandas/NumPy processing                              │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────┐
│                         USERS                             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                    CDN / Edge Network                     │
│                    (Vercel Edge)                          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│                  Frontend (Vercel)                        │
│  • Next.js static pages                                   │
│  • Server-side rendering                                  │
│  • API routes                                             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│            Backend (Google Cloud Run / Render)            │
│  • FastAPI container                                      │
│  • Auto-scaling                                           │
│  • Load balancing                                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ├──────────────┬──────────────┐
                     │              │              │
                     ▼              ▼              ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ Model Storage│  │Weather API   │  │  Database    │
         │ (Cloud       │  │(OpenWeather) │  │  (Optional)  │
         │  Storage)    │  │              │  │              │
         └──────────────┘  └──────────────┘  └──────────────┘
```

## Security Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Security Layers                        │
│                                                           │
│  1. HTTPS/TLS Encryption                                 │
│     • All traffic encrypted                              │
│     • SSL certificates                                   │
│                                                           │
│  2. CORS Policy                                          │
│     • Restrict origins                                   │
│     • Allowed methods                                    │
│                                                           │
│  3. Input Validation                                     │
│     • Pydantic models                                    │
│     • Type checking                                      │
│     • Range validation                                   │
│                                                           │
│  4. Rate Limiting (Future)                               │
│     • Per-IP limits                                      │
│     • API key quotas                                     │
│                                                           │
│  5. Environment Variables                                │
│     • API keys secured                                   │
│     • No hardcoded secrets                               │
│                                                           │
│  6. Error Handling                                       │
│     • No sensitive data in errors                        │
│     • Proper logging                                     │
└──────────────────────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling
- **Frontend**: Vercel auto-scales globally
- **Backend**: Container orchestration (Kubernetes)
- **Load Balancing**: Distribute requests across instances

### Caching Strategy
```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Redis Cache │ ◄── Cache weather data (1h TTL)
└──────┬──────┘     Cache predictions (15min TTL)
       │            Cache insights (1h TTL)
       │
       │ Cache Miss
       ▼
┌─────────────┐
│   Backend   │
│  Processing │
└─────────────┘
```

### Database Integration (Future)
```
┌──────────────────┐
│   PostgreSQL     │
│                  │
│  • User data     │
│  • Predictions   │
│  • Analytics     │
│  • Audit logs    │
└──────────────────┘
```

## Monitoring & Observability

```
┌──────────────────────────────────────────────────────────┐
│                    Monitoring Stack                       │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Prometheus │  │  Grafana   │  │    ELK     │        │
│  │  (Metrics) │  │(Dashboards)│  │   (Logs)   │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                           │
│  Metrics:                                                 │
│  • Request rate                                          │
│  • Response time                                         │
│  • Error rate                                            │
│  • Model inference time                                  │
│  • Cache hit rate                                        │
│                                                           │
│  Logs:                                                   │
│  • API requests                                          │
│  • Errors & exceptions                                   │
│  • Model predictions                                     │
│  • User actions                                          │
└──────────────────────────────────────────────────────────┘
```

## Performance Optimization

### Frontend
- Code splitting (Next.js automatic)
- Image optimization
- Lazy loading components
- Memoization (React.memo)
- Virtual scrolling for large lists

### Backend
- Async/await for I/O operations
- Connection pooling
- Model caching in memory
- Batch prediction optimization
- Response compression (gzip)

### Model
- Model quantization (reduce size)
- ONNX runtime (faster inference)
- GPU acceleration (if available)
- Feature caching

---

**This architecture is designed for scalability, maintainability, and performance.**
