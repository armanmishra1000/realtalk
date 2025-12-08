import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings, VocabularyItem, UserState, RoleplayScenario } from './types';

interface AppState {
  userState: UserState;
  settings: UserSettings;
  vocabulary: VocabularyItem[];
  currentScenario: RoleplayScenario | null;
  
  // Actions
  setStartDate: (date: number) => void;
  completeOnboarding: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  addVocabulary: (item: VocabularyItem) => void;
  removeVocabulary: (id: string) => void;
  setScenario: (scenario: RoleplayScenario | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      userState: {
        hasCompletedOnboarding: false,
        startDate: Date.now(),
      },
      settings: {
        nativeLanguage: 'Hindi',
        targetLanguage: 'English',
        accent: 'Indian',
        apiKey: '',
      },
      vocabulary: [],
      currentScenario: null,

      setStartDate: (date) => set((state) => ({ 
        userState: { ...state.userState, startDate: date } 
      })),
      
      completeOnboarding: () => set((state) => ({
        userState: { ...state.userState, hasCompletedOnboarding: true }
      })),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      addVocabulary: (item) => set((state) => ({
        vocabulary: [item, ...state.vocabulary]
      })),

      removeVocabulary: (id) => set((state) => ({
        vocabulary: state.vocabulary.filter((i) => i.id !== id)
      })),

      setScenario: (scenario) => set(() => ({
        currentScenario: scenario
      })),
    }),
    {
      name: 'realtalk-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
