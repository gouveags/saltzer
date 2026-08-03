# Focus and Progress Loop

## Product contract

Saltzer turns a Daily Contract into forward motion without choosing the day for
the user. A person may focus one planned outcome at a time. Starting focus
requires a concrete next move. A check-in records what changed and makes an
explicit decision to continue, pause, or name a blocker.

This preserves the product's core boundary:

- The person chooses the outcomes and decides when focus changes.
- Saltzer reduces activation energy and makes switching deliberate.
- An AI may read or advance the active outcome only through the same explicit,
  permissioned state exposed to the human.

## Why this comes next

The Daily Contract solves prioritization, but the previous experience became
passive after planning. Real knowledge work is interrupted by reviews,
incidents, approvals, and handoffs. A list of three good outcomes still leaves
the person to repeatedly reconstruct what to do next.

The focus loop closes that intention-to-action gap:

1. Select an outcome already chosen for today.
2. Name the smallest concrete next move.
3. Work with the active outcome and its permissioned context.
4. Check in with what changed.
5. Continue with a new next move, pause cleanly, or capture a blocker.

## Invariants

- At most one outcome per user has active focus.
- Only a planned outcome in an open Daily Contract can receive focus.
- Continuing requires both a progress note and the next concrete move.
- Blocking and pausing end active focus without completing the outcome.
- Completing, releasing, or rescheduling an outcome always clears focus.
- Every transition is recorded as an outcome event.
- Focus and progress endpoints derive ownership from the authenticated session
  or token; callers never provide a user identifier.

## AI boundary

The context packet now includes the user-authored next action and latest
progress note. This lets an agent resume from the exact execution state instead
of regenerating a plan from broad context. It still receives no hidden backlog
and has no authority for external side effects.

## Non-goals

- Timers, streaks, and productivity scoring
- Automatic selection of the user's focus
- Surveillance or passive activity capture
- Silent rescheduling or autonomous external actions

## Acceptance evidence

- Starting one focus atomically clears any prior focus for the same user.
- Focus and its next move survive a reload.
- Continue, blocked, and pause transitions persist their honest state.
- Cross-user focus attempts return not found.
- Web and phone layouts expose the same execution loop.
- SDK, CLI, and MCP use the authenticated public API rather than database code.
