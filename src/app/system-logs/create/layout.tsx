import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AccessDenied from '@/components/SystemLogs/AccessDenied';

export const metadata = {
  title: 'LOG_CREATOR | SYSTEM_ADMIN',
  description: 'Admin interface for creating and managing system logs.',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Not logged in - redirect to sign in
  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/system-logs/create');
  }

  // Logged in but not admin - show access denied
  if (!session.user?.isAdmin) {
    return <AccessDenied email={session.user?.email || undefined} />;
  }

  // Admin - render children
  return <>{children}</>;
}
