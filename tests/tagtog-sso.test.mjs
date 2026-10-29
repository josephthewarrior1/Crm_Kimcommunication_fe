import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../lib/server/tagtogSso.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', output)(require, mod, mod.exports);
const { createTagtogHandlers, newTagtogStore, safeTagtogReturnTo, normalizeTagtogNextRequest } = mod.exports;
const origin = 'http://127.0.0.1:8188';
const config = { enabled: true, portalUrl: 'http://127.0.0.1:4180', callbackUrl: origin + '/api/tagtog/callback', apiBaseUrl: 'http://127.0.0.1:8186', clientId: 'crm-local' };
const token = 'a'.repeat(43);
const code = 'c'.repeat(43);
const user = { id: 23, username: 'local-crm', email: 'local@example.test', fullName: 'Local CRM', roles: ['ADMIN'], allowedEventIds: [7] };
const body = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const request = (path, options = {}) => new Request(origin + path, options);
const getCookie = (response, name) => {
  const value = response.headers.get('set-cookie') || '';
  const match = value.match(new RegExp('(?:^|,\\s*)' + name + '=([^;]*)'));
  return match ? name + '=' + match[1] : '';
};
function fixture(options = {}) {
  let now = Date.parse('2026-10-21T05:00:00Z');
  const store = newTagtogStore(), calls = [];
  const fetcher = async (url, init = {}) => {
    assert.ok(String(url).startsWith(config.apiBaseUrl + '/api/'), 'Only the pinned local backend is contacted');
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/api/tagtog/exchange')) return options.exchange ? options.exchange() : body({ token, expiresAt: new Date(now + 3600000).toISOString(), ...user });
    if (String(url).endsWith('/api/auth/me')) return options.me ? options.me() : body({ ...user, password: 'never-return-this', secret: 'never-return-this' });
    if (String(url).endsWith('/api/auth/logout')) { if (options.logoutFail) throw new Error('Local service unavailable'); return body({ signedOut: true }); }
    return options.proxy ? options.proxy() : body({ items: [] });
  };
  const handlers = createTagtogHandlers({ ...config, ...options.config }, { store, fetch: fetcher, now: () => now });
  return { handlers, store, calls, advance: milliseconds => { now += milliseconds; } };
}
function start(f, returnTo = '/dashboard/events?eventId=7') {
  const response = f.handlers.start(request('/api/tagtog/start?returnTo=' + encodeURIComponent(returnTo)));
  assert.equal(response.status, 303);
  const authorize = new URL(response.headers.get('location'));
  return { cookie: getCookie(response, 'crm_tagtog_transaction'), state: authorize.searchParams.get('state'), response, authorize };
}
async function login(f) {
  const tx = start(f);
  const response = await f.handlers.callback(request('/api/tagtog/callback?code=' + code + '&state=' + tx.state, { headers: { cookie: tx.cookie } }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), origin + '/dashboard/events?eventId=7');
  const cookie = getCookie(response, 'crm_tagtog_session');
  const sessionResponse = await f.handlers.session(request('/api/tagtog/session', { headers: { cookie, 'X-TAGTOG-Request': '1' } }));
  assert.equal(sessionResponse.status, 200);
  return { cookie, response, session: await sessionResponse.json() };
}

test('disabled or unsafe configuration fails without an upstream request', () => {
  for (const changed of [{ enabled: false }, { portalUrl: 'http://example.test' }, { callbackUrl: origin + '/wrong' }, { apiBaseUrl: 'http://127.0.0.1:8186/path' }]) {
    const f = fixture({ config: changed });
    const response = f.handlers.start(request('/api/tagtog/start'));
    assert.ok(response.status === 303 || response.status === 503);
    assert.equal(f.calls.length, 0);
    assert.equal(f.store.transactions.size, 0);
  }
});

