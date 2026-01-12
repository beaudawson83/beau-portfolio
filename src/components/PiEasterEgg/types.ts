export type EasterEggPhase = 'idle' | 'hacking' | 'login' | 'dashboard';

export interface CornerPosition {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className: string;
}

// Legacy type - kept for reference, no longer used
export interface FakePage {
  id: string;
  agency: string;
  type: 'government' | 'bank' | 'news' | 'social' | 'tech';
  headerText: string;
  accentColor: string;
  content: string[];
}

export interface LoginState {
  username: string;
  password: string;
  status: 'idle' | 'authenticating' | 'denied' | 'granted';
  attempts: number;
}

// Terminal Login Types
export type TerminalPhase = 'code-challenge' | 'quote-challenge' | 'granted' | 'denied';

export interface CodeChallenge {
  prompt: string;
  answer: string;
}

export interface QuoteOption {
  label: string;
  text: string;
}

export interface StarTrekQuote {
  id: string;
  partial: string;
  options: QuoteOption[];
  correctAnswer: string;
  character: string;
  source: string;
}

export interface TerminalLoginState {
  phase: TerminalPhase;
  strikes: number;
  currentCode: CodeChallenge | null;
  currentQuote: StarTrekQuote | null;
  userInput: string;
}

// New login screen system
export type LoginScreenPhase = 'idle' | 'typing' | 'authenticating' | 'granted';

export interface LoginScreenProps {
  onPhaseChange?: (phase: LoginScreenPhase) => void;
  onComplete: () => void;
}

export interface ScreenConfig {
  id: string;
  name: string;
  component: React.ComponentType<LoginScreenProps>;
}
