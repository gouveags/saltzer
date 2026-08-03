# Threat model

This is the baseline threat model for the Daily Contract vertical slice. Update it whenever a change adds a new actor, trust boundary, integration, or external side effect.

## Assets and actors

Sensitive assets are credentials, session cookies, bearer tokens, outcome context, constraints, decision history, and ownership metadata.

Actors are:

- a signed-in person using web or native Saltzer;
- a CLI or MCP client holding an explicit bearer token;
- the public API and authentication boundary;
- PostgreSQL as the system of record;
- an untrusted website, caller, dependency, or compromised token holder.

No model provider receives data in this slice. “Start with AI” displays the exact permissioned context packet locally; provider invocation and external actions require separate future threat models.

## Trust boundaries and controls

| Threat | Current control | Verification |
| --- | --- | --- |
| Cross-account object access | The API derives `userId` from a session or token; repositories include it in every object query and mutation. | API integration test attempts a second-user update and receives `404`. |
| Daily-limit race | PostgreSQL advisory locks serialize writes for one user and local date. | Four concurrent repository writes yield three outcomes and one domain error. |
| Closed-day mutation race | Contract row locks serialize close, edit, and decision transactions; every write checks the durable contract status. | Repository tests reject later additions, edits, decisions, and scheduled moves; the browser journey verifies the closed state. |
| Forged or malformed input | Zod schemas validate dates, UUIDs, lengths, decisions, permissions, and estimates at the HTTP boundary. | Domain and API tests cover invalid and limit paths. |
| CSRF from an untrusted website | Credentialed CORS uses an explicit allowlist; state changes require JSON or PATCH; Better Auth has an explicit trusted-origin list. | Browser and API integration tests use only the configured origin. |
| Bearer-token disclosure | Tokens contain 256 bits of randomness, are returned once, sent only in the `Authorization` header, and stored as SHA-256 hashes. | SDK and API tests assert header transport, one-way storage behavior, and token auth. |
| Token privilege escalation | Token-authenticated callers cannot mint more tokens. | API integration tests assert `SESSION_REQUIRED`. |
| Hidden AI data access | The domain constructs a bounded context packet from one owned outcome and explicit permissions. | MCP and browser journeys inspect the exact payload. |
| Cross-account behavior inference | Reality checks query decision events by authenticated `userId` and a bounded local-date window; clients cannot submit ownership identifiers. | Repository and API integration tests prove another user receives no contract or decision history. |
| XSS through outcome text | React Native renders text as text nodes; there is no raw HTML path. | Browser journey exercises user-controlled context. |
| Response sniffing and framing | Hono secure headers add HSTS, `nosniff`, frame, referrer, and cross-origin policies. | API integration test checks security headers. |
| Dependency compromise | Frozen lockfile, minimum release age, high/critical audit gate, dependency review, Dependabot, and secret push protection. | GitHub CI and repository security settings. |

## Production gates

The first hosted release must not launch until all of these are owned and verified:

- TLS termination, a strong rotated `BETTER_AUTH_SECRET`, and an exact production-origin allowlist;
- distributed rate limiting for sign-in, sign-up, token, and write endpoints;
- encrypted managed PostgreSQL, least-privilege credentials, tested backups, and restore drills;
- token listing, expiry defaults, revocation UI, and incident-response rotation guidance;
- structured audit logs that exclude credentials and private outcome bodies;
- a web content-security policy at the static hosting boundary;
- abuse, availability, and data-retention decisions appropriate to the hosting model.

## Accepted development-only exposure

The current dependency audit reports two moderate issues in transitive build tooling (`esbuild` under deprecated Drizzle tooling and `uuid` under Expo’s Xcode tooling). Neither path runs in the deployed API or browser bundle. CI still reports them, fails on high or critical findings, and Dependabot tracks upstream remediation. We do not force incompatible transitive major overrides merely to make the report visually empty.
