# CSC299 portfolio: shared instructions

These rules apply to every project in this portfolio: `web-app-demo`,
`webapp-game`, and `cmd-line-ending`. Each project is its own git repo;
this repo only holds the README that links to them.

## Always write unit tests

- Whenever you create or change application code, write unit tests for it in the
  same step. Do not hand over an app without tests.
- Keep all tests in a top-level `tests/` folder, separate from the app code, so
  they are easy to leave out of a release.
- Use the standard test tool for the language (for Python, `pytest`). Run the
  tests before saying a change is done, and show me the result.
- Explain what each test checks and why, so I can learn to write them myself.

## Tests are for development, not for releases

- Tests stay in git (never put `tests/` in `.gitignore`), but they must not be
  shipped in a release version of the program.
- Keep them out of release builds/packages, for example with
  `tests/ export-ignore` in `.gitattributes` (affects `git archive`) or by
  excluding `tests/` in the packaging config.
- Release code must not import from `tests/` or depend on test-only packages.

## General

- Follow the root `CLAUDE.md` for how to teach, explain, and commit.
- Keep each project small and readable; I should be able to understand all of it.

## What never goes in a repository

From the project spec sheet: "No transcripts (.jsonl files), no API keys or
passwords, no .venv or node_modules folders, and no personal information you
would not put on a public web page. These repositories are public."

- Never create, copy, or commit any of those things, in any project repo.
- Give every project a `.gitignore` that covers `*.jsonl`, `.env` and other secret
  files, `.venv/`, and `node_modules/`.
- Read keys and passwords from environment variables, never from source files.
- Before each commit, check what is staged (`git status`, `git diff --staged`) and
  stop if anything on this list is in it.

## Commits

- Whenever you fix, add, or modify a feature, make a commit right after, with a
  short message saying what changed. Do not batch unrelated changes together.
- Never push. I decide what gets pushed and when. Do not run `git push`, add
  remotes, or create GitHub repos unless I ask.
