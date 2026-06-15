import { Metric, Experience, Skill, SocialLink, BadLabsFeature, ModuleEntry } from '@/types';

export const metrics: Metric[] = [
  {
    label: 'REV_RECOVERED',
    value: '$1M+',
    context: 'Billing logic errors found & resolved',
    source: 'Expedia/HomeAway',
  },
  {
    label: 'ARR_PRESERVED',
    value: '$1.1M',
    context: '90% retention across 1,500+ account migration',
    source: 'Eviivo',
  },
  {
    label: 'ADMIN_OVERHEAD',
    value: '-90%',
    context: 'CRM tasks automated via agentic workflows',
    source: 'BAD Labs Console',
  },
  {
    label: 'CSAT_IMPACT',
    value: '+35%',
    context: 'Tiered-support model with clear escalation paths',
    source: 'Union',
  },
  {
    label: 'PROMOTIONS_DRIVEN',
    value: '31',
    context: '22 at HomeAway + 9 at Union (incl. 3 double-promotions)',
    source: 'Career Total',
  },
  {
    label: 'ONBOARDING_SUCCESS',
    value: '50% → 90%',
    context: 'Replaced trial-by-firehose with structured curriculum',
    source: 'Union',
  },
  {
    label: 'RESOLUTION_TIME',
    value: '-20%',
    context: 'End-to-end workflow revamp with tiered escalation',
    source: 'Union',
  },
  {
    label: 'FRAUD_DETECTED',
    value: '$1M/yr',
    context: 'Revenue leakage found bridging Support + Finance data',
    source: 'HomeAway',
  },
];

