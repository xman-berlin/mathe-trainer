# Angular 22 + ESLint 10 upgrade

## Goal

Upgrade the app from **Angular 20** to **Angular 22** (and matching `angular-eslint`), and from **ESLint 9** to **ESLint 10**, as one coordinated change — not via piecemeal Dependabot PRs.

Closed Dependabot PRs superseded by this task: #34–#37, #40–#42.

## Current baseline (main)

- `@angular/*` `^20.3.x`
- `angular-eslint` `^20.7.0`
- `eslint` `^9.39.x`
- `typescript` `~5.9.2`
- Node engines: `>=22 <25`

## Target

- `@angular/*` 22.x (core, common, compiler, forms, router, platform-browser, build, cli, compiler-cli)
- `angular-eslint` 22.x (aligned with Angular 22)
- `eslint` 10.x + compatible `typescript-eslint`
- Keep zoneless / standalone / signals patterns working
- CI green on Node 22.x and 24.x

## Checklist

- [ ] Read Angular 21 + 22 update guides; note breaking changes relevant to this app
- [ ] Branch `chore/angular-22-eslint-10`
- [ ] Upgrade Angular packages together (`ng update` preferred over manual bumps)
- [ ] Upgrade `angular-eslint` + ESLint 10 + `typescript-eslint` as needed
- [ ] Fix compile / template / lint breakages
- [ ] Fix unit tests (TestBed / zoneless quirks)
- [ ] Fix E2E if selectors or timing change
- [ ] Browser smoke: Mathe (Übung, Sachaufgaben, Zahlenreihen), Uhrzeit, Deutsch
- [ ] `npm run lint && npm run build && npm run test -- --watch=false && npm run e2e`
- [ ] PR + merge when CI green
- [ ] Move this file to `tasks/done/` and remove from `todo.md`

## Out of scope

- Feature work while the upgrade branch is open (rebase or land features first)
- Other major deps unless required by Angular 22

## Review

_(fill when done)_
