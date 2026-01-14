'use client';

import { useCallback } from 'react';
import { useAssistantStore } from '@/stores/assistantStore';
import { useChatStore } from '@/stores/chatStore';
import { useSocket } from './useSocket';
import { SOCKET_EVENTS } from '@/lib/constants';

export function useAssistant() {
  const { emit, isConnected } = useSocket();
  const assistantStore = useAssistantStore();
  const chatStore = useChatStore();

  // Send a message
  const sendMessage = useCallback((content: string) => {
    // Add user message
    chatStore.addMessage({ role: 'user', content });
    
    // Update state
    assistantStore.setState('thinking');
    chatStore.setIsTyping(true);

    if (isConnected) {
      // Send to backend
      emit(SOCKET_EVENTS.SEND_MESSAGE, { content });
    } else {
      // Demo mode - generate response locally
      setTimeout(() => {
        const response = generateDemoResponse(content);
        chatStore.addMessage({ role: 'assistant', content: response });
        chatStore.setIsTyping(false);
        assistantStore.setState('speaking');
        
        setTimeout(() => {
          assistantStore.setState('idle');
        }, 1500);
      }, 1000);
    }
  }, [emit, isConnected, assistantStore, chatStore]);

  // Start listening
  const startListening = useCallback(() => {
    assistantStore.setIsListening(true);
    
    if (isConnected) {
      emit(SOCKET_EVENTS.START_LISTENING);
    }
  }, [emit, isConnected, assistantStore]);

  // Stop listening
  const stopListening = useCallback(() => {
    assistantStore.setIsListening(false);
    
    if (isConnected) {
      emit(SOCKET_EVENTS.STOP_LISTENING);
    }
  }, [emit, isConnected, assistantStore]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (assistantStore.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [assistantStore.isListening, startListening, stopListening]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    assistantStore.toggleMute();
  }, [assistantStore]);

  return {
    // State
    state: assistantStore.state,
    isListening: assistantStore.isListening,
    isMuted: assistantStore.isMuted,
    voice: assistantStore.voice,
    messages: chatStore.messages,
    isTyping: chatStore.isTyping,
    isConnected,
    
    // Actions
    sendMessage,
    startListening,
    stopListening,
    toggleListening,
    toggleMute,
    setVoice: assistantStore.setVoice,
    setSpeechRate: assistantStore.setSpeechRate,
    clearMessages: chatStore.clearMessages,
  };
}

// Demo mode response generator
function generateDemoResponse(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString()}.`;
  }
  if (lowerInput.includes('date')) {
    return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }
  if (lowerInput.includes('hello') || lowerInput.includes('hi') || lowerInput.includes('hey')) {
    return 'Good evening, sir. How may I assist you?';
  }
  if (lowerInput.includes('name') || lowerInput.includes('who are you')) {
    return 'I am JARVIS - Just A Rather Very Intelligent System. Your personal AI assistant.';
  }
  if (lowerInput.includes('help')) {
    return 'I can help you with: checking time, date, system metrics, and more. Connect the backend server for full AI capabilities.';
  }
  
  return `You said: "${input}". I'm currently in demo mode. Connect to the backend server for full functionality.`;
}