export const experiences: Experience[] = [
  {
    yearRange: '2025 - Present',
    company: 'BAD LABS',
    role: 'Founder & Principal Operations Architect',
    context: 'Solo-founded consultancy. Fractional leadership + product development. AI-as-a-Service model serving SMBs.',
    impacts: [
      'Built Console — an autonomous agentic CRM that reduces administrative overhead by ~90% through AI agents handling data entry, pipeline tracking, and workflow orchestration.',
      'Developed 12+ custom AI-powered tools and micro-apps for SMB clients, automating document processing, customer communication, and workflow bottlenecks.',
      'Available for fractional COO / VP Ops engagements with a dedicated technical crew to rapidly overhaul client tooling and operational infrastructure.',
    ],
    tech: ['Next.js', 'TypeScript', 'Postgres', 'Vercel AI SDK', 'Claude', 'OpenAI', 'REST APIs', 'Agentic Workflows'],
  },
  {
    yearRange: '2022 - 2025',
    company: 'UNION',
    role: 'Support Operations Manager',
    context: 'Series A-B hospitality SaaS. 15-person team + 2 operational sub-teams. Also held oversight of Success team and contributed to Sales redesign during leadership transitions.',
    impacts: [
      'Revamped end-to-end support workflows with tiered escalation model — 20% faster resolution, 35% CSAT improvement.',
      'Architected scalable knowledge base from scratch — reduced ticket volume 18% per venue through customer self-service.',
      'Built Shopify-to-HubSpot integration for hardware sales — reduced ops effort 60%, delivered first-ever live inventory tracking.',
      'Engineered career-pathing framework: 9 promotions including 3 double-promotions. 0% leadership turnover across entire tenure.',
      'Replaced informal onboarding with structured curriculum — 90-day success rate went from 50% to 90%.',
    ],
    tech: ['Intercom', 'Salesforce', 'HubSpot', 'Shopify', 'Jira', 'Slack Workflows', 'Zapier', 'Generative AI'],
    highlights: ['Pioneered generative AI integration into daily support — one of the earliest adopters at a growth-stage SaaS.'],
  },
  {
    yearRange: '2020 - 2022',
    company: 'SAVVY (BNBFINDER)',
    role: 'Support Manager',
    context: 'Hospitality marketplace. Fully remote, London-HQ. Managed distributed team through pandemic-era travel disruption.',
    impacts: [
      'Transitioned entire support team to fully remote during COVID-19 — zero service downtime during the most volatile period in travel history.',
      'Built comprehensive digital SOPs, internal wikis, and self-service resources that reduced agent workload and survived team transitions.',
      'Maintained 0% total team turnover during global pandemic disruption.',
    ],
  },
  {
    yearRange: '2019',
    company: 'EVIIVO',
    role: 'US Support Manager',
    context: 'UK hospitality tech company that acquired a US platform. Built the entire US support division during post-acquisition integration.',
    impacts: [
      'Orchestrated migration of 1,500+ customer accounts with 90% retention — preserving $1.1M in annual recurring revenue.',
      'Built 12-person US support division from zero: org structure, job descriptions, hiring rubrics, training protocols, QA processes.',
      'Designed communication strategy, migration timeline, and escalation protocols for a high-risk M&A transition.',
    ],
  },
  {
    yearRange: '2015 - 2018',
    company: 'EXPEDIA GROUP (HOMEAWAY)',
    role: 'Billing Specialist → Support Director',
    context: 'Global travel tech. Four promotions in 3.5 years: Billing Specialist → Team Lead → Support Manager → Support Director.',
    impacts: [
      'Discovered and resolved complex billing logic errors in legacy systems — directly recovering $1M+ in silently lost revenue.',
      'Overhauled billing and support workflows — 50%+ reduction in processing errors.',
      'Identified $1M annual revenue leakage and internal fraud by bridging the blind spot between Support and Finance data.',
      'Led international termination of outsourced support ops and relocated distributed teams into parent corporate structures during HomeAway-to-Expedia integration.',
      'Orchestrated 22 promotions during organizational restructuring, with 18 team members transitioning into cross-functional roles.',
    ],
  },
  {
    yearRange: '2010 - 2014',
    company: 'FLOWER CHILD DESIGN',
    role: 'Owner & Operator',
    impacts: [
      'Solo proprietor with full P&L ownership: AR/AP, payroll, tax prep, purchasing, vendor negotiation, inventory.',
      'End-to-end client delivery lifecycle for weddings and corporate events in the Austin metro.',
    ],
    isLegacy: true,
  },
  {
    yearRange: '2005 - 2009',
    company: 'SUPPORTKIDS',
    role: 'Enforcement Specialist',
    impacts: [
      'Collected $3M+ in past-due payments through structured outreach and negotiation.',
      'Managed complex, emotionally charged communications requiring empathy, de-escalation, and firm adherence to commitments.',
    ],
    isLegacy: true,
  },
  {
    yearRange: '2002 - 2010',
    company: 'EARLY CAREER',
    role: 'Office Management & Accounting',
    impacts: [
      'Peak Performers Austin (Accountant) — State aid collections for TX Health & Human Resources.',
      'Westbank Flower Market (Office Manager) — Full-charge operations and financial oversight.',
      'David Tucker CPA (Office Manager) — Practice management and tax preparation support.',
    ],
    isLegacy: true,
  },
];

export const skills: Skill[] = [
  {
    category: 'AI & Automation',
    items: [
      'Claude (Anthropic)',
      'OpenAI GPT-4',
      'Vercel AI SDK',
      'Agentic Workflows',
      'Prompt Engineering',
      'Zapier / Make',
      'Webhook Orchestration',
    ],
  },
  {
    category: 'Platforms & CRMs',
    items: [
      'Intercom',
      'Salesforce',
      'HubSpot',
      'Zendesk',
      'Shopify',
      'Jira / Confluence',
    ],
  },
  {
    category: 'Development',
    items: [
      'TypeScript / Node.js',
      'Python',
      'Next.js / React',
      'REST APIs',
      'PostgreSQL',
      'Git / GitHub',
    ],
  },
  {
    category: 'Operations',
    items: [
      'Process Engineering',
      'M&A Integration',
      'Team Building (0→20+)',
      'Knowledge Base Architecture',
      'QA & Training Programs',
      'Crisis Operations',
    ],
  },
];

