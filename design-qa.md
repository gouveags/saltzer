# Design QA — Convergent Day identity and auth

Date: 2026-08-03

## Visual truth

- Selected source: `docs/brand/saltzer-convergent-day-source.png` at 1254 ×
  1254 px.
- Production marks: 512 × 512 px transparent light and dark assets.
- Product render: 40 × 40 CSS px at a 1280 × 720 viewport.
- Full comparison: `docs/screenshots/design-qa-full-comparison.png`.
- Focused comparison: `docs/screenshots/design-qa-brand-comparison.png`.
- Current implementation captures:
  - `docs/screenshots/vision-44-convergent-day-wordmark.png`
  - `docs/screenshots/vision-44-convergent-day-dark.png`
  - `docs/screenshots/vision-44-convergent-day-light.png`
  - `apps/e2e/tests/auth.spec.ts-snapshots/auth-register-mobile-chromium-linux.png`

The selected source and implementation were opened together in both the full
and focused comparison inputs. The production geometry preserves the center
grain, alternating ray lengths, lower ember ray, and asymmetric rhythm of the
selected option. The dark variant changes color only; it does not redraw the
mark.

## Required surfaces

1. **Silhouette:** Passed at source scale, 40 px product scale, app-icon scale,
   adaptive icon scale, monochrome scale, and 64 px favicon scale.
2. **Color:** Passed in ink and ember on warm paper and paper and ember on the
   dark surface. Contrast remains clear without adding effects.
3. **Wordmark:** Passed with the lowercase Familjen Grotesk lockup. Spacing is
   balanced against the 40 px mark and no longer resembles the placeholder `S`.
4. **Product context:** Passed in the compact daily rail, full auth lockup,
   large auth watermark, light theme, and dark theme.
5. **Platform assets:** `pnpm icons:generate` reproduces the native, adaptive,
   monochrome, and favicon assets from the tracked production master.

## Auth acceptance checks

- Registration and sign-in use the same card rectangle: 390 × 520 px at
  `(780, 100)` in the 1280 × 720 in-app Browser viewport.
- The mobile 390 × 844 capture has zero horizontal overflow and keeps the full
  registration contract visible.
- Keyboard focus removes the browser-blue outline and uses the Saltzer ember
  underline. Focus remains visually apparent rather than being suppressed.
- The verified NIV wording is attributed as `MATTHEW 6:34 · NIV`.
- The full Daily Contract journey still passes in dark and light themes.
- The in-app Browser console had no application errors. Its only warnings were
  development-only Electron content-security-policy notices emitted by the host.

## Comparison history

1. Initial implementation preserved the mark but retained the generic
   Newsreader-led auth treatment.
2. The founding brief and live critique led to Familjen Grotesk, a stable
   fixed-size contract card, a real scripture citation, an identity-derived
   watermark, and a branded focus state.
3. Mobile QA found horizontal overflow from the decorative watermark. The
   screen now clips decoration, uses a compact composition, and asserts zero
   overflow in the browser test.

final result: passed
