# Product vision

## North star

Help individuals decide what matters today, execute it well, and become more
productive in a healthy way.

Saltzer is the daily execution system shared by a person and their AI. It is
not a backlog with an AI button. The person chooses what matters, Saltzer
assembles permissioned context, the person or assistant acts, and the result
improves the next deliberate choice.

## V1: the Daily Contract

The first release owns one complete loop:

1. Choose at most three meaningful outcomes for today.
2. Record why each matters, the desired result, constraints, and useful context.
3. Start manually or export a permissioned context packet to an AI provider.
4. Complete, release, or deliberately reschedule the outcome.
5. Close the day and reconsider unfinished work instead of carrying it silently.
6. Surface genuinely scheduled work on the intended date.

## Acceptance criteria

- A new user can create an account and a Daily Contract from web or native.
- The API rejects a fourth outcome in the same Daily Contract even under concurrent requests.
- Completing, releasing, and rescheduling are distinct durable transitions.
- An unfinished outcome never appears in another day without an explicit choice.
- Closing requires a decision for every outcome and makes the Daily Contract immutable.
- Scheduled outcomes become eligible on their selected local date.
- A context packet previews the exact information and allowed action shared with AI.
- CLI and MCP can read and mutate the same authenticated Daily Contract.
- Empty, loading, offline, validation, and server-error states remain coherent.
- Local setup, migrations, tests, builds, and self-hosting are documented.

## Explicitly outside V1

- Team workspaces, assignments, reporting, and enterprise permissions
- A general project hierarchy or infinite backlog
- Automatic calendar time-blocking
- Dozens of shallow integrations
- Autonomous AI actions without explicit user permission
- Persisting raw third-party provider keys before encrypted credential storage exists

## Product gates

The first product measure is not total tasks created. It is the percentage of
people who form a real Daily Contract and complete one meaningful outcome within
24 hours. Healthy retention means returning to plan deliberately at least three
days per week—not compulsive engagement.
