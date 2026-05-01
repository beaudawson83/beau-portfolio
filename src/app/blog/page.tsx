import { cookies } from 'next/headers';
import IndexView from '@/components/Blog/Reader/IndexView';
import { getPublishedPosts } from '@/lib/blog-data';

export const revalidate = 900; // 15 minutes — telemetry-friendly default

export default async function BlogIndexPage() {
  const cookieStore = await cookies();
  const posts = await getPublishedPosts();
  const themeCookie = cookieStore.get('tn-theme')?.value;
  const theme: 'dark' | 'light' = themeCookie === 'light' ? 'light' : 'dark';
  return <IndexView posts={posts} theme={theme} />;
}
