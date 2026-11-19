import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = process.env.NEXT_PUBLIC_TAGTOG_SSO_ENABLED === 'true'
  ? {
    title: 'Masuk | TAGTOG CRM',
    description: 'Masuk ke CRM dengan akun TAGTOG kantor Anda.'
  }
  : {};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
