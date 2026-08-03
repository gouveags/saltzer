# Engineering quality

Saltzer treats quality as a product capability: a daily execution system is only calming when it is predictable, fast, private, and easy to change.

## Architecture rules

1. **The domain owns the rules.** Daily Contract capacity, date semantics, decisions, and permissioned context live in `@saltzer/domain`. They do not import UI, database, HTTP, or AI-provider code.
2. **Use cases cross explicit ports.** The API coordinates authentication and repositories. Web, native, CLI, and MCP are clients of the same contract instead of parallel implementations of the product.
3. **Persistence enforces race-sensitive invariants.** Domain validation gives fast feedback; PostgreSQL transactions, advisory locks, and row locks protect both the three-outcome limit and closed-contract immutability under concurrent requests.
4. **AI is a permissioned collaborator.** A context packet is explicit and inspectable. Provider adapters may consume it, but they may not read hidden product state or perform external side effects without a separate permission.
5. **Prefer a modular monolith.** Package boundaries are deliberate; network boundaries must be earned by operational need.

These rules apply the dependency direction of Clean Architecture and the bounded-model discipline of Domain-Driven Design without inventing abstractions ahead of real change pressure.

## Test strategy

We follow the test-pyramid feedback model:

- Many fast domain and SDK tests cover business rules, validation, date behavior, serialization, and client failures.
- Focused PostgreSQL integration tests cover ownership, migrations, transactions, and concurrency.
- A small browser suite covers the highest-value journeys on the running system: account access, choosing three outcomes, explicit decisions, and AI context visibility.
- Manual exploratory passes remain useful for visual rhythm, accessibility, mobile layouts, and the emotional feel of restraint.

Every defect first gets the narrowest useful regression test. Refactoring happens in small behavior-preserving steps while the suite stays green.

## Definition of done

A change is complete when:

- behavior and acceptance criteria are documented;
- tests fail for the right reason before the fix when practical;
- formatting, static types, tests, production builds, and migrations pass;
- authentication and user ownership are enforced at every data boundary;
- errors are actionable but do not leak secrets or internals;
- keyboard, screen-reader labels, contrast, responsive layout, and reduced-motion behavior are checked;
- observable runtime warnings are resolved or explicitly recorded;
- documentation and screenshots match the product that actually runs.

## Security baseline

The security checklist follows OWASP ASVS themes: validate at trust boundaries, deny by default, hash bearer tokens, keep session-only operations explicit, use least-privilege CI permissions, review dependency changes, and never log credentials. Threat modeling is updated whenever a feature adds a new actor, data flow, integration, or side effect.

## Performance budgets

The Today screen is the critical path. We optimize it before secondary surfaces:

- one request loads the complete visible day;
- the production web entry may not regress beyond its checked-in raw and gzip budgets;
- interactions use optimistic feedback only when rollback is unambiguous;
- no AI SDK or provider bundle is shipped to the client;
- production web output is measured for bundle size and Core Web Vitals;
- mobile lists and animations must remain smooth on mid-range hardware;
- database queries are bounded by user and date and backed by targeted indexes.

## References

- Martin Fowler, [Test Pyramid](https://martinfowler.com/bliki/TestPyramid.html)
- Martin Fowler, [Refactoring workflow](https://martinfowler.com/articles/workflowsOfRefactoring/)
- Robert C. Martin, [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- Eric Evans, [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- OWASP, [Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