export const badLabsContent = {
  headline: 'BAD Labs',
  subheadline: 'Founder & Principal Operations Architect — June 2025 to Present',
  description:
    'AI-as-a-Service consultancy deploying autonomous systems that eliminate operational bottlenecks for SMBs. Available for fractional COO / VP Ops engagements with a dedicated technical crew.',
  features: [
    {
      title: 'Console CRM',
      description: 'Autonomous agentic CRM — AI agents handle data entry, pipeline tracking, and workflow orchestration. Launched Jan 2026, reducing admin overhead ~90% for early adopters.',
    },
    {
      title: 'Custom AI Tooling',
      description: '12+ micro-apps integrating LLMs to automate document processing, customer communication, and operational workflows for SMB clients.',
    },
    {
      title: 'Fractional Leadership',
      description: 'Deploy with a technical crew to overhaul client tooling and infrastructure. Scope: operational audits, support org design, CRM implementation, AI integration strategy.',
    },
  ] as BadLabsFeature[],
  liveUrl: 'https://console.badlabs.systems',
};

export interface CaseStudy {
  company: string;
  role: string;
  period: string;
  problem: string;
  built: string;
  results: string[];
  highlight: string;
}

export const caseStudies: CaseStudy[] = [
  {
    company: 'Expedia Group (HomeAway)',
    role: 'Billing Specialist → Support Director',
    period: '2015 - 2018',
    problem:
      'Legacy billing systems were silently hemorrhaging revenue through logic errors nobody had found. International support teams were fragmented across outsourced vendors during a major corporate integration.',
    built:
      'Forensic billing audit that traced revenue leakage through complex charge calculations. Overhauled billing and support workflows with automated validation. Led the international consolidation of outsourced support into parent corporate structures.',
    results: [
      '$1M+ in revenue recovered from billing logic errors',
      '$1M/yr in fraud and leakage identified bridging Support + Finance data',
      '50%+ reduction in processing errors',
      '22 promotions orchestrated, 18 cross-functional transitions',
      '4 personal promotions in 3.5 years',
    ],
    highlight: 'Found money nobody knew was missing.',
  },
  {
    company: 'Union',
    role: 'Support Operations Manager',
    period: '2022 - 2025',
    problem:
      'Series A-B SaaS with a 15-person support team drowning in unstructured workflows, no career pathing, a 50% washout rate for new hires, and zero self-service infrastructure. Leadership gaps meant wearing multiple hats across Support, Success, and Sales.',
    built:
      'Tiered support model with clear escalation paths. Scalable knowledge base from scratch. Structured onboarding curriculum with milestone-based progression. Career-pathing framework with clear growth trajectories. Custom Shopify-to-HubSpot integration for hardware sales.',
    results: [
      '35% improvement in CSAT scores',
      '20% faster resolution time',
      '18% ticket volume reduction via self-service',
      '90-day onboarding success: 50% → 90%',
      '9 promotions including 3 double-promotions',
      'Zero leadership turnover across entire tenure',
      '60% ops effort reduction via Shopify-HubSpot integration',
    ],
    highlight: 'Walked into chaos. Left it running itself.',
  },
  {
    company: 'BAD Labs',
    role: 'Founder & Principal Operations Architect',
    period: '2025 - Present',
    problem:
      'SMBs are paying a complexity tax on every dollar — drowning in manual CRM entry, disconnected tools, and processes that depend on one person knowing how things work.',
    built:
      'Console — an autonomous agentic CRM where AI agents handle data entry, pipeline tracking, and workflow orchestration without human intervention. Plus 12+ custom AI-powered micro-apps for client-specific bottlenecks.',
    results: [
      '~90% reduction in CRM administrative overhead',
      '12+ custom AI tools built and deployed',
      'Available for fractional COO / VP Ops engagements',
    ],
    highlight: 'Building the systems I spent 20 years wishing existed.',
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
    label: 'EMAIL: email@beaudawson.com',
    url: 'mailto:email@beaudawson.com',
    type: 'email',
  },
];

export const heroContent = {
  name: 'Beau Dawson',
  title: 'Operations leader. Systems builder. AI architect.',
  headline: "I don't manage operations — I engineer them.",
  subheader:
    "$1M+ recovered at Expedia. 90% retention across 1,500 accounts at Eviivo. 31 internal promotions driven. Zero leadership turnover. Now building autonomous AI systems that eliminate operational bottlenecks entirely.",
  primaryCTA: 'Get in Touch',
  secondaryCTA: 'See My Work',
};

