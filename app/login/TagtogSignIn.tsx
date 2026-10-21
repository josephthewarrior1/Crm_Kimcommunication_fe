'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/context/AuthContext';
import { startCrmSignIn } from '../../lib/utils/tagtogAuth';

const messages: Record<string, string> = {
  access_denied: 'Your TAGTOG account does not have CRM access. Contact your administrator.',
  link_required: 'Your TAGTOG account is not linked to an existing CRM user yet. Ask your administrator to link it.',
  expired: 'Your sign-in request or CRM session has expired. Start sign-in again.',
  invalid: 'This sign-in request could not be verified. Start sign-in again.',
  unavailable: 'The CRM sign-in service is temporarily unavailable. Please try again.',
  managed: 'Accounts are managed through TAGTOG. Contact your workspace administrator.'
};

export default function TagtogSignIn() {
  const { isLoading, authError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => { const reason = new URLSearchParams(window.location.search).get('ssoError'); setError(reason ? messages[reason] || messages.invalid : null); }, []);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" aria-labelledby="crm-signin-title">
        <div className="mb-8 flex items-center gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-blue-600"><ShieldCheck aria-hidden="true" size={26} /></span><div><p className="text-xs font-semibold tracking-widest text-slate-400">TAGTOG WORKSPACE</p><p className="text-lg font-semibold">KIM CRM</p></div></div>
        <h1 id="crm-signin-title" className="text-3xl font-semibold tracking-tight">Sign in through TAGTOG</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">Use your central account to access CRM. Your existing CRM role and event access stay linked to your account.</p>
        {(error || authError) && <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{error || authError}</p>}
        <button type="button" disabled={pending || isLoading} onClick={() => { setPending(true); startCrmSignIn(); }} className="mt-8 flex w-full items-center justify-between rounded-xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60">
          {pending ? 'Opening TAGTOG…' : isLoading ? 'Checking your session…' : 'Continue with TAGTOG'}{pending || isLoading ? <Loader2 aria-hidden="true" size={18} className="animate-spin" /> : <ArrowRight aria-hidden="true" size={18} />}
        </button>
        <p className="mt-6 text-xs leading-5 text-slate-400">Need access? Contact your workspace administrator. Passwords and user accounts are managed in TAGTOG.</p>
        <p className="mt-8 border-t border-slate-100 pt-5 text-xs text-slate-400">Local integration preview · CRM workspace access</p>
      </section>
    </main>
  );
}
