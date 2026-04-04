import { Metric, Experience, Skill, SocialLink, BadLabsFeature } from '@/types';

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
  liveUrl: 'https://testconsole.badlabs.systems',
};

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
  headline: 'Infrastructure is the leverage most companies leave on the table.',
  subheader:
    "Every manual process, every workaround, every \"that's just how we do it\" — it's money you're not making. I find those gaps and I close them. Not with band-aids, but with systems designed to scale. In 20+ years I've turned cost centers into profit engines. If your operations aren't accelerating your business, you're subsidizing your competitors.",
  primaryCTA: '> INITIATE_CONTACT',
  secondaryCTA: '[ VIEW_EXPERIENCE ]',
};
