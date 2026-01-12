import { FakePage } from './types';

export const fakePages: FakePage[] = [
  // Government Sites
  {
    id: 'nsa',
    agency: 'NATIONAL SECURITY AGENCY',
    type: 'government',
    headerText: 'SIGINT OPERATIONS CENTER',
    accentColor: '#1e40af',
    content: [
      'OPERATION: ████████████',
      'CLEARANCE: TOP SECRET//SCI',
      'ACCESSING MAINFRAME...',
      'DECRYPTION KEY: ACTIVE',
    ],
  },
  {
    id: 'cia',
    agency: 'CENTRAL INTELLIGENCE AGENCY',
    type: 'government',
    headerText: 'CLANDESTINE SERVICES',
    accentColor: '#1e3a5f',
    content: [
      'ASSET TRACKING: ENABLED',
      'FIELD OPERATIVES: 847',
      'ENCRYPTION: AES-256-GCM',
      'STATUS: MONITORING',
    ],
  },
  {
    id: 'fbi',
    agency: 'FEDERAL BUREAU OF INVESTIGATION',
    type: 'government',
    headerText: 'CRIMINAL JUSTICE INFORMATION SERVICES',
    accentColor: '#0c4a6e',
    content: [
      'FINGERPRINT DB: ONLINE',
      'FACIAL RECOGNITION: ACTIVE',
      'WATCHLIST ENTRIES: 47,832',
      'CASE FILES: 2,847,293',
    ],
  },
  {
    id: 'pentagon',
    agency: 'DEPARTMENT OF DEFENSE',
    type: 'government',
    headerText: 'PENTAGON COMMAND CENTER',
    accentColor: '#065f46',
    content: [
      'DEFCON LEVEL: 4',
      'SATELLITE UPLINK: ACTIVE',
      'STRATEGIC CMD: ONLINE',
      'MISSILE DEFENSE: ARMED',
    ],
  },
  {
    id: 'nasa',
    agency: 'NASA',
    type: 'government',
    headerText: 'DEEP SPACE NETWORK',
    accentColor: '#1d4ed8',
    content: [
      'VOYAGER 1: 24.3B KM',
      'MARS ROVER: TRANSMITTING',
      'ISS TELEMETRY: NOMINAL',
      'ARTEMIS III: T-127 DAYS',
    ],
  },
  {
    id: 'dhs',
    agency: 'DEPT OF HOMELAND SECURITY',
    type: 'government',
    headerText: 'NATIONAL THREAT ASSESSMENT',
    accentColor: '#0369a1',
    content: [
      'THREAT LEVEL: ELEVATED',
      'BORDER STATIONS: 328',
      'ACTIVE ALERTS: 12',
      'CYBERSEC STATUS: GREEN',
    ],
  },
  {
    id: 'nro',
    agency: 'NATIONAL RECONNAISSANCE OFFICE',
    type: 'government',
    headerText: 'SATELLITE IMAGERY DIVISION',
    accentColor: '#1e3a8a',
    content: [
      'KEYHOLE-12: TRACKING',
      'RESOLUTION: 0.1M',
      'COVERAGE: 94.7%',
      'IMAGERY QUEUE: 847',
    ],
  },
  {
    id: 'treasury',
    agency: 'U.S. TREASURY DEPARTMENT',
    type: 'government',
    headerText: 'FINANCIAL CRIMES UNIT',
    accentColor: '#166534',
    content: [
      'WIRE INTERCEPTS: ACTIVE',
      'FLAGGED ACCOUNTS: 2,847',
      'SANCTIONS DB: CURRENT',
      'CRYPTO TRACE: ENABLED',
    ],
  },

  // Civilian Sites
  {
    id: 'bank1',
    agency: 'FIRST INTERNATIONAL BANK',
    type: 'bank',
    headerText: 'WIRE TRANSFER SYSTEM',
    accentColor: '#15803d',
    content: [
      'ACCOUNT: ************4829',
      'BALANCE: $4,847,293.00',
      'PENDING TRANSFERS: 3',
      'ROUTING: 021000021',
    ],
  },
  {
    id: 'bank2',
    agency: 'SWISS FEDERAL BANKING',
    type: 'bank',
    headerText: 'SECURE VAULT ACCESS',
    accentColor: '#b45309',
    content: [
      'VAULT ID: ZH-7742-A',
      'HOLDINGS: CHF 12.4M',
      'ACCESS CODE: ████████',
      'BIOMETRIC: REQUIRED',
    ],
  },
  {
    id: 'news',
    agency: 'GLOBAL NEWS NETWORK',
    type: 'news',
    headerText: 'BREAKING NEWS FEED',
    accentColor: '#b91c1c',
    content: [
      'URGENT: Sources confirm...',
      'DEVELOPING STORY...',
      'EXCLUSIVE: Documents...',
      'LIVE COVERAGE: 24/7',
    ],
  },
  {
    id: 'social',
    agency: 'UNIFIED SOCIAL PLATFORM',
    type: 'social',
    headerText: 'USER DATABASE ACCESS',
    accentColor: '#7c3aed',
    content: [
      'USERS ONLINE: 847,293,847',
      'DATA STREAMS: ACTIVE',
      'ALGORITHM: OPTIMIZING',
      'TRACKING: ENABLED',
    ],
  },
  {
    id: 'tech1',
    agency: 'QUANTUM SYSTEMS INC',
    type: 'tech',
    headerText: 'ENCRYPTED COMMS RELAY',
    accentColor: '#0891b2',
    content: [
      'NODES ACTIVE: 12,847',
      'LATENCY: 0.003MS',
      'QUANTUM KEY: ROTATING',
      'UPTIME: 99.9997%',
    ],
  },
  {
    id: 'tech2',
    agency: 'DARKNET GATEWAY',
    type: 'tech',
    headerText: 'TOR RELAY NODE 7742',
    accentColor: '#4c1d95',
    content: [
      'CIRCUITS: 2,847',
      'BANDWIDTH: 847 MB/S',
      'EXIT NODE: ACTIVE',
      'ANONYMITY: 100%',
    ],
  },
  {
    id: 'power',
    agency: 'NATIONAL POWER GRID',
    type: 'tech',
    headerText: 'SCADA CONTROL SYSTEM',
    accentColor: '#ca8a04',
    content: [
      'GRID STATUS: NOMINAL',
      'LOAD: 847.3 GW',
      'SUBSTATIONS: 12,847',
      'EMERGENCY: STANDBY',
    ],
  },
  {
    id: 'telecom',
    agency: 'GLOBAL TELECOM NETWORK',
    type: 'tech',
    headerText: 'FIBER OPTIC HUB',
    accentColor: '#0d9488',
    content: [
      'TRUNK LINES: 847',
      'CAPACITY: 100 TBPS',
      'INTERCEPT: ENABLED',
      'ROUTING: OPTIMIZED',
    ],
  },
];

export function getShuffledPages(): FakePage[] {
  const shuffled = [...fakePages];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
