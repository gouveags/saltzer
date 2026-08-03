# Contributing

Saltzer welcomes focused contributions that preserve the product's restraint.
Before adding a feature, ask whether it helps a person decide or execute what
matters today and whether the attention it demands is worth the benefit.

## Development flow

1. Open an issue for behavior or architecture changes that are not already
   described in the roadmap.
2. Create a topic branch from `main`.
3. Add tests for changed product rules and boundaries.
4. Run `pnpm check`, `pnpm test`, and `pnpm build`.
5. Open a pull request describing the user-visible outcome and proof.

Do not commit secrets, generated native projects, local databases, or `.env`.
Small, complete changes are preferred to broad speculative scaffolding.
