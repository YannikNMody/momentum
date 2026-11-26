# Audit

Before publishing, this repository was audited for public release with an AI coding assistant (Claude), using the course audit prompt word for word. The audit is read-only: it prints no secret values, changes no files and runs no project code.

| Pass | Date | State audited |
|---|---|---|
| 1 | 24 Nov 2026 | `main` as finished after building (13 commits, full history) |
| 2 | 26 Nov 2026 | `submission-prep` after the fixes below |

Both passes ran on a fresh clone of the GitHub repository, so files that exist only on the author's computer were not visible to them.

## What was checked

- **Secrets and credentials:** every commit in the history, searched for API keys, tokens, passwords, private keys and common key formats (including weather-API keys).
- **Network access:** the permissions in `manifest.json` and every address the code calls.
- **Personal data:** commit metadata, local paths, location data in the code, the bundled photos and screenshots (including camera and GPS metadata).
- **Image licensing:** that every bundled photo has a credited photographer and source.
- **Files that should not be published:** local configuration, caches, generated files, files deleted from history.
- **`.gitignore`:** whether the rules fit the project, and whether any tracked file is matched by them.
- **Reproducibility:** setup instructions, configuration, the test material.
- **README:** the seven required topics and a screenshot.

## Pass 1 findings and what was done

No secrets were found in the current files or the history. The extension asks only for `storage` and three keyless APIs (ESPN scoreboard, Open-Meteo forecast and geocoding). None of the photos contains camera or GPS data, and all nine are credited in `images/credits.json` and on screen.

| # | Finding | Decision | Fixed in |
|---|---|---|---|
| C1 | The README was a 10-line install stub written before the submission requirements: six of the seven topics and a screenshot were missing. | **Fixed.** Written in the seven sections with a screenshot; Learning added; AI use and other sources disclosed. | `76fae1c`, `c489b75` |
| C2 | `config.example.js` asked for API keys that no code uses (all APIs are keyless), which would mislead anyone setting it up. | **Fixed.** File and its `.gitignore` rule removed. | `750073d` |
| R1 | What is stored where was not documented (Chrome sync, local storage, IndexedDB for uploaded photos). | **Fixed** in the README, including that synced settings follow the user's Google account. | `76fae1c` |
| R2 | The ESPN scoreboard address is unofficial and undocumented. | **Disclosed** in the README; the widget already falls back to its cache or hides. | `76fae1c` |
| R3 | `TESTING.md` was not linked and the contrast-check script not explained. | **Fixed** in the README. | `76fae1c` |
| R4 | `.gitignore` listed `node_modules/` although the project has no Node tooling. | **Fixed.** Removed. | `750073d` |
| R5 | No LICENSE file. | **Decision, no file.** Coursework published for grading; the README states "no license, all rights reserved". The photos stay under the Unsplash License. | `76fae1c` |
| — | The author's email address is in every commit and becomes public. | **Accepted, no action.** Not a secret; removing it would mean rewriting the history. | — |

## Other changes after pass 1

- **Display bug fixed (`dc646c5`).** While taking the README screenshot, the timer showed Start, Pause and Resume at once, the empty "time's up" banner was visible, and both main-focus states showed. The scripts were correct, but component styles overrode the HTML `hidden` attribute. Fixed with one CSS rule; a check was added to `TESTING.md`, and the author retested it in Chrome.
- **Screenshot photo.** The first screenshot showed a background photo the author had uploaded during testing, whose origin could not be traced. It was never committed; the screenshot was retaken with a bundled, credited Unsplash photo.

## Pass 2 result

All changes since pass 1 were checked again: no secrets, no tracked file matched by `.gitignore`, no metadata in the screenshot, all seven README sections present. The only confirmed issue was that the README linked to this file before it existed. The screenshot shows the author's first name, weather city and two todo items; this is low-sensitivity and kept deliberately.

## Remaining limitations

- Files that exist only on the author's computer were not inspected.
- The audits did not load the extension; the author tested it by hand with `TESTING.md`. There are no automated browser tests.
- An audit that finds nothing does not prove the project is safe.
