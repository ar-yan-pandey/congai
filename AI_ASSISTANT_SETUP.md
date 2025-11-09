# AI Assistant Setup Guide

## Overview
The AI Assistant feature provides an interactive 3D avatar that can answer traffic-related questions using Gemini 2.0 Flash AI.

## Features
- **3D Avatar**: Interactive 3D model that greets users
- **Natural Language Processing**: Powered by Gemini 2.0 Flash
- **Traffic Intelligence**: Answers questions about routes, travel times, and traffic conditions
- **Route Planning**: Can calculate optimal departure times based on traffic predictions

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

This will install:
- `@google/generative-ai` - Gemini AI SDK
- `@react-three/fiber` - React renderer for Three.js
- `@react-three/drei` - Useful helpers for React Three Fiber
- `three` - 3D graphics library

### 2. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

### 3. Configure Environment Variables
1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

### 4. Start the Development Server
```bash
npm run dev
```

## Usage

### Opening the AI Assistant
1. Click the floating AI avatar button at the bottom right of the map
2. The assistant panel will slide in from the right
3. The 3D avatar will appear and greet you

### Example Questions

**Route Planning:**
- "I want to reach Cyber City from Sector 18 Gurgaon before 3 PM tomorrow. What time should I leave?"
- "What's the best time to travel from Connaught Place to Noida Sector 62?"
- "How long will it take to get from Mumbai Central to Bandra during rush hour?"

**Traffic Conditions:**
- "What's the traffic like in Bangalore right now?"
- "Is there congestion on the Delhi-Gurgaon expressway?"
- "Show me traffic conditions near San Francisco Downtown"

**General Questions:**
- "What factors affect traffic congestion?"
- "How accurate are your predictions?"
- "What areas do you cover?"

### How It Works

1. **User Input**: You type a question in natural language
2. **AI Processing**: Gemini 2.0 Flash analyzes your question
3. **Data Fetching**: If needed, the system fetches real-time traffic predictions
4. **Response Generation**: AI generates a human-like, conversational response
5. **Visualization**: If route data is involved, it can be visualized on the map

## Technical Details

### Components

**AIAssistant.jsx**
- Main component with 3D avatar and chat interface
- Handles user input and displays messages
- Manages 3D model rendering with Three.js

**API Route: /api/ai-assistant.js**
- Processes user messages with Gemini 2.0 Flash
- Extracts route information from queries
- Fetches traffic predictions when needed
- Returns natural language responses

### 3D Models
Located in `frontend/public/models/`:
- `test4.glb` - Main avatar model (currently used)
- `animations.glb` - Avatar with animations
- `rpm.fbx` - Alternative model format

### AI Prompt Engineering
The system uses a specialized prompt that:
- Identifies route queries vs general questions
- Extracts origin, destination, and time constraints
- Calculates optimal departure times
- Provides friendly, conversational responses

## Customization

### Change 3D Avatar
Edit `AIAssistant.jsx`:
```javascript
function Avatar3D() {
  const { scene } = useGLTF('/models/your-model.glb');
  return <primitive object={scene} scale={2.5} position={[0, -1.5, 0]} />;
}
```

### Adjust AI Behavior
Edit the system prompt in `/api/ai-assistant.js`:
```javascript
const systemPrompt = `Your custom instructions here...`;
```

### Styling
The assistant uses glassmorphism design matching the rest of the UI:
- Semi-transparent backgrounds
- Backdrop blur effects
- Gradient accents
- Smooth animations

## Troubleshooting

**3D Model Not Loading:**
- Check that model files exist in `public/models/`
- Verify the file path in `useGLTF()`
- Check browser console for errors

**AI Not Responding:**
- Verify `GEMINI_API_KEY` is set in `.env.local`
- Check API key is valid
- Look for errors in browser console and server logs

**Slow Responses:**
- Gemini 2.0 Flash is optimized for speed
- Check your internet connection
- Verify backend is running for traffic data

## Future Enhancements

- Voice input/output
- Animated avatar responses
- Multi-language support
- Route visualization on map
- Historical traffic analysis
- Personalized recommendations

## Credits

- **3D Rendering**: React Three Fiber
- **AI**: Google Gemini 2.0 Flash
- **Design**: Glassmorphism UI
- **Icons**: Lucide React