// MODULES — public destinations on the portfolio. Live telemetry per card
// is computed at request time via src/lib/module-telemetry.ts; this array
// is the static content (name, description, href, status).
export const modules: ModuleEntry[] = [
  {
    id: 'conflict',
    name: 'GLOBAL CONFLICT INDEX',
    description: 'Daily-ingested journal of active world conflicts.',
    href: '/global-conflict',
    status: 'LIVE',
  },
  {
    id: 'blog',
    name: 'NOTES',
    description: 'Operations writing — twenty years of building, now turning toward AI.',
    href: '/blog',
    status: 'LIVE',
  },
  {
    id: 'updraft',
    name: 'UPDRAFT',
    description: 'AI-powered resume and cover letter generator — upload, tailor to a role, download.',
    href: '/updraft',
    status: 'LIVE',
  },
];

// =============================================================================
// UpDraft — login page brand assets.
//
// Logo asset for the /updraft/login brand mark. Lives at public/updraft-logo.png.
// The PrivacyCallout placeholder slot renders only when this is null.
// =============================================================================
export const updraftLogoPath: string | null = '/updraft-logo.png';

// =============================================================================
// UpDraft — privacy callout copy.
//
// Mirrors skills/updraft/PRIVACY-COPY.md (the Beau-edited canonical master).
// The <PrivacyCallout> component reads this object and renders it; structural
// concerns live in the component, copy lives here per the data.ts convention.
// When the master file changes, update this object to match.
// =============================================================================
export const updraftPrivacyCopy: import('@/types').UpdraftPrivacyCopy = {
  heading: 'Privacy, Trust & Opportunity',
  lede: [
    "Building a great resume shouldn't require being an expert—or giving up your privacy.",
    'Our mission is simple: help people showcase their skills, earn better opportunities, and move forward with confidence—safely and transparently.',
  ],
  protections: {
    intro:
      'We designed our platform around privacy‑by‑default and data minimization, in line with GDPR principles of lawfulness, fairness, and transparency.',
    introCitations: [
      { label: 'gdpr-advisor.com', href: 'http://gdpr-advisor.com' },
      { label: 'gdprlocal.com', href: 'http://gdprlocal.com' },
    ],
    points: [
      {
        heading: 'Passwordless, secure access',
        body: 'We use Magic Link authentication, so there are no passwords to store or leak. We collect only your email address, solely to provide access to your account.',
      },
      {
        heading: 'Purpose‑limited data use',
        body: 'Your information is used only to help generate, edit, and export your resume—never for advertising, tracking, or unrelated purposes.',
      },
      {
        heading: 'Temporary storage, automatic deletion',
        body: 'To support edits and downloads, your uploaded information and generated resumes are stored for up to 30 days. After 30 days of inactivity, all data is automatically and permanently deleted, consistent with GDPR storage‑limitation requirements.',
        citations: [{ label: 'gdprlocal.com', href: 'http://gdprlocal.com' }],
      },
      {
        heading: 'You stay in control',
        body: 'At any time, you can access, export, or delete your data directly from your dashboard—no emails, no hoops. This reflects your GDPR rights to access and erasure.',
        citations: [{ label: 'gdpr-advisor.com', href: 'http://gdpr-advisor.com' }],
      },
      {
        heading: 'Ethical AI, full stop',
        body: 'We never sell personal data and never use your content to train AI models. Your information belongs to you—always.',
      },
    ],
  },
  whyItMatters: {
    heading: 'Why this matters',
    body: [
      "No one majors in resume writing. It's a learned skill—and one that AI can explain, refine, and elevate for people who didn't grow up fluent in career language. Used responsibly, AI helps level the playing field.",
      'Our promise is to offer that advantage without compromising your privacy, agency, or trust.',
    ],
  },
  footerMicrocopy:
    'By logging in, you acknowledge our temporary data‑retention policy, designed to give you flexibility while keeping your information secure, private, and fully under your control.',
};
