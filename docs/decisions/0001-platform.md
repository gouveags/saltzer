# ADR 0001: Universal TypeScript platform

**Status:** Accepted — 2026-08-03

## Decision

Use a TypeScript monorepo with Expo Router for iOS, Android, and web; Hono for
the API; PostgreSQL and Drizzle for persistence; Better Auth for identity;
Commander for CLI; and the official MCP TypeScript SDK for agent access.

## Why

Saltzer's core moat is a coherent daily loop, not platform-specific feature
drift. Expo's current workspace support and web rendering let the product share
interaction logic while still allowing native implementations where they add
real value. A separate API keeps authentication and data ownership portable.

Hono's Fetch-compatible surface, Drizzle's inspectable SQL migrations, and the
official MCP SDK keep self-hosting straightforward. The Vercel AI SDK is used
only as a replaceable provider adapter.

## Consequences

- Native and web dependencies must remain on one compatible React version.
- The Expo client disables `exactOptionalPropertyTypes` because the current
  Better Auth Expo plugin and TypeScript 6 declarations are incompatible with
  that flag. Its native adapter contains one isolated compatibility cast for
  the plugin's `getCookie` action. Domain, database, SDK, and API packages keep
  exact optional-property checking enabled.
- SEO-heavy marketing pages may later become a separate static app if Expo's
  static output stops being sufficient; the authenticated product stays shared.
- Domain packages cannot import React, Hono, Expo, Drizzle, or provider SDKs.
- AGPL-3.0 applies to network deployment of modified versions.
