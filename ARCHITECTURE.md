# Architecture

Saltzer is a TypeScript monorepo organized around one product domain rather
than around delivery platforms. Web, iOS, Android, CLI, and MCP are adapters;
the daily-execution rules live in `packages/domain` and are not duplicated.

## Runtime shape

```text
Expo product (web/iOS/Android) ─┐
CLI ────────────────────────────┼─> Hono API ─> domain services ─> PostgreSQL
MCP server ─────────────────────┘       │
                                       └─> provider-neutral AI adapter
```

The API is the authorization and persistence boundary. Clients never choose a
`userId`; the server derives ownership from the authenticated session or token.
MCP and CLI reuse the public API instead of importing database code.

## Chosen stack

- **Product client:** Expo Router 57 and React Native Web. The daily experience
  shares navigation and behavior across native and web while retaining
  platform-specific files when a native interaction truly differs.
- **API:** Hono on Node.js 22. Hono provides a small Fetch-compatible runtime,
  Zod validation, and OpenAPI generation without framework-specific domain code.
- **Persistence:** PostgreSQL 17 with Drizzle ORM and checked-in SQL migrations.
  PostgreSQL is the durable source of truth; schemas and migrations remain
  inspectable by self-hosters.
- **Authentication:** Better Auth with its Drizzle and Expo integrations.
  Browser sessions use secure cookies; native sessions use secure platform
  storage. API tokens are scoped separately for CLI and MCP.
- **AI:** Vercel AI SDK behind a Saltzer-owned interface. No provider SDK leaks
  into the domain. A context packet remains usable even when AI is disabled.
- **Agent interface:** official Model Context Protocol TypeScript SDK, using
  stdio locally and the same authenticated Saltzer HTTP API as other clients.
- **Workspace:** pnpm workspaces and Turborepo. Biome handles deterministic
  formatting and static linting; TypeScript strict mode protects boundaries.

## Core model

A `DailyContract` belongs to one user and one local calendar date. It contains
at most three active `Outcome` records. An outcome holds the desired result,
context, constraints, estimate, and explicit AI permissions.

Every meaningful transition appends an `OutcomeEvent`. Completion is a result;
release is a healthy decision; rescheduling is explicit. Nothing silently
re-enters a future day. This event history is the foundation for future behavior
understanding without making the visible product more complicated.

Execution state stays equally explicit. A planned outcome can hold a concrete
next action, one user-wide active focus timestamp, the latest progress check-in,
or a captured blocker. Starting a different focus clears the previous one in the
same transaction. Progress events preserve the behavioral history while the
outcome row keeps today's read model fast and simple.

## Boundary rules

1. The server enforces the three-outcome limit transactionally.
2. Dates are user-local `YYYY-MM-DD` values; timestamps are UTC instants.
3. Ownership is checked on every outcome query and mutation.
4. Raw provider credentials never appear in API responses, logs, or events.
5. Context packets disclose exactly what will be shared before an AI action.
6. Clients use optimistic UI only when a server rejection can be rolled back.
7. Only one outcome per user may have active focus; PostgreSQL enforces this with
   a partial unique index in addition to the transactional service rule.

## Deployment posture

The first release is one stateless API process, one statically deployable Expo
web bundle, PostgreSQL, and separately distributed native/CLI/MCP clients. This
shape runs locally in Compose and can be deployed to any container platform;
the product is not coupled to a single cloud or model provider.
