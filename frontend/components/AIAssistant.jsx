import { useState, useRef, useEffect } from 'react';
import { X, Send, Minimize2, Maximize2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Viseme mapping for lip-sync
const visemeMapping = {
  A: "viseme_PP",
  B: "viseme_kk",
  C: "viseme_I",
  D: "viseme_AA",
  E: "viseme_O",
  F: "viseme_U",
  G: "viseme_FF",
  H: "viseme_TH",
  X: "viseme_PP",
};

// 3D Avatar Model Component
function Avatar3D({ isSpeaking, isCalculating }) {
  const { scene } = useGLTF('/models/test4.glb');
  const [availableMorphs, setAvailableMorphs] = useState([]);
  const groupRef = useRef();
  
  // Discover available morph targets on mount
  useEffect(() => {
    const morphs = [];
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        console.log('Found morph targets:', Object.keys(child.morphTargetDictionary));
        Object.keys(child.morphTargetDictionary).forEach(key => {
          if (!morphs.includes(key)) {
            morphs.push(key);
          }
        });
      }
    });
    setAvailableMorphs(morphs);
  }, [scene]);
  
  // Animate rotation when calculating
  useFrame(() => {
    if (groupRef.current) {
      // Smoothly rotate to look at map when calculating
      const targetRotation = isCalculating ? Math.PI : 0; // 180 degrees when calculating
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation,
        0.05
      );
    }
    
    const time = Date.now() * 0.01;
    
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        Object.keys(child.morphTargetDictionary).forEach((key) => {
          const lowerKey = key.toLowerCase();
          const index = child.morphTargetDictionary[key];
          
          if (isSpeaking) {
            // Animate any mouth/jaw/lip related morphs
            if (lowerKey.includes('mouth') || lowerKey.includes('jaw') || 
                lowerKey.includes('lip') || lowerKey.includes('viseme') ||
                lowerKey.includes('aa') || lowerKey.includes('oh') ||
                lowerKey.includes('ee') || lowerKey.includes('open')) {
              
              // Oscillate between open and closed - Natural talking speed
              const targetValue = (Math.sin(time * 2) + 1) * 0.6; // 0 to 1.0 (full range)
              child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
                child.morphTargetInfluences[index],
                targetValue,
                0.1 // Smooth transition
              );
            }
          } else {
            // Reset to neutral
            child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
              child.morphTargetInfluences[index],
              0,
              0.1
            );
          }
        });
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      <primitive 
        object={scene} 
        scale={3.0}
        position={[0, -4.7, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

export default function AIAssistant({ onClose, onQueryRoute }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI Traffic Assistant. Ask me about routes, travel times, or traffic conditions!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationData, setCalculationData] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          // Auto-send after voice input
          setTimeout(() => {
            if (transcript.trim()) {
              handleSend();
            }
          }, 500);
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      // Speech Synthesis
      synthRef.current = window.speechSynthesis;
      
      // Load voices (some browsers need this)
      if (synthRef.current) {
        synthRef.current.getVoices();
        // Voices might load asynchronously
        synthRef.current.onvoiceschanged = () => {
          synthRef.current.getVoices();
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text, onComplete) => {
    console.log('Speak called with text:', text, 'Has callback:', !!onComplete);
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices and select a natural-sounding one
      const voices = synthRef.current.getVoices();
      
      // Prefer natural, premium MALE voices
      const preferredVoices = [
        'Google US English Male',
        'Microsoft Guy Online (Natural) - English (United States)',
        'Microsoft David Online (Natural) - English (United States)',
        'Alex', // macOS male
        'Daniel', // macOS male
        'Google UK English Male',
        'Microsoft Mark Desktop - English (United States)'
      ];
      
      // Find the best available voice
      let selectedVoice = voices.find(voice => 
        preferredVoices.some(preferred => voice.name.includes(preferred))
      );
      
      // Fallback to any English MALE voice with "natural" or "premium" in name
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('male') ||
           voice.name.toLowerCase().includes('guy') ||
           voice.name.toLowerCase().includes('david') ||
           voice.name.toLowerCase().includes('mark')) &&
          (voice.name.toLowerCase().includes('natural') || 
           voice.name.toLowerCase().includes('premium') ||
           voice.name.toLowerCase().includes('neural'))
        );
      }
      
      // Final fallback to any English male voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.toLowerCase().includes('male') ||
           voice.name.toLowerCase().includes('guy'))
        );
      }
      
      // Last resort: any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Natural speech parameters
      utterance.rate = 0.95; // Slightly slower for clarity
      utterance.pitch = 1.05; // Slightly higher for friendliness
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        console.log('Speech started');
        setIsSpeaking(true);
      };
      utterance.onend = () => {
        console.log('Speech ended, calling callback');
        setIsSpeaking(false);
        if (onComplete) {
          console.log('Executing onComplete callback');
          onComplete();
        }
      };
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        setIsSpeaking(false);
        if (onComplete) {
          console.log('Executing onComplete callback after error');
          onComplete();
        }
      };
      
      synthRef.current.speak(utterance);
      console.log('Speech utterance queued');
    } else {
      console.log('Speech synthesis not available or no text');
      if (onComplete) onComplete(); // Call callback immediately if speech not available
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Call Gemini API for natural language processing
      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      
      console.log('AI Response:', data);
      console.log('Route Data:', data.routeData);
      
      if (data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response,
          routeData: data.routeData 
        }]);

        // If this is a route query, speak and calculate in background
        if (data.routeData && Object.keys(data.routeData).length > 0) {
          console.log('Route query detected! Starting flow...');
          
          // Speak the initial response with callback
          speak(data.response, () => {
            console.log('Speech ended, starting calculation...');
            
            // Turn around and start calculating
            setIsCalculating(true);
            
            // Trigger map zoom to destination immediately
            if (onQueryRoute) {
              console.log('Zooming map to destination...');
              onQueryRoute(data.routeData);
            }
            
            // Simulate calculation time (3 seconds for heatmap generation)
            setTimeout(() => {
              console.log('Calculation complete! Turning back...');
              setIsCalculating(false);
              
              // Speak the result after turning back
              const resultMessage = `Based on current traffic conditions, I recommend leaving at ${data.routeData.departureTime || '2:30 PM'} to reach your destination on time.`;
              console.log('Speaking result:', resultMessage);
              speak(resultMessage);
              
              // Add result to messages
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: resultMessage
              }]);
            }, 3000);
          });
          
        } else {
          console.log('No route data, regular response');
          // Regular response, just speak
          speak(data.response);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I apologize, but I encountered an error. Please try again or rephrase your question.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 3D Avatar - Bottom Center (Half Body) */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[1500] w-80 h-80 pointer-events-none overflow-visible">
        <Canvas camera={{ position: [0, 0, 3], fov: 45 }} style={{ background: 'transparent' }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[3, 3, 5]} intensity={1.5} />
          <spotLight position={[0, 5, 3]} intensity={0.8} angle={0.3} />
          <Avatar3D isSpeaking={isSpeaking} isCalculating={isCalculating} />
        </Canvas>
        
        {/* Online/Speaking/Calculating Indicator */}
        <div className={`absolute -top-2 right-4 flex items-center gap-2 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-auto shadow-lg transition-all ${
          isCalculating ? 'bg-purple-500/90 animate-pulse' : 
          isSpeaking ? 'bg-blue-500/90 animate-pulse' : 'bg-green-500/90'
        }`}>
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <span className="text-xs text-white font-semibold">
            {isCalculating ? '🧮 Calculating' : isSpeaking ? '🎙️ Speaking' : 'AI Online'}
          </span>
        </div>
      </div>

      {/* Chat Interface - Bottom Right */}
      {!isMinimized && (
        <div className="fixed bottom-4 right-4 z-[1500] w-96 bg-white/85 backdrop-blur-xl backdrop-saturate-150 rounded-3xl border border-white/40 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-gradient-to-r from-primary/10 to-blue-900/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-900 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">AI Traffic Assistant</h3>
                <p className="text-xs text-gray-500">Powered by Gemini 2.0</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 hover:bg-gray-100/50 rounded-lg transition-all"
              >
                <Minimize2 className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100/50 rounded-lg transition-all"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-primary to-blue-900 text-white'
                      : 'bg-white/70 backdrop-blur-sm border border-gray-200/50 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200/50 bg-white/40 backdrop-blur-sm">
            <div className="flex items-end gap-2">
              {/* Voice Input Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-xl transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-white/70 text-gray-700 hover:bg-white'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <div className="flex-1 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl overflow-hidden">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? "Listening..." : "Ask me anything about traffic..."}
                  rows={2}
                  className="w-full px-3 py-2 bg-transparent resize-none focus:outline-none text-sm"
                  disabled={isListening}
                />
              </div>

              {/* Voice Output Toggle */}
              <button
                onClick={isSpeaking ? stopSpeaking : null}
                className={`p-3 rounded-xl transition-all ${
                  isSpeaking 
                    ? 'bg-blue-500 text-white animate-pulse' 
                    : 'bg-white/70 text-gray-700 hover:bg-white'
                }`}
                title={isSpeaking ? 'Speaking...' : 'Voice output enabled'}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-3 bg-gradient-to-r from-primary to-blue-900 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isMinimized && (
        <div className="fixed bottom-4 right-4 z-[1500]">
          <button
            onClick={() => setIsMinimized(false)}
            className="w-96 bg-white/85 backdrop-blur-xl backdrop-saturate-150 rounded-2xl border border-white/40 shadow-2xl p-4 hover:scale-[1.02] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-900 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800 text-sm">AI Assistant</p>
                    <p className="text-xs text-gray-500">Click to expand chat</p>
                  </div>
                </div>
                <Maximize2 className="h-4 w-4 text-gray-600" />
              </div>
            </button>
          </div>
        )}
      </>
    );
  }
