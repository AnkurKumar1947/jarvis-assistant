import { create } from 'zustand';

type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AssistantStore {
  // State
  state: AssistantState;
  isListening: boolean;
  isMuted: boolean;
  voice: string;
  speechRate: number;
  wakeWordEnabled: boolean;
  soundsEnabled: boolean;
  
  // Actions
  setState: (state: AssistantState) => void;
  setIsListening: (isListening: boolean) => void;
  setIsMuted: (isMuted: boolean) => void;
  setVoice: (voice: string) => void;
  setSpeechRate: (rate: number) => void;
  setWakeWordEnabled: (enabled: boolean) => void;
  setSoundsEnabled: (enabled: boolean) => void;
  toggleListening: () => void;
  toggleMute: () => void;
  reset: () => void;
}

const initialState = {
  state: 'idle' as AssistantState,
  isListening: false,
  isMuted: false,
  voice: 'Daniel',
  speechRate: 170,
  wakeWordEnabled: true,
  soundsEnabled: true,
};

export const useAssistantStore = create<AssistantStore>((set) => ({
  ...initialState,
  
  setState: (state) => set({ state }),
  
  setIsListening: (isListening) => set({ 
    isListening,
    state: isListening ? 'listening' : 'idle',
  }),
  
  setIsMuted: (isMuted) => set({ isMuted }),
  
  setVoice: (voice) => set({ voice }),
  
  setSpeechRate: (speechRate) => set({ speechRate }),
  
  setWakeWordEnabled: (wakeWordEnabled) => set({ wakeWordEnabled }),
  
  setSoundsEnabled: (soundsEnabled) => set({ soundsEnabled }),
  
  toggleListening: () => set((state) => ({
    isListening: !state.isListening,
    state: state.isListening ? 'idle' : 'listening',
  })),
  
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  
  reset: () => set(initialState),
}));

