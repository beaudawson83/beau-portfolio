import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

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

  if (!session?.user?.isAdmin) {
    redirect('/system-logs/login?callbackUrl=/system-logs/create');
  }

  return <>{children}</>;
}
