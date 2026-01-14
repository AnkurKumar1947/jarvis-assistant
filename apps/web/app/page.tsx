'use client';

import { useState, useEffect, useCallback } from 'react';
import { Camera } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainGrid } from '@/components/layout/MainGrid';
import { CameraFeed } from '@/components/camera/CameraFeed';
import { SystemMetrics } from '@/components/metrics/SystemMetrics';
import { AssistantView } from '@/components/assistant/AssistantView';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { connectSocket, getSocket, SOCKET_EVENTS } from '@/lib/socket';

// Types
type AssistantState = 'idle' | 'listening' | 'processing' | 'thinking' | 'speaking' | 'executing' | 'initializing';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SystemMetricsData {
  cpu: number;
  ram: number;
  disk: number;
  battery: number;
  isCharging: boolean;
  isOnline: boolean;
}

interface BackendMetrics {
  cpu: { usage: number };
  memory: { percentage: number };
  disk: { percentage: number };
  battery?: { level: number; charging: boolean };
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState(false);
  
  // Assistant state
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isListening, setIsListening] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Good evening, sir. I am JARVIS, your personal assistant. Connecting to backend server...',
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  // System metrics
  const [metrics, setMetrics] = useState<SystemMetricsData>({
    cpu: 0,
    ram: 0,
    disk: 0,
    battery: 100,
    isCharging: false,
    isOnline: false,
  });

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Connect to backend
  useEffect(() => {
    if (!mounted) return;

    let socket = getSocket();

    const setupSocket = async () => {
      try {
        await connectSocket();
        setConnected(true);
        
        // Update welcome message
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Good evening, sir. I am JARVIS, your personal assistant. All systems online. How may I assist you?',
          timestamp: new Date(),
        }]);

        socket = getSocket();

        // Listen for assistant messages
        socket.on('message', (message: Message) => {
          console.log('[Socket] Received message:', message);
          // Only add assistant messages (user messages are added locally)
          if (message.role === 'assistant') {
            setMessages(prev => [...prev, {
              ...message,
              timestamp: new Date(message.timestamp),
            }]);
          }
          setIsTyping(false);
        });

        // Listen for state changes
        socket.on('assistant_state', (state: AssistantState) => {
          console.log('[Socket] State changed:', state);
          setAssistantState(state);
          if (state === 'listening') {
            setIsListening(true);
          } else if (state === 'idle') {
            setIsListening(false);
          }
          if (state === 'thinking' || state === 'processing') {
            setIsTyping(true);
          } else if (state === 'speaking' || state === 'idle') {
            setIsTyping(false);
          }
        });

        // Listen for metrics updates
        socket.on('metrics_update', (backendMetrics: BackendMetrics) => {
          setMetrics({
            cpu: Math.round(backendMetrics.cpu?.usage ?? 0),
            ram: Math.round(backendMetrics.memory?.percentage ?? 0),
            disk: Math.round(backendMetrics.disk?.percentage ?? 0),
            battery: Math.round(backendMetrics.battery?.level ?? 100),
            isCharging: backendMetrics.battery?.charging ?? false,
            isOnline: true,
          });
        });

        // Listen for errors
        socket.on('error', (error: { code: string; message: string }) => {
          console.error('[Socket] Error:', error);
        });

        // Request initial data
        socket.emit('get_state');
        socket.emit('get_metrics');
        socket.emit('get_history');

        // Listen for history
        socket.on('history', (history: Message[]) => {
          if (history && history.length > 0) {
            setMessages(history.map(m => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })));
          }
        });

      } catch (error) {
        console.error('[Socket] Connection failed:', error);
        setConnected(false);
        setMessages([{
          id: '1',
          role: 'assistant',
          content: 'Unable to connect to backend server. Running in demo mode. Start the server with: ./start.sh',
          timestamp: new Date(),
        }]);
      }
    };

    setupSocket();

    return () => {
      socket.off('message');
      socket.off('assistant_state');
      socket.off('metrics_update');
      socket.off('error');
      socket.off('history');
    };
  }, [mounted]);

  // Handle sending messages
  const handleSendMessage = useCallback((content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    if (connected) {
      // Send via socket to backend
      const socket = getSocket();
      socket.emit('send_message', { content, source: 'text' });
    } else {
      // Demo mode fallback
      setAssistantState('thinking');
      setTimeout(() => {
        setAssistantState('speaking');
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `You said: "${content}". Backend not connected - start server with ./start.sh`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
        setTimeout(() => setAssistantState('idle'), 1500);
      }, 1000);
    }
  }, [connected]);

  // Handle listening toggle
  const handleStartListening = useCallback(() => {
    setIsListening(true);
    setAssistantState('listening');
    if (connected) {
      const socket = getSocket();
      socket.emit('start_listening');
    }
  }, [connected]);

  const handleStopListening = useCallback(() => {
    setIsListening(false);
    setAssistantState('idle');
    if (connected) {
      const socket = getSocket();
      socket.emit('stop_listening');
    }
  }, [connected]);

  // Handle assistant state change
  const handleStateChange = useCallback((state: AssistantState) => {
    setAssistantState(state);
    if (state === 'listening') {
      setIsListening(true);
    } else if (state === 'idle') {
      setIsListening(false);
    }
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen p-4 lg:p-6">
      {/* Header */}
      <Header className="mb-6" />

      {/* Connection Status */}
      <div className={`fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-xs font-medium ${
        connected 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}>
        {connected ? '● Connected' : '○ Disconnected'}
      </div>

      {/* Main Content */}
      <MainGrid
        leftPanel={
          <>
            {/* Camera Panel */}
            <Card glass>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  Camera
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CameraFeed />
              </CardContent>
            </Card>

            {/* System Metrics */}
            <SystemMetrics data={metrics} />
          </>
        }
        centerPanel={
          <AssistantView
            state={assistantState}
            onStateChange={handleStateChange}
            voice="Daniel"
            mode={connected ? "Voice + Text" : "Demo Mode"}
          />
        }
        rightPanel={
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onStartListening={handleStartListening}
            onStopListening={handleStopListening}
            isListening={isListening}
            isTyping={isTyping}
          />
        }
      />
    </div>
  );
}
