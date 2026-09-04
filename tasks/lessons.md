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

## 2026-05-11 — Feature plans must include browser testing and test generation steps

**Rule**: Every new feature plan file (`tasks/<feature>.md`) must include the following steps in the implementation checklist, in this order:

1. **Browser-test the implemented feature manually** — navigate to the relevant page, exercise the new functionality, verify it looks and behaves correctly
2. **Write unit tests** for all new service methods, signals, and component logic
3. **Write e2e tests** for the user-facing flow
4. **Run the full test suite** (`npm run test -- --watch=false` + `npx playwright test`) and verify ALL tests — including pre-existing ones — still pass

**Why it matters**: During the Zahlenraum feature, tests for newly added signals were missing from mocks in other components' specs, causing pre-existing tests to break. Browser testing catches UI regressions early. Running the full suite (not just the new spec file) is required to catch mock gaps in other specs.

## 2026-05-12 — Division operand semantics: operandA is dividend, answer is quotient

**Mistake**: When fixing multiplication to check `answer <= maxValue` (so the product stays in range), I incorrectly extended the same logic to division. For division, `operandA` is the **dividend** and `answer` is the **quotient** — the existing contract (and tests) check `operandA <= maxValue`, not `answer`.

**Rule**: For multiplication, cap `answer` (= product). For division, cap `operandA` (= dividend). Always verify the semantics of `operandA/operandB/answer` per operation type before changing range-check logic.

## 2026-06-16 — Neuen Feature-Plan immer sofort in tasks/todo.md eintragen

**Mistake**: Rechenhaus-Plan in `tasks/rechenhaus.md` erstellt, ohne den Eintrag in `tasks/todo.md` hinzuzufügen.

**Rule**: Jedes Mal wenn eine neue `tasks/<feature>.md` erstellt wird, sofort eine Zeile in `tasks/todo.md` ergänzen. Die todo.md ist der Index — sie ist wertlos wenn sie unvollständig ist.

## 2026-09-02 — Dev-Server vor lokalem Test immer neu starten

**Rule**: Vor lokalem Browser-Test (und damit vor commit-and-push): laufenden Dev-Server stoppen (`npx kill-port 4200`), Branch prüfen, `npm run start:poll` neu starten, erst nach User-OK committen/pushen. Ein alter Hintergrund-Server kann einen veralteten Branch/Build ausliefern.

**Cursor rule**: `.cursor/rules/local-test-before-commit.mdc` (`alwaysApply: true`)

## 2026-09-04 — Two-step Sachaufgaben: final number only, not worksheet fields

**Mistake**: First implementation asked for Rechnung + Antwortsatz on multi-step word problems.

**Rule**: For Schlaufuchs Sachaufgaben, multi-step templates still require intermediate thinking in the story, but the child only enters the final numeric result via the shared keypad — same UX as classic one-step stories. Keep two-step templates in the same type mix (`2+` with `+ − × ÷`).