test('returnTo resumes dashboard paths and rejects open redirects or encoded tricks', () => {
  assert.equal(safeTagtogReturnTo('/dashboard/events?eventId=7'), '/dashboard/events?eventId=7');
  for (const value of ['https://example.test', '//example.test', '/dashboard-evil', '/dashboard/../../login', '/dashboard/%2f%2fevil', '/dashboard/\\evil', '/dashboard?x=%250a', '/login', '/dashboard#token', '/dashboard\n']) assert.equal(safeTagtogReturnTo(value), '/dashboard');
});

test('start uses browser-bound state, server-held verifier, exact callback and no-store', () => {
  const f = fixture(), tx = start(f);
  assert.equal(tx.authorize.origin, config.portalUrl);
  assert.equal(tx.authorize.pathname, '/sso/authorize');
  assert.equal(tx.authorize.searchParams.get('client_id'), 'crm-local');
  assert.equal(tx.authorize.searchParams.get('redirect_uri'), config.callbackUrl);
  assert.equal(tx.authorize.searchParams.get('code_challenge_method'), 'S256');
  assert.match(tx.state, /^[A-Za-z0-9_-]{43}$/);
  assert.match(tx.authorize.searchParams.get('code_challenge'), /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!tx.response.headers.get('location').includes('verifier'));
  assert.match(tx.response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=300/);
  assert.match(tx.response.headers.get('cache-control'), /no-store/);
});

test('callback rejects absent browser binding, mismatched state and duplicates before exchange', async () => {
  for (const issue of ['missing-cookie', 'wrong-state', 'duplicate-code']) {
    const f = fixture(), tx = start(f);
    const response = await f.handlers.callback(request('/api/tagtog/callback?code=' + code + '&state=' + (issue === 'wrong-state' ? 'w'.repeat(43) : tx.state) + (issue === 'duplicate-code' ? '&code=' + code : ''), { headers: issue === 'missing-cookie' ? {} : { cookie: tx.cookie } }));
    assert.equal(new URL(response.headers.get('location')).pathname, '/login');
    assert.equal(f.calls.length, 0);
  }
});

test('callback consumes the transaction before exchange so replay and expired callbacks fail', async () => {
  const f = fixture(), tx = start(f);
  const req = () => request('/api/tagtog/callback?code=' + code + '&state=' + tx.state, { headers: { cookie: tx.cookie } });
  await f.handlers.callback(req());
  const replay = await f.handlers.callback(req());
  assert.match(replay.headers.get('location'), /ssoError=expired/);
  assert.equal(f.calls.filter(call => call.url.endsWith('/api/tagtog/exchange')).length, 1);
  const expired = fixture(), old = start(expired); expired.advance(300001);
  assert.match((await expired.handlers.callback(request('/api/tagtog/callback?code=' + code + '&state=' + old.state, { headers: { cookie: old.cookie } }))).headers.get('location'), /expired/);
  assert.equal(expired.calls.length, 0);
});

