# Lessons

## 2026-04-04 — commit-and-push skill: always run ALL quality gates before committing

**Mistake**: After fixing the `basePath` signal bug and adding E2E navigation tests, I committed and pushed without running `npm run lint`, `npm run build`, and `npm run test` first. The `commit-and-push` skill explicitly requires running ALL gates (lint → build → unit tests → E2E) in Phase 2 before committing.

**Rule**: Before ANY commit, always run the full gate sequence defined in the `commit-and-push` skill:
1. `npm run lint`
2. `npm run build`
3. `npm run test -- --watch=false`
4. `npx playwright test` (if E2E tests exist)

Only after ALL pass → commit → push → verify CI.

**Why it matters**: Skipping gates risks pushing broken code. CI will catch it eventually, but that wastes time and pollutes the commit history with fix-up commits.
