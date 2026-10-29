# CRM central login — local prototype

This branch connects CRM to TAGTOG using the existing EMS-IAM identity and an explicit mapping to an existing CRM user. Existing CRM user IDs, roles, and event membership are retained. Account packages, personal/company workspace isolation, and business expiry are not implemented by this login prototype. Do not enable it for external customer workspaces until data isolation is implemented and tested.

The local integration branch includes the current CRM main updates (Node 24.22.1, Next.js 16.4.3, dashboard and EMS v2). Run with these process environment variables:

```text
NEXT_PUBLIC_TAGTOG_SSO_ENABLED=true
API_BASE_URL=http://127.0.0.1:8186
TAGTOG_PORTAL_URL=http://127.0.0.1:4180
CRM_TAGTOG_CALLBACK_URL=http://127.0.0.1:8188/api/tagtog/callback
TAGTOG_CLIENT_ID=crm-local
```

Start Next on the pinned loopback address: `node node_modules/next/dist/bin/next dev --webpack -H 127.0.0.1 -p 8188`. IAM and CRM backend must already run with the corresponding local integration configuration. No production environment files are needed.

- `/api/tagtog/start`: creates a browser-bound five-minute state/PKCE transaction, then redirects to TAGTOG.
- `/api/tagtog/callback`: atomically consumes the transaction, exchanges the one-use code through CRM backend, verifies `/api/auth/me`, then sets an HttpOnly, SameSite=Lax session cookie.
- `/api/tagtog/session`: returns the fresh CRM profile and an in-memory CSRF token, never a bearer token.
- `/api/crm/api/*`: a fixed-backend API proxy. Browser-supplied authorization/cookies are not forwarded. Writes require the exact Origin and a session CSRF header. Internal SSO and password-login endpoints are not proxied.
- `/api/tagtog/logout`: clears the CRM BFF session and attempts backend session revocation. This signs out of CRM; global workspace sign-out is available in TAGTOG.

IAM/CRM tokens remain in the Node process and are not put in URLs, browser storage, or JSON session responses. Restarting Next clears BFF sessions and transactions. This store is suitable only for a single local instance. The feature flag defaults to disabled, preserving existing CRM login outside this prototype. In SSO mode legacy browser credentials and cached profile/role data are not used.

Security tests use mocked local request/response objects and do not contact external services: `node tests/tagtog-sso.test.mjs`. Type check: `npm run type-check`. Full portal → IAM → CRM acceptance must also be tested against the isolated local stack.

## IAM access checks

IAM must grant access to the enabled `CRM` system and the `workspace` feature. Its current view/create/edit/delete permissions are checked by the CRM backend on every protected request. The mapped CRM user's existing role and assigned events further restrict that permission; a shared email or a global role name never creates or upgrades a CRM account automatically. Revocation, an inactive identity, missing mapping, or an unavailable IAM service denies access.

The local runner uses a separate IAM database and a historical local CRM copy. It does not use the live CRM database or migrate live IAM accounts. Local contact counts may differ from production. The original CRM main checkouts remain separate from this integration branch.

With Docker and the two existing labelled local databases running, start only the required services from the sibling `tagtog portal` directory:

```powershell
node local-stack.cjs start iam portal
node crm-local.cjs start
node test/crm-legacy-e2e.cjs
```

The acceptance script checks the existing mapped local accounts and event scopes using business reads only. It must not be replaced with the empty-fixture seed script when the historical local copy is active.