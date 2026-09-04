# Two-step Sachaufgaben

Multi-step German word problems in Mathe / Sachaufgaben.
Shown in the same type mix as classic `+ − × ÷` stories. Child enters only the final number via keypad.

## Task list

- [x] Inspect existing Sachaufgaben flow and sibling landscape layout
- [x] Extend word-problem model/service with two-step subtype (do not duplicate the app)
- [x] Generators: money/family tickets, relative ages/amounts, similar two-step templates
- [x] Exercise UI: same keypad as classic stories; grade final number only
- [x] Keep classic one-step stories (`+ − × ÷`) in the same mix as two-step (`2+`)
- [x] Landscape layout: LEFT task + streak + stats, RIGHT solution input (Zeitspannen pattern)
- [x] Browser-test the implemented feature manually
- [x] Write unit tests (worksheet examples + grading helpers + keypad flow)
- [x] Write e2e tests (navigation + final-number answer)
- [x] Run the full test suite
- [x] Confirm: no Rechnung / Antwortsatz fields in UI

## Review

**Implemented**
- Two-step word-problem subtype with generators (family tickets, relative ages/amounts, pocket money, shopping pair)
- Mixed into Sachaufgaben type selector (`2+` alongside `+ − × ÷`)
- Same numeric keypad UI as classic stories; only the final result is graded
- Unit + E2E coverage for generators and keypad answering

**Deviations from original plan**
- Original plan used worksheet-style Rechnung + Antwortsatz fields; product decision changed to final-number-only input while keeping multi-step story templates

**Completed:** 2026-09-04
