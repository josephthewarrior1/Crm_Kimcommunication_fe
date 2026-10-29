import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'crm_tagtog_session';
const TX_COOKIE = 'crm_tagtog_transaction';
const OPAQUE = /^[A-Za-z0-9_-]{43}$/;
const CODE = /^[A-Za-z0-9_-]{32,512}$/;
const PRIVATE = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' };
type CrmUser = { id: number; username: string; email: string; fullName: string; roles: string[]; allowedEventIds: number[] };
type Transaction = { state: string; verifier: string; returnTo: string; expires: number };
type Session = { token: string; csrf: string; expires: number };
export type TagtogStore = { transactions: Map<string, Transaction>; sessions: Map<string, Session> };
export interface TagtogConfig { enabled: boolean; portalUrl: string; callbackUrl: string; apiBaseUrl: string; clientId: string }
type Dependencies = { store?: TagtogStore; fetch?: typeof fetch; now?: () => number };

export function newTagtogStore(): TagtogStore { return { transactions: new Map(), sessions: new Map() }; }

export function safeTagtogReturnTo(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/dashboard')
    || /[\\\u0000-\u0020\u007f#]/.test(value) || /%(?:2f|5c|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return '/dashboard';
  try {
    const url = new URL(value, 'https://crm.invalid');
    if (url.origin !== 'https://crm.invalid' || !(url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/'))) return '/dashboard';
    return url.pathname + url.search;
  } catch { return '/dashboard'; }
}

function configuredUrl(value: string, originOnly = true): URL {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash
    || /[%\\\s]/.test(value) || originOnly && url.pathname !== '/') throw new Error('Invalid SSO configuration');
  if (url.protocol === 'http:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('HTTPS required');
  return url;
}
function cookie(request: Request, name: string): string | null {
  const values = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(name + '='));
  if (values.length !== 1) return null;
  const value = values[0].slice(name.length + 1);
  return OPAQUE.test(value) ? value : null;
}
function equal(left: string, right: string): boolean {
  return left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

/** Next 14 may expose localhost in Request.url while preserving the actual loopback Host. */
export function normalizeTagtogNextRequest(request: Request, callbackUrl: string): Request {
  try {
    const callback = configuredUrl(callbackUrl, false), url = new URL(request.url);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'];
    if (url.origin !== callback.origin && callback.protocol === 'http:' && url.protocol === 'http:'
      && loopback.includes(callback.hostname) && loopback.includes(url.hostname) && url.port === callback.port
      && request.headers.get('host') === callback.host) {
      return new Request(callback.origin + url.pathname + url.search, request);
    }
  } catch { /* Invalid configuration remains unavailable in the core handler. */ }
  return request;
}
function publicUser(value: unknown): CrmUser | null {
  const user = value as Partial<CrmUser> | null;
  if (!user || !Number.isSafeInteger(user.id) || Number(user.id) < 1 || typeof user.username !== 'string'
    || !Array.isArray(user.roles) || !user.roles.length || user.roles.some(role => !['ADMIN', 'MANAGER', 'USER'].includes(role))) return null;
  return { id: Number(user.id), username: user.username.slice(0, 160), email: typeof user.email === 'string' ? user.email.slice(0, 320) : '',
    fullName: typeof user.fullName === 'string' ? user.fullName.slice(0, 240) : '', roles: [...user.roles],
    allowedEventIds: Array.isArray(user.allowedEventIds) ? user.allowedEventIds.filter(id => Number.isSafeInteger(id) && id > 0) : [] };
}

export function createTagtogHandlers(config: TagtogConfig, dependencies: Dependencies = {}) {
  const store = dependencies.store || newTagtogStore();
  const now = dependencies.now || Date.now;
  const fetcher = dependencies.fetch || fetch;
  let callback: URL | null = null, portal: URL | null = null, backend: URL | null = null;
  try {
    callback = configuredUrl(config.callbackUrl, false);
    portal = configuredUrl(config.portalUrl);
    backend = configuredUrl(config.apiBaseUrl);
    if (callback.pathname !== '/api/tagtog/callback' || !/^[a-zA-Z0-9_-]{1,80}$/.test(config.clientId)) callback = null;
  } catch { callback = null; }
  const secure = callback?.protocol === 'https:';
  const cookieHeader = (name: string, value: string, seconds: number) => `${name}=${value}; Path=${name === TX_COOKIE ? '/api/tagtog' : '/'}; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? '; Secure' : ''}`;
  const validOrigin = (request: Request) => callback && new URL(request.url).origin === callback.origin
    && (!request.headers.has('host') || request.headers.get('host') === callback.host);
  const available = (request: Request) => config.enabled && callback && portal && backend && validOrigin(request);
  const cleanup = () => {
    for (const [id, entry] of Array.from(store.transactions)) if (entry.expires <= now()) store.transactions.delete(id);
    for (const [id, entry] of Array.from(store.sessions)) if (entry.expires <= now()) store.sessions.delete(id);
  };
  const json = (status: number, data: unknown, clear = false) => {
    const headers = new Headers({ ...PRIVATE, 'Content-Type': 'application/json; charset=utf-8' });
    if (clear) headers.append('Set-Cookie', cookieHeader(SESSION_COOKIE, '', 0));
    return new Response(JSON.stringify(data), { status, headers });
  };
  const errorJson = (status: number, code: string, clear = false) => json(status, { error: code, message: status === 503 ? 'The CRM sign-in service is unavailable. Please try again.' : status === 403 ? 'You do not have permission for this request.' : 'Your CRM session has ended. Sign in through TAGTOG again.' }, clear);
  function loginError(request: Request, reason: string) {
    const headers = new Headers(PRIVATE);
    headers.append('Set-Cookie', cookieHeader(TX_COOKIE, '', 0));
    if (!callback || !validOrigin(request)) return new Response('TAGTOG sign-in is unavailable on this address.', { status: 503, headers });
    headers.set('Location', new URL('/login?ssoError=' + reason, callback.origin).href);
    return new Response(null, { status: 303, headers });
  }
  function active(request: Request): { id: string; session: Session } | null {
    cleanup();
    const id = cookie(request, SESSION_COOKIE);
    const session = id ? store.sessions.get(id) : null;
    return id && session && session.expires > now() ? { id, session } : null;
  }
  function sameOriginWrite(request: Request, session: Session, allowMissingOrigin = false): boolean {
    const csrf = request.headers.get('x-crm-csrf') || '';
    return (request.headers.get('origin') === callback!.origin || allowMissingOrigin && !request.headers.has('origin'))
      && OPAQUE.test(csrf) && equal(csrf, session.csrf)
      && (!request.headers.has('sec-fetch-site') || request.headers.get('sec-fetch-site') === 'same-origin');
  }
  async function upstream(endpoint: string, options: RequestInit = {}) {
    return fetcher(backend!.origin + endpoint, { ...options, cache: 'no-store', credentials: 'omit', redirect: 'manual', signal: AbortSignal.timeout(10000) });
  }
  async function revoke(token: string) {
    try { await upstream('/api/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } }); } catch { /* Local sign-out must still complete. */ }
  }

  return {
    start(request: Request): Response {
      if (!available(request)) return loginError(request, 'unavailable');
      cleanup();
      const params = new URL(request.url).searchParams;
      if (request.method !== 'GET' || Array.from(params.keys()).some(key => key !== 'returnTo') || params.getAll('returnTo').length > 1) return loginError(request, 'invalid');
      const existing = active(request);
      if (existing) return new Response(null, { status: 303, headers: { ...PRIVATE, Location: new URL(safeTagtogReturnTo(params.get('returnTo')), callback!.origin).href } });
      const oldId = cookie(request, TX_COOKIE);
      if (oldId) store.transactions.delete(oldId);
      if (store.transactions.size >= 1000) return loginError(request, 'unavailable');
      const id = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url'), state = randomBytes(32).toString('base64url');
      store.transactions.set(id, { state, verifier, returnTo: safeTagtogReturnTo(params.get('returnTo')), expires: now() + 300000 });
      const location = new URL('/sso/authorize', portal!);
      location.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: callback!.href, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', state }).toString();
      const headers = new Headers({ ...PRIVATE, Location: location.href });
      headers.append('Set-Cookie', cookieHeader(TX_COOKIE, id, 300));
      return new Response(null, { status: 303, headers });
    },

    async callback(request: Request): Promise<Response> {
      if (!available(request)) return loginError(request, 'unavailable');
      cleanup();
      const id = cookie(request, TX_COOKIE), transaction = id ? store.transactions.get(id) : null;
      if (id) store.transactions.delete(id);
      const params = new URL(request.url).searchParams, state = params.get('state') || '';
      if (request.method !== 'GET' || !transaction || transaction.expires <= now() || !OPAQUE.test(state) || !equal(transaction.state, state)
        || Array.from(params.keys()).some(key => !['code', 'state', 'error'].includes(key))
        || Array.from(params.keys()).some(key => params.getAll(key).length !== 1)) return loginError(request, 'expired');
      if (params.has('error')) return loginError(request, 'access_denied');
      const code = params.get('code') || '';
      if (!CODE.test(code)) return loginError(request, 'invalid');
      let exchangedToken: string | null = null;
      try {
        const response = await upstream('/api/tagtog/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ code, codeVerifier: transaction.verifier, redirectUri: callback!.href }) });
        if (response.status !== 200) return loginError(request, response.status === 403 ? 'access_denied' : response.status === 409 ? 'link_required' : response.status === 401 ? 'expired' : 'unavailable');
        const data = await response.json();
        if (typeof data?.token !== 'string' || !OPAQUE.test(data.token)) return loginError(request, 'access_denied');
        exchangedToken = data.token;
        const expires = Date.parse(data.expiresAt);
        if (!Number.isFinite(expires) || expires <= now()) { await revoke(data.token); return loginError(request, 'expired'); }
        const profile = await upstream('/api/auth/me', { headers: { Authorization: 'Bearer ' + data.token, Accept: 'application/json' } });
        if (profile.status !== 200) { await revoke(data.token); return loginError(request, profile.status === 401 || profile.status === 403 ? 'access_denied' : 'unavailable'); }
        const user = publicUser(await profile.json());
        if (!user || store.sessions.size >= 1000) { await revoke(data.token); return loginError(request, user ? 'unavailable' : 'access_denied'); }
        const old = active(request);
        if (old) { store.sessions.delete(old.id); await revoke(old.session.token); }
        const sessionId = randomBytes(32).toString('base64url'), sessionExpires = Math.min(expires, now() + 12 * 3600000);
        store.sessions.set(sessionId, { token: data.token, csrf: randomBytes(32).toString('base64url'), expires: sessionExpires });
        const destination = user.roles.includes('ADMIN') || user.roles.includes('MANAGER') ? transaction.returnTo : '/dashboard/events';
        const headers = new Headers({ ...PRIVATE, Location: new URL(destination, callback!.origin).href });
        headers.append('Set-Cookie', cookieHeader(TX_COOKIE, '', 0));
        headers.append('Set-Cookie', cookieHeader(SESSION_COOKIE, sessionId, Math.max(1, Math.floor((sessionExpires - now()) / 1000))));
        return new Response(null, { status: 303, headers });
      } catch { if (exchangedToken) await revoke(exchangedToken); return loginError(request, 'unavailable'); }
    },

    async session(request: Request): Promise<Response> {
      if (!available(request)) return errorJson(503, 'SSO_UNAVAILABLE');
      if (request.method !== 'GET' || request.headers.get('x-tagtog-request') !== '1'
        || request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin') return errorJson(403, 'INVALID_ORIGIN');
      const current = active(request);
      if (!current) return errorJson(401, 'SESSION_ENDED', true);
      try {
        const response = await upstream('/api/auth/me', { headers: { Authorization: 'Bearer ' + current.session.token, Accept: 'application/json' } });
        if (response.status === 401 || response.status === 403) { store.sessions.delete(current.id); return errorJson(response.status, 'SESSION_ENDED', true); }
        if (response.status !== 200) return errorJson(503, 'IAM_UNAVAILABLE');
        const user = publicUser(await response.json());
        if (!user) { store.sessions.delete(current.id); return errorJson(401, 'INVALID_PROFILE', true); }
        return json(200, { user, csrfToken: current.session.csrf });
      } catch { return errorJson(503, 'IAM_UNAVAILABLE'); }
    },

    async logout(request: Request): Promise<Response> {
      if (!available(request)) return errorJson(503, 'SSO_UNAVAILABLE');
      const current = active(request);
      if (request.method !== 'POST' || request.headers.get('origin') !== callback!.origin
        || current && !sameOriginWrite(request, current.session)) return errorJson(403, 'INVALID_CSRF');
      if (current) { store.sessions.delete(current.id); await revoke(current.session.token); }
      return json(200, { signedOut: true }, true);
    },

    async proxy(request: Request): Promise<Response> {
      if (!available(request)) return errorJson(503, 'SSO_UNAVAILABLE');
      const current = active(request);
      if (!current) return errorJson(401, 'SESSION_ENDED', true);
      const url = new URL(request.url), pathname = url.pathname.slice('/api/crm'.length);
      if (!url.pathname.startsWith('/api/crm/api/') || !/^\/api\/[A-Za-z0-9_/-]+$/.test(pathname)
        || pathname.includes('//') || /^\/api\/tagtog(?:\/|$)/.test(pathname)
        || /^\/api\/auth(?:\/|$)/.test(pathname) && pathname !== '/api/auth/me') return errorJson(403, 'INVALID_API_PATH');
      if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return errorJson(403, 'INVALID_METHOD');
      const mutating = !['GET', 'HEAD'].includes(request.method);
      // Legacy flag-list reads can update contacts, so they need the same browser intent check as writes.
      const mutatingRead = /^\/api\/flagged-identities(?:\/list)?\/?$/.test(pathname);
      if ((mutating || mutatingRead) && !sameOriginWrite(request, current.session, !mutating)) return errorJson(403, 'INVALID_CSRF');
      try {
        const headers = new Headers({ Authorization: 'Bearer ' + current.session.token, Accept: request.headers.get('accept') || 'application/json' });
        if (request.headers.has('content-type')) headers.set('Content-Type', request.headers.get('content-type')!);
        let body: ArrayBuffer | undefined;
        if (mutating) { if (Number(request.headers.get('content-length') || 0) > 26214400) return json(413, { message: 'The upload is too large.' }); body = await request.arrayBuffer(); if (body.byteLength > 26214400) return json(413, { message: 'The upload is too large.' }); }
        const response = await upstream(pathname + url.search, { method: request.method, headers, ...(body ? { body } : {}) });
        if (response.status === 401) { store.sessions.delete(current.id); return errorJson(401, 'SESSION_ENDED', true); }
        if (response.status >= 300 && response.status < 400) return errorJson(503, 'INVALID_UPSTREAM');
        const outputHeaders = new Headers(PRIVATE);
        for (const name of ['content-type', 'content-disposition']) if (response.headers.has(name)) outputHeaders.set(name, response.headers.get(name)!);
        return new Response(response.status === 204 || request.method === 'HEAD' ? null : await response.arrayBuffer(), { status: response.status, headers: outputHeaders });
      } catch { return errorJson(503, 'CRM_UNAVAILABLE'); }
    }
  };
}

const processState = globalThis as typeof globalThis & { __crmTagtogSsoStore?: TagtogStore };
function currentHandlers() {
  const store = processState.__crmTagtogSsoStore ||= newTagtogStore();
  return createTagtogHandlers({ enabled: process.env.NEXT_PUBLIC_TAGTOG_SSO_ENABLED === 'true',
    portalUrl: process.env.TAGTOG_PORTAL_URL || 'http://127.0.0.1:4180',
    callbackUrl: process.env.CRM_TAGTOG_CALLBACK_URL || 'http://127.0.0.1:8188/api/tagtog/callback',
    apiBaseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:8186', clientId: process.env.TAGTOG_CLIENT_ID || 'crm-local' }, { store });
}
function nextRequest(request: Request) { return normalizeTagtogNextRequest(request, process.env.CRM_TAGTOG_CALLBACK_URL || 'http://127.0.0.1:8188/api/tagtog/callback'); }
export function startTagtogSso(request: Request) { return currentHandlers().start(nextRequest(request)); }
export function callbackTagtogSso(request: Request) { return currentHandlers().callback(nextRequest(request)); }
export function getTagtogSession(request: Request) { return currentHandlers().session(nextRequest(request)); }
export function logoutTagtogSession(request: Request) { return currentHandlers().logout(nextRequest(request)); }
export function proxyCrmRequest(request: Request) { return currentHandlers().proxy(nextRequest(request)); }
