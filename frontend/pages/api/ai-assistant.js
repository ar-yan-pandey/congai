import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Initialize Gemini 2.0 Flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // System prompt for the AI assistant
    const systemPrompt = `You are an intelligent traffic assistant for CongestionAI. Your role is to help users with:
1. Route planning and travel time estimates
2. Traffic condition analysis
3. Best departure time recommendations
4. Alternative route suggestions

IMPORTANT RESPONSE GUIDELINES:
- Speak naturally like a human assistant, not a robot
- NEVER use asterisks (**), markdown formatting, or special characters
- Use plain conversational English only
- Keep responses concise and friendly (2-3 sentences max)
- Sound warm and helpful, like talking to a friend
- Use contractions (I'll, you'll, it's) for natural flow

When users ask about routes (e.g., "I want to reach X from Y before Z time"), you should:
- Extract the origin, destination, and target arrival time
- Calculate the required departure time considering traffic
- Provide helpful, conversational responses
- Be friendly and concise

Current context: You have access to real-time traffic predictions and can analyze congestion patterns.

User question: ${message}

IMPORTANT: If this is a route/travel query, you MUST respond in this EXACT format:

HUMAN_RESPONSE: [A brief, friendly acknowledgment like "Okay, I can help with that! Let me check the traffic and calculate the best time for you."]

ROUTE_QUERY: {"origin": "location name", "destination": "location name", "targetTime": "time or unspecified", "departureTime": "calculated"}

Rules:
1. ALWAYS include both HUMAN_RESPONSE and ROUTE_QUERY for route questions
2. Keep HUMAN_RESPONSE short and conversational (1-2 sentences max)
3. DO NOT include route details in HUMAN_RESPONSE
4. ROUTE_QUERY must be valid JSON
5. If not a route query, just provide a normal conversational response

Examples:
- "I want to go from Sector 8 to Cyber City at 3 PM"
  HUMAN_RESPONSE: Okay, I can help with that! Let me check the traffic and calculate the best time for you.
  ROUTE_QUERY: {"origin": "Sector 8", "destination": "Cyber City", "targetTime": "3 PM", "departureTime": "calculated"}

- "What's the weather like?"
  Just respond normally without HUMAN_RESPONSE or ROUTE_QUERY tags.`;

    // Generate response using Gemini
    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    let aiResponse = response.text();
    
    console.log('Raw AI Response:', aiResponse);

    // Extract HUMAN_RESPONSE and ROUTE_QUERY separately
    let routeData = null;
    let humanResponse = null;
    
    // Check for HUMAN_RESPONSE
    if (aiResponse.includes('HUMAN_RESPONSE:')) {
      console.log('HUMAN_RESPONSE found!');
      const humanMatch = aiResponse.match(/HUMAN_RESPONSE:\s*(.+?)(?=ROUTE_QUERY:|$)/s);
      if (humanMatch) {
        humanResponse = humanMatch[1].trim();
        console.log('Extracted human response:', humanResponse);
      }
    }
    
    // Check for ROUTE_QUERY
    if (aiResponse.includes('ROUTE_QUERY:')) {
      console.log('ROUTE_QUERY found in response!');
      const routeMatch = aiResponse.match(/ROUTE_QUERY:\s*(\{[^}]*\})/s);
      if (routeMatch) {
        try {
          const jsonStr = routeMatch[1].trim();
          routeData = JSON.parse(jsonStr);
          console.log('Parsed route data:', routeData);
        } catch (e) {
          console.log('Failed to parse route data:', e);
        }
      }
    }
    
    // Use HUMAN_RESPONSE if available, otherwise use the whole response
    if (humanResponse) {
      aiResponse = humanResponse;
    } else if (aiResponse.includes('ROUTE_QUERY:') || aiResponse.includes('HUMAN_RESPONSE:')) {
      // Remove tags if they exist but weren't properly extracted
      aiResponse = aiResponse
        .replace(/HUMAN_RESPONSE:\s*/g, '')
        .replace(/ROUTE_QUERY:\s*\{[^}]*\}/gs, '')
        .trim();
      if (!aiResponse) {
        aiResponse = "Okay, I can help with that! Let me check the traffic and calculate the best time for you.";
      }
    }
    
    // Fallback detection if no ROUTE_QUERY but looks like a route question
    if (!routeData) {
      console.log('No ROUTE_QUERY found, checking if this is a route question...');
      // Fallback: Try to detect route query from the user message
      const lowerMessage = message.toLowerCase();
      if ((lowerMessage.includes('from') && lowerMessage.includes('to')) || 
          (lowerMessage.includes('reach') || lowerMessage.includes('go to') || lowerMessage.includes('get to'))) {
        console.log('Detected route query from message, creating routeData manually');
        
        // Try to extract locations
        const fromMatch = message.match(/from\s+([^to]+?)\s+to/i);
        const toMatch = message.match(/to\s+([^.?!]+)/i);
        const timeMatch = message.match(/(?:at|by|before)\s+(\d+(?::\d+)?\s*(?:am|pm)?)/i);
        
        if (fromMatch || toMatch) {
          routeData = {
            origin: fromMatch ? fromMatch[1].trim() : 'current location',
            destination: toMatch ? toMatch[1].trim() : 'destination',
            targetTime: timeMatch ? timeMatch[1].trim() : 'unspecified',
            departureTime: 'calculated time'
          };
          console.log('Created routeData:', routeData);
        }
      }
    }

    // Clean up markdown formatting for natural speech
    aiResponse = aiResponse
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '')   // Remove italic markers
      .replace(/#{1,6}\s/g, '') // Remove heading markers
      .replace(/`/g, '')    // Remove code markers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
      .replace(/^\s*[-*+]\s/gm, '') // Remove bullet points
      .replace(/^\s*\d+\.\s/gm, '') // Remove numbered lists
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .trim();

    // Calculate realistic departure time if we have route data
    if (routeData && routeData.origin && routeData.destination) {
      try {
        // Calculate departure time based on target time
        if (routeData.targetTime && routeData.targetTime !== 'unspecified') {
          // Parse target time and calculate departure (assume 30-45 min travel time)
          const travelTimeMinutes = Math.floor(Math.random() * 15) + 30; // 30-45 minutes
          
          // Try to parse the target time
          const targetTimeStr = routeData.targetTime.toLowerCase();
          let targetHour = 15; // default 3 PM
          let targetMinute = 0;
          
          // Simple time parsing
          const timeMatch = targetTimeStr.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
          if (timeMatch) {
            targetHour = parseInt(timeMatch[1]);
            targetMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
            
            if (timeMatch[3] && timeMatch[3].toLowerCase() === 'pm' && targetHour < 12) {
              targetHour += 12;
            } else if (timeMatch[3] && timeMatch[3].toLowerCase() === 'am' && targetHour === 12) {
              targetHour = 0;
            }
          }
          
          // Calculate departure time
          let departureMinute = targetMinute - travelTimeMinutes;
          let departureHour = targetHour;
          
          if (departureMinute < 0) {
            departureMinute += 60;
            departureHour -= 1;
          }
          
          if (departureHour < 0) {
            departureHour += 24;
          }
          
          // Format departure time
          const period = departureHour >= 12 ? 'PM' : 'AM';
          const displayHour = departureHour > 12 ? departureHour - 12 : (departureHour === 0 ? 12 : departureHour);
          const displayMinute = departureMinute.toString().padStart(2, '0');
          
          routeData.departureTime = `${displayHour}:${displayMinute} ${period}`;
          console.log('Calculated departure time:', routeData.departureTime);
        } else {
          // No target time specified, suggest a time based on current time
          const now = new Date();
          now.setMinutes(now.getMinutes() + 30); // Suggest leaving in 30 minutes
          const hour = now.getHours();
          const minute = now.getMinutes();
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
          const displayMinute = minute.toString().padStart(2, '0');
          
          routeData.departureTime = `${displayHour}:${displayMinute} ${period}`;
          console.log('Suggested departure time:', routeData.departureTime);
        }
      } catch (error) {
        console.error('Departure time calculation error:', error);
        routeData.departureTime = '2:30 PM'; // Fallback
      }
    }

    return res.status(200).json({
      success: true,
      response: aiResponse,
      routeData: routeData
    });

  } catch (error) {
    console.error('AI Assistant API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process your request. Please try again.'
    });
  }
}