test('successful callback retains CRM token server-side and returns only a sanitized fresh profile', async () => {
  const f = fixture(), signedIn = await login(f);
  assert.deepEqual(signedIn.session.user, user);
  assert.match(signedIn.session.csrfToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(signedIn.session.token, undefined);
  assert.ok(!JSON.stringify(signedIn.session).includes('never-return-this'));
  assert.ok(!signedIn.cookie.includes(token));
  assert.ok(!signedIn.response.headers.get('location').includes(token));
  assert.match(signedIn.response.headers.get('set-cookie'), /crm_tagtog_session=.*Path=\/; HttpOnly; SameSite=Lax/);
  const exchange = f.calls.find(call => call.url.endsWith('/api/tagtog/exchange'));
  assert.deepEqual(Object.keys(JSON.parse(exchange.init.body)).sort(), ['code', 'codeVerifier', 'redirectUri']);
  assert.equal(JSON.parse(exchange.init.body).redirectUri, config.callbackUrl);
});

test('mapping, access denial and service errors use fixed friendly reasons without upstream bodies', async () => {
  for (const [status, reason] of [[409, 'link_required'], [403, 'access_denied'], [401, 'expired'], [503, 'unavailable']]) {
    const f = fixture({ exchange: () => body({ password: 'do-not-expose' }, status) }), tx = start(f);
    const response = await f.handlers.callback(request('/api/tagtog/callback?code=' + code + '&state=' + tx.state, { headers: { cookie: tx.cookie } }));
    assert.equal(response.headers.get('location'), origin + '/login?ssoError=' + reason);
    assert.ok(!(await response.text()).includes('do-not-expose'));
    assert.equal(f.store.sessions.size, 0);
  }
});

test('session rejects forged/duplicate cookies, cross-site reads and missing custom header', async () => {
  const f = fixture(), signedIn = await login(f);
  assert.equal((await f.handlers.session(request('/api/tagtog/session', { headers: { cookie: 'crm_tagtog_session=' + 'z'.repeat(43), 'X-TAGTOG-Request': '1' } }))).status, 401);
  assert.equal((await f.handlers.session(request('/api/tagtog/session', { headers: { cookie: signedIn.cookie + '; ' + signedIn.cookie, 'X-TAGTOG-Request': '1' } }))).status, 401);
  assert.equal((await f.handlers.session(request('/api/tagtog/session', { headers: { cookie: signedIn.cookie } }))).status, 403);
  assert.equal((await f.handlers.session(request('/api/tagtog/session', { headers: { cookie: signedIn.cookie, 'X-TAGTOG-Request': '1', 'sec-fetch-site': 'cross-site' } }))).status, 403);
});

test('proxy supplies its own bearer and never forwards browser cookies or authorization', async () => {
  const f = fixture(), signedIn = await login(f);
  const response = await f.handlers.proxy(request('/api/crm/api/events?search=abc', { headers: { cookie: signedIn.cookie, Authorization: 'Bearer injected', 'X-Debug': 'untrusted' } }));
  assert.equal(response.status, 200);
  const proxied = f.calls.at(-1);
  assert.equal(proxied.url, config.apiBaseUrl + '/api/events?search=abc');
  assert.equal(proxied.init.headers.get('authorization'), 'Bearer ' + token);
  assert.equal(proxied.init.headers.get('cookie'), null);
  assert.equal(proxied.init.headers.get('x-debug'), null);
  assert.equal(proxied.init.redirect, 'manual');
});

test('proxy writes require exact Origin, unguessable CSRF and same-origin fetch metadata', async () => {
  const f = fixture(), signedIn = await login(f), initial = f.calls.length;
  for (const extra of [{}, { origin }, { origin: 'http://127.0.0.1:4180', 'x-crm-csrf': signedIn.session.csrfToken }, { origin, 'x-crm-csrf': 'é'.repeat(43) }, { origin, 'x-crm-csrf': signedIn.session.csrfToken, 'sec-fetch-site': 'cross-site' }]) {
    assert.equal((await f.handlers.proxy(request('/api/crm/api/events', { method: 'POST', headers: { cookie: signedIn.cookie, ...extra }, body: '{}' }))).status, 403);
  }
  assert.equal(f.calls.length, initial);
  assert.equal((await f.handlers.proxy(request('/api/crm/api/events', { method: 'POST', headers: { cookie: signedIn.cookie, origin, 'x-crm-csrf': signedIn.session.csrfToken, 'content-type': 'application/json' }, body: '{}' }))).status, 200);
});

test('proxy blocks internal/credential/encoded paths and follows no upstream redirect', async () => {
  const f = fixture({ proxy: () => new Response(null, { status: 302, headers: { Location: 'https://example.test' } }) }), signedIn = await login(f);
  const before = f.calls.length;
  for (const path of ['/api/crm/api/tagtog/admin/links', '/api/crm/api/auth/login', '/api/crm/api/auth/logout?token=anything', '/api/crm/api/events%2fsecret', '/api/crm/https://example.test', '/api/crm/api//events']) assert.equal((await f.handlers.proxy(request(path, { headers: { cookie: signedIn.cookie } }))).status, 403);
  assert.equal(f.calls.length, before);
  assert.equal((await f.handlers.proxy(request('/api/crm/api/events', { headers: { cookie: signedIn.cookie } }))).status, 503);
});

test('upstream 401 removes BFF session while ordinary resource 403 keeps it', async () => {
  for (const status of [401, 403]) {
    const f = fixture({ proxy: () => body({ message: 'denied' }, status) }), signedIn = await login(f);
    assert.equal((await f.handlers.proxy(request('/api/crm/api/events', { headers: { cookie: signedIn.cookie } }))).status, status);
    assert.equal(f.store.sessions.size, status === 401 ? 0 : 1);
  }
});

test('fresh session checks deny revoked access and keep session on a service outage', async () => {
  for (const status of [403, 503]) {
    let revoked = false;
    const f = fixture({ me: () => revoked ? body({ error: 'unavailable' }, status) : body(user) }), signedIn = await login(f);
    revoked = true;
    assert.equal((await f.handlers.session(request('/api/tagtog/session', { headers: { cookie: signedIn.cookie, 'X-TAGTOG-Request': '1' } }))).status, status);
    assert.equal(f.store.sessions.size, status === 403 ? 0 : 1);
  }
});

test('logout rejects CSRF and always invalidates local session even when backend logout fails', async () => {
  const f = fixture({ logoutFail: true }), signedIn = await login(f);
  assert.equal((await f.handlers.logout(request('/api/tagtog/logout', { method: 'POST', headers: { cookie: signedIn.cookie, origin } }))).status, 403);
  assert.equal(f.store.sessions.size, 1);
  const response = await f.handlers.logout(request('/api/tagtog/logout', { method: 'POST', headers: { cookie: signedIn.cookie, origin, 'x-crm-csrf': signedIn.session.csrfToken } }));
  assert.equal(response.status, 200);
  assert.equal(f.store.sessions.size, 0);
  assert.match(response.headers.get('set-cookie'), /crm_tagtog_session=;.*Max-Age=0/);
  assert.equal(f.calls.at(-1).url, config.apiBaseUrl + '/api/auth/logout');
  assert.equal(f.calls.at(-1).init.headers.Authorization, 'Bearer ' + token);
});

test('expired BFF sessions cannot use the backend', async () => {
  const f = fixture(), signedIn = await login(f), before = f.calls.length;
  f.advance(3600001);
  assert.equal((await f.handlers.proxy(request('/api/crm/api/events', { headers: { cookie: signedIn.cookie } }))).status, 401);
  assert.equal(f.calls.length, before);
});

test('SSO browser transport ignores legacy bearer storage and uses only CSRF headers', () => {
  const clientSource = readFileSync(new URL('../lib/utils/tagtogAuth.ts', import.meta.url), 'utf8');
  const clientOutput = ts.transpileModule(clientSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const client = { exports: {} }, destinations = [];
  const browser = { location: { search: '?returnTo=%2Fdashboard%2Fevents%3FeventId%3D7', assign: value => destinations.push(value) } };
  const poisonedStorage = { getItem: () => { throw new Error('SSO must not read browser bearer tokens'); } };
  new Function('require', 'module', 'exports', 'process', 'window', 'localStorage', clientOutput)(require, client, client.exports, { env: { NEXT_PUBLIC_TAGTOG_SSO_ENABLED: 'true', NEXT_PUBLIC_API_BASE_URL: 'https://must-not-be-used.example' } }, browser, poisonedStorage);
  assert.equal(client.exports.crmApiBase, '/api/crm');
  assert.deepEqual(client.exports.crmAuthHeaders({ 'Content-Type': 'application/json' }), { 'Content-Type': 'application/json' });
  client.exports.setTagtogCsrf('x'.repeat(43));
  assert.deepEqual(client.exports.crmAuthHeaders(), { 'X-CRM-CSRF': 'x'.repeat(43) });
  client.exports.startCrmSignIn();
  assert.equal(destinations[0], '/api/tagtog/start?returnTo=%2Fdashboard%2Fevents%3FeventId%3D7');
  client.exports.startCrmSignIn('https://example.test');
  assert.equal(destinations[1], '/api/tagtog/start?returnTo=%2Fdashboard');
});

test('Next localhost URL is canonicalized only with exact configured loopback Host and port', async () => {
  const f = fixture();
  const next = new Request('http://localhost:8188/api/tagtog/start?returnTo=%2Fdashboard', { headers: { host: '127.0.0.1:8188' } });
  const normalized = normalizeTagtogNextRequest(next, config.callbackUrl);
  assert.equal(normalized.url, origin + '/api/tagtog/start?returnTo=%2Fdashboard');
  assert.equal(f.handlers.start(normalized).status, 303);
  for (const [url, headers] of [
    ['http://localhost:8188/api/tagtog/start', { host: 'attacker.example', 'x-forwarded-host': '127.0.0.1:8188' }],
    ['http://localhost:9999/api/tagtog/start', { host: '127.0.0.1:8188' }],
    ['http://attacker.example:8188/api/tagtog/start', { host: '127.0.0.1:8188' }],
    [origin + '/api/tagtog/start', { host: 'attacker.example' }],
    ['http://localhost:8188/api/tagtog/start', { 'x-forwarded-host': '127.0.0.1:8188' }]
  ]) {
    const incoming = new Request(url, { headers });
    assert.equal(f.handlers.start(normalizeTagtogNextRequest(incoming, config.callbackUrl)).status, 503);
  }
  assert.equal(normalizeTagtogNextRequest(new Request('http://localhost:8188/api/tagtog/start', { headers: { host: 'secure.example' } }), 'https://secure.example/api/tagtog/callback').url, 'http://localhost:8188/api/tagtog/start');
});

test('Next request normalization preserves POST body and requires original browser Origin and CSRF', async () => {
  const f = fixture(), signedIn = await login(f);
  const incoming = new Request('http://localhost:8188/api/crm/api/events', { method: 'POST', headers: { host: '127.0.0.1:8188', cookie: signedIn.cookie, origin, 'x-crm-csrf': signedIn.session.csrfToken, 'content-type': 'application/json' }, body: '{"name":"local"}' });
  const response = await f.handlers.proxy(normalizeTagtogNextRequest(incoming, config.callbackUrl));
  assert.equal(response.status, 200);
  assert.equal(new TextDecoder().decode(f.calls.at(-1).init.body), '{"name":"local"}');
  const forged = new Request('http://localhost:8188/api/crm/api/events', { method: 'POST', headers: { host: '127.0.0.1:8188', cookie: signedIn.cookie, origin: 'https://attacker.example', 'x-crm-csrf': signedIn.session.csrfToken, 'x-forwarded-origin': origin }, body: '{}' });
  assert.equal((await f.handlers.proxy(normalizeTagtogNextRequest(forged, config.callbackUrl))).status, 403);
});

test('flag reads require CSRF even though the legacy route uses GET or HEAD', async () => {
  const f = fixture(), signedIn = await login(f);
  for (const path of ['/api/crm/api/flagged-identities', '/api/crm/api/flagged-identities/list']) {
    for (const method of ['GET', 'HEAD']) {
      const before = f.calls.length;
      for (const extra of [{}, { 'sec-fetch-site': 'cross-site' },
        { 'x-crm-csrf': signedIn.session.csrfToken, origin: 'https://other.example' },
        { 'x-crm-csrf': signedIn.session.csrfToken, 'sec-fetch-site': 'cross-site' }]) {
        assert.equal((await f.handlers.proxy(request(path, { method, headers: { cookie: signedIn.cookie, ...extra } }))).status, 403);
      }
      assert.equal(f.calls.length, before, 'blocked reads never reach the mutating backend');
      assert.equal((await f.handlers.proxy(request(path, { method, headers: {
        cookie: signedIn.cookie, 'x-crm-csrf': signedIn.session.csrfToken, 'sec-fetch-site': 'same-origin'
      } }))).status, 200);
    }
  }
});