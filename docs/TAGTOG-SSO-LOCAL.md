# CRM central login — local prototype

This branch connects CRM to TAGTOG using the existing EMS-IAM identity and an explicit mapping to an existing CRM user. Existing CRM user IDs, roles, and event membership are retained. Account packages, personal/company workspace isolation, and business expiry are not implemented by this login prototype. Do not enable it for external customer workspaces until data isolation is implemented and tested.

Run with Node 20+ and these process environment variables:

```text
NEXT_PUBLIC_TAGTOG_SSO_ENABLED=true
API_BASE_URL=http://127.0.0.1:8186
TAGTOG_PORTAL_URL=http://127.0.0.1:4180
CRM_TAGTOG_CALLBACK_URL=http://127.0.0.1:8188/api/tagtog/callback
TAGTOG_CLIENT_ID=crm-local
```

Start Next on the pinned loopback address: `node node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 8188`. IAM and CRM backend must already run with the corresponding local integration configuration. No production environment files are needed.

- `/api/tagtog/start`: creates a browser-bound five-minute state/PKCE transaction, then redirects to TAGTOG.
- `/api/tagtog/callback`: atomically consumes the transaction, exchanges the one-use code through CRM backend, verifies `/api/auth/me`, then sets an HttpOnly, SameSite=Lax session cookie.
- `/api/tagtog/session`: returns the fresh CRM profile and an in-memory CSRF token, never a bearer token.
- `/api/crm/api/*`: a fixed-backend API proxy. Browser-supplied authorization/cookies are not forwarded. Writes require the exact Origin and a session CSRF header. Internal SSO and password-login endpoints are not proxied.
- `/api/tagtog/logout`: clears the CRM BFF session and attempts backend session revocation. This signs out of CRM; global workspace sign-out is available in TAGTOG.

IAM/CRM tokens remain in the Node process and are not put in URLs, browser storage, or JSON session responses. Restarting Next clears BFF sessions and transactions. This store is suitable only for a single local instance. The feature flag defaults to disabled, preserving existing CRM login outside this prototype. In SSO mode legacy browser credentials and cached profile/role data are not used.

Security tests use mocked local request/response objects and do not contact external services: `node tests/tagtog-sso.test.mjs`. Type check: `npm run type-check`. Full portal → IAM → CRM acceptance must also be tested against the isolated local stack.
