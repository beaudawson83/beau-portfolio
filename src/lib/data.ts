import { Metric, Experience, Skill, SocialLink } from '@/types';

export const metrics: Metric[] = [
  {
    label: 'REV_RECOVERED',
    value: '$1,000,000+',
    context: 'Billing Logic',
    source: 'Expedia',
  },
  {
    label: 'ARR_PRESERVED',
    value: '$1.1M',
    context: 'M&A Retention',
    source: 'Eviivo',
  },
  {
    label: 'ADMIN_OVERHEAD',
    value: '-90%',
    context: 'Agentic Workflows',
    source: 'Syrum',
  },
  {
    label: 'CSAT_IMPACT',
    value: '+35%',
    context: 'Workflow Revamp',
    source: 'Union',
  },
];

export const experiences: Experience[] = [
  {
    yearRange: '2022 - 2025',
    company: 'UNION',
    role: 'Support Operations Manager',
    impacts: [
      'Revamped workflows; reduced resolution time by 20%.',
      'Built scalable KB; reduced ticket volume by 18%.',
    ],
    tech: ['Pioneered generative AI integration in daily support.'],
  },
  {
    yearRange: '2020 - 2022',
    company: 'BNBFINDER',
    role: 'Support Manager (Remote)',
    impacts: [
      'Crisis Ops; transitioned to fully remote with zero downtime.',
    ],
    tech: ['Developed digital SOPs and internal wikis.'],
  },
  {
    yearRange: '2019 - 2019',
    company: 'EVIIVO',
    role: 'US Support Manager',
    impacts: [
      'M&A Execution; migrated 1,500+ accounts with 90% retention.',
      'Built 12-person US support division from scratch.',
    ],
  },
  {
    yearRange: '2015 - 2018',
    company: 'EXPEDIA',
    role: 'Billing Specialist to Support Director',
    impacts: [
      'Recovered $1M+ in revenue via complex logic error resolution.',
      'Slashed processing errors by 50%+.',
    ],
  },
  {
    yearRange: '2010 - 2014',
    company: 'FLOWER CHILD DESIGN',
    role: 'Owner (Full Charge Mgmt)',
    impacts: ['Full business operations management.'],
    isLegacy: true,
  },
  {
    yearRange: '2009 - 2010',
    company: 'PEAK PERFORMERS',
    role: 'Accountant (State Aid Collections)',
    impacts: ['State aid collections accounting.'],
    isLegacy: true,
  },
  {
    yearRange: '2005 - 2009',
    company: 'SUPPORTKIDS',
    role: 'Enforcement Specialist',
    impacts: ['$3M+ collected in enforcement actions.'],
    isLegacy: true,
  },
];

export const skills: Skill[] = [
  {
    category: 'AI & Automation',
    items: [
      'Agentic Coding',
      'Syrum CRM Architecture',
      'LLM Integration',
      'Micro-App Development',
    ],
  },
  {
    category: 'Operations Core',
    items: [
      'CRM Architecture',
      'Knowledge Base Design',
      'Excel Level 3 (VBA/Logic)',
      'Google Workspace Admin',
    ],
  },
  {
    category: 'Education & Certs',
    items: [
      'HomeAway Business School',
      'Adv. Business Management',
      'Excel Adv. Data Modeling',
    ],
  },
];

export const socialLinks: SocialLink[] = [
  {
    label: 'LINKEDIN',
    url: 'https://linkedin.com/in/beaudaw',
    type: 'linkedin',
  },
  {
    label: 'PHONE: 512-658-8535',
    url: 'tel:512-658-8535',
    type: 'phone',
  },
  {
    label: 'EMAIL: beau.dawson83@gmail.com',
    url: 'mailto:beau.dawson83@gmail.com',
    type: 'email',
  },
];

export const syrumCode = `// BAD LABS // Founder & Principal Architect
// EST: June 2025 // LAUNCH: Jan 2026

class Syrum extends Agentic_CRM {
  constructor() {
    this.capabilities = [
      "Autonomous Agentic Workflows",
      "Automated Data Entry",
      "LLM Integration"
    ];
  }

  function fractionalDeployment() {
    // Deploying technical pods to overhaul client tooling
    return "Operational Bottlenecks Solved";
  }
}`;

export const heroContent = {
  headline: "I don't just manage workflows; I automate them.",
  subheader:
    '10+ years scaling revenue systems and support infrastructure. Bridging the gap between Operational Strategy and Technical Execution.',
  primaryCTA: '> INITIATE_CONTACT',
  secondaryCTA: '[ VIEW_SYSTEM_LOGS ]',
};

export const hookQuote =
  "Companies don't hire Operations Directors because everything is running perfectly. They hire them because manual processes are eating margins. If your team is drowning in repetitive tasks, you are paying a 'complexity tax' on every dollar you earn.";
