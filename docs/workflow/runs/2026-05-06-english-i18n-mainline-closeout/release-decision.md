# Release Decision - English I18n Mainline Closeout

Status: `go-for-staging / prod-pending`

- Decision: **GO for staging**
- Prod status: **PENDING**

## Why This Is Not Yet Prod-GO

- The code and local verification gates are green.
- Prod remains gated on the required sequence:
  1. commit and push the release SHA
  2. deploy staging
  3. run staging English smoke
  4. mark release ready
  5. deploy prod
  6. rerun prod smoke
  7. restore prod to `idle`

## Current Blockers

- No code blockers.
- Release-policy blockers only:
  - release SHA not committed/pushed yet
  - staging smoke not yet executed for this run

## Accepted Risks

- `PRODUCT.md` still has historical encoding corruption outside the updated English sections.
- Existing Vite chunk warning remains unchanged and non-blocking for this release.

## Promotion Rule

- Promote to prod only if staging serves the intended SHA and the English mainline smoke passes without mixed-language regressions in the scoped Production -> Editor path.
