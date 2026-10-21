export const tagtogSsoEnabled = process.env.NEXT_PUBLIC_TAGTOG_SSO_ENABLED === 'true';
export const crmApiBase = tagtogSsoEnabled ? '/api/crm' : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';
let csrfToken: string | null = null;

export function setTagtogCsrf(value: string | null) { csrfToken = value; }
export function crmAuthHeaders(extra?: Record<string, string>): HeadersInit {
  if (tagtogSsoEnabled) return { ...extra, ...(csrfToken ? { 'X-CRM-CSRF': csrfToken } : {}) };
  const token = typeof window !== 'undefined' ? localStorage.getItem('session') : null;
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
export function notifyCrmSessionEnded(status: number) {
  if (tagtogSsoEnabled && status === 401 && typeof window !== 'undefined') {
    csrfToken = null;
    window.dispatchEvent(new Event('crm-session-ended'));
  }
}
export function safeCrmReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\u0000-\u0020\u007f#]/.test(value)
    || /%(?:2f|5c|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return '/dashboard';
  try { const url = new URL(value, 'https://crm.invalid'); return url.origin === 'https://crm.invalid'
    && (url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')) ? url.pathname + url.search : '/dashboard'; } catch { return '/dashboard'; }
}
export function startCrmSignIn(returnTo?: string) {
  if (typeof window === 'undefined') return;
  const target = safeCrmReturnTo(returnTo || new URLSearchParams(window.location.search).get('returnTo'));
  window.location.assign('/api/tagtog/start?returnTo=' + encodeURIComponent(target));
}
