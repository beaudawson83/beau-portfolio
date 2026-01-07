export interface Metric {
  label: string;
  value: string;
  context: string;
  source: string;
}

export interface Experience {
  yearRange: string;
  company: string;
  role: string;
  impacts: string[];
  tech?: string[];
  isLegacy?: boolean;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface ContactFormData {
  name: string;
  objective: 'full-time' | 'fractional';
  message: string;
}

export interface SocialLink {
  label: string;
  url: string;
  type: 'linkedin' | 'phone' | 'email';
}
