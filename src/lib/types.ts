export type Role = 'user' | 'model';

export interface VocabularyItem {
  id: string;
  original: string;
  translated: string;
  context?: string;
  createdAt: number;
}

export interface UserSettings {
  nativeLanguage: string;
  targetLanguage: string;
  accent: string;
  apiKey?: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isTranslating?: boolean;
  isAudioMessage?: boolean;
}

export interface RoleplayScenario {
  id: string;
  title: string;
  description: string;
  aiRole: string;
  userRole: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  topic: string;
}

export interface CustomScenarioInput {
  aiRole: string;
  userRole: string;
  topic: string;
  level: string;
  context: string;
}

export interface UserState {
  hasCompletedOnboarding: boolean;
  startDate: number; // timestamp for discount logic
}
