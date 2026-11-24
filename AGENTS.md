# AGENTS.md

Notes for coding agents. The README describes the application; this file is about working in the repository.

## Branches and CI

- `main` is the only long-lived branch. Every push to it runs CI and deploys to GitHub Pages, so merging into `main` is a release.
- CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm run check`, `npm test` and `npm run build` on Node 24. Pull requests get the same without the deploy. Use Node 24 locally too: some dev dependencies require a newer Node than `engines` in `package.json` allows.

## Conventions

- Everything in the repository is in English: code, comments, commit messages and docs. Translation content is the exception.
- Work is committed straight to `main`, one commit per logical change; pull requests are only Dependabot's. The message is one sentence naming what changed and, when useful, why, with no prefix and usually no body, as in `Text contrast raised to WCAG AA`.
- Prettier formatting is checked for `src/` only. Keep `plugins/`, `scripts/` and the config files in the same style.

## Checks

- `npm run check` lints and checks formatting without changing anything. `npm run lint` does the same with fixes applied and rewrites files.
- `npm test` runs Vitest. The tests in `src/composables/useBlob.integration.test.js` are skipped unless the backend from the sibling `Blobs` project is reachable (`../../../Blobs` relative to the test file, or `BLOBS_PATH`), so `1 skipped` in the summary means they did not run.
- `npm run audit` checks the production dependencies with `npm audit`.
- `npm run build` succeeds without `.env.production.local`, but the result lacks the backend settings and is only good for comparing builds.

## Application code

- The app is a single view, `src/views/SplitView.vue`, built from the components in `src/components/`. State and logic live in `src/composables/` and in the modules at the root of `src/` (`settlements.js`, `participantGroups.js`, `database.js`, `storage.js`, `utils.js`).
- The logic modules have tests next to them. The components have none and are checked by hand in the browser.
- Read "How It Works" in the README before changing the synchronization and storage code (`src/composables/useDataset.js`, `useBlob.js`, `src/database.js`). Merging concurrent changes, removals and local copies follow rules that the code alone does not explain.
- Every user-facing string goes through vue-i18n. Add a new key to all six files in `src/locales/`, in the same order as in `en.json`; plural forms are separated by ` | `. Nothing checks completeness, and a missing key silently falls back to English.
- Accessibility is part of the app (see "Features" in the README): keyboard access, accessible names for icon buttons and checkboxes, changes announced through `useAnnouncer()`, and text contrast meeting WCAG AA in both themes. No check covers it, so look at the result in the light and the dark theme.
- Privacy is part of the app as well: the secret stays in the URL fragment, split data is encrypted in the browser, and there are no cookies, analytics or third-party services. Do not add anything that sends the URL, the secret or split data anywhere else.
- `public/pattern.svg` and `public/og-image.png` are generated. Regenerate them with their scripts instead of editing, as the README describes.

## Dependabot pull requests

Dependabot opens a weekly PR with npm minor and patch updates, titled "Bump the minor-and-patch group with N updates". GitHub Actions updates arrive in a separate group. A routine one needs the short path:

1. Read the `package.json` diff and compare the two `package-lock.json` files as JSON (`packages`). The direct bumps, their internal packages, platform binaries and the dependencies they declare are the expected transitive changes. A closer look is needed for anything else: another registry, missing integrity, a new `hasInstallScript`, a dependency that nothing in the diff declares.
2. Make sure CI on the PR is green and `npm audit` is clean.
3. Squash-merge the reviewed head: `gh pr merge <N> --repo andrew-markin/split --squash --delete-branch --match-head-commit <sha>`, with `<PR title> (#<N>)` as the subject and the PR description as the body, as in #5 and #6.
4. Update the local checkout: `git pull --ff-only`, then `npm ci`.
5. Check that the run on `main` passed both `build` and `deploy`.

A clean PR is merged and the checkout updated as part of the request; the owner does not need to be asked again. Go deeper (release notes, tests and builds) and report before merging only when something is off: a behaviour change that touches code in `src/`, a new or replaced dependency, a warning or a failure in a check. A minor update has broken the toolchain before: `eslint-plugin-import-x` 4.18.0 broke ESLint in #4, which CI caught.

## Verifying a pull request in a worktree

Keep the working copy, `dist/` and `.env.*.local` untouched:

- `git worktree add --detach <dir> <sha>`, then `npm ci`, `npm run check`, `npm test` and `npx vite build --outDir <other-dir>` inside it.
- Pass `BLOBS_PATH` pointing at the `Blobs` project, or the integration tests are skipped.
- Remove the worktree and the temporary directory afterwards; `git worktree list` should show the main checkout only.

## Communication

When a decision is needed, ask in the final message. An interactive question prompt was not seen by the owner once (2026-11-24).
