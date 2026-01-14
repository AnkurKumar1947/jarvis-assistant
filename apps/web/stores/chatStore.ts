import { create } from 'zustand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatStore {
  // State
  messages: Message[];
  isTyping: boolean;
  
  // Actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  setIsTyping: (isTyping: boolean) => void;
  clearMessages: () => void;
  removeMessage: (id: string) => void;
}

const defaultMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Good evening, sir. I am JARVIS, your personal assistant. How may I help you today?',
    timestamp: new Date(),
  },
];

export const useChatStore = create<ChatStore>((set) => ({
  messages: defaultMessages,
  isTyping: false,
  
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date(),
      },
    ],
  })),
  
  setIsTyping: (isTyping) => set({ isTyping }),
  
  clearMessages: () => set({ messages: defaultMessages }),
  
  removeMessage: (id) => set((state) => ({
    messages: state.messages.filter((m) => m.id !== id),
  })),
}));

