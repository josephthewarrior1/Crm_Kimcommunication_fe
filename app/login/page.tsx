import { redirect } from 'next/navigation';
import { safeTagtogReturnTo } from '../../lib/server/tagtogSso';
import NativeLogin from './NativeLogin';
import TagtogRecovery from './TagtogRecovery';

type LoginSearchParams = {
  returnTo?: string | string[];
  ssoError?: string | string[];
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<LoginSearchParams> }) {
  if (process.env.NEXT_PUBLIC_TAGTOG_SSO_ENABLED !== 'true') return <NativeLogin />;

  const params = await searchParams;
  const returnTo = safeTagtogReturnTo(params.returnTo);
  if (params.ssoError !== undefined) {
    const reason = typeof params.ssoError === 'string' ? params.ssoError : 'invalid';
    return <TagtogRecovery reason={reason} returnTo={returnTo} />;
  }

  redirect('/api/tagtog/start?returnTo=' + encodeURIComponent(returnTo));
}
