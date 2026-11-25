import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function UsersLayout({ children }: { children: ReactNode }) {
  if (process.env.NEXT_PUBLIC_TAGTOG_SSO_ENABLED === 'true' && process.env.NEXT_PUBLIC_TAGTOG_ROLE_MANAGEMENT_ENABLED === 'true') {
    const url = new URL(process.env.TAGTOG_PORTAL_URL || 'http://127.0.0.1:4180');
    const loopback = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if ((!loopback && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error('Invalid TAGTOG portal origin');
    }
    redirect(new URL('/admin#users', url).href);
  }
  return children;
}
