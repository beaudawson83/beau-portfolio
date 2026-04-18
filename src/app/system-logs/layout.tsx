import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SYSTEM_LOGS | Beau Dawson',
  description: 'Strategic insights on AI, Operations, and Business Architecture from Beau Dawson.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    title: 'SYSTEM_LOGS | Beau Dawson',
    description: 'Strategic insights on AI, Operations, and Business Architecture.',
    type: 'website',
  },
};

export default function SystemLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#111111]">
      {children}
    </div>
  );
}
