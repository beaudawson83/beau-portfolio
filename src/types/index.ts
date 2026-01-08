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

export type ContactObjective =
  | 'full-time'
  | 'fractional'
  | 'project'
  | 'consulting'
  | 'speaking'
  | 'connecting';

export const OBJECTIVE_LABELS: Record<ContactObjective, string> = {
  'full-time': 'Full-Time Director',
  'fractional': 'Fractional Deployment',
  'project': 'Project-Based Engagement',
  'consulting': 'Consulting / Advisory',
  'speaking': 'Speaking / Workshop',
  'connecting': 'Just Connecting',
};

export interface ContactFormData {
  name: string;
  objective: ContactObjective;
  message: string;
}

export interface SocialLink {
  label: string;
  url: string;
  type: 'linkedin' | 'phone' | 'email';
}
