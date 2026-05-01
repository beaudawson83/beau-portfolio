import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Source_Serif_4 } from 'next/font/google';
import './blog.css';

const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
});

// The blog is hidden behind the Pi easter egg until the first real post lands.
// Until then, every blog route is noindex.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0e0c14',
};

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('tn-theme')?.value;
  const theme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';

  return (
    <div className={`tn-shell ${sourceSerif.variable}`} data-tn-theme={theme}>
      {children}
    </div>
  );
}
