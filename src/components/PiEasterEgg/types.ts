export type EasterEggPhase = 'idle' | 'hacking' | 'login';

export interface CornerPosition {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className: string;
}

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
