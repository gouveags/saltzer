# Morning Reality Check

The Daily Contract should fit the day a person actually has. The Morning Reality
Check asks for one explicit fact—available focused minutes—then compares it with
the estimates on today’s chosen outcomes.

## Product contract

- Capacity belongs to one user and one local date and may be changed while the
  Daily Contract is open.
- Saltzer sums only planned outcomes. Completed or released work no longer
  consumes the remaining room shown for the day.
- Missing estimates stay visible as unknown work; they are never treated as
  evidence that the plan fits.
- Scheduled candidates are counted separately so waiting work cannot quietly
  enter the Daily Contract.
- Recent behavior is a bounded seven-day summary of recorded complete, release,
  and reschedule decisions. A person with no history sees “Learning,” not a fake
  score or recommendation.
- Closed Daily Contracts reject capacity changes.
- The permissioned AI context packet contains the same capacity, planned,
  remaining, and status values visible to the person.

## API contract

`PATCH /v1/contracts/{date}/capacity` accepts:

```json
{ "capacityMinutes": 180 }
```

`GET /v1/today?date=YYYY-MM-DD` returns a `realityCheck` with the workload,
unknown estimates, scheduled-candidate pressure, and recent decision summary.
The CLI exposes `saltzer capacity --minutes 180` and `saltzer capacity --clear`;
MCP exposes `set_daily_capacity`, where `null` clears an earlier answer.

## Why this shape

This is intentionally not calendar automation or an AI prediction. It closes the
first capacity-realism gap with a small, auditable model and leaves a clean seam
for a future calendar provider to suggest—but never silently overwrite—the
person’s room for the day.
