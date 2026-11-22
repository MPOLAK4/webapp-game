# Handoff: end of Round 1

For a fresh session starting Round 2. Standing rules are in `CLAUDE.md` (read it first,
including its new "This project (webapp-game): standing rules" section). This file is
only about the state at the end of Round 1.

## Current state

Round 1 (problem.md R1 to R3) is complete and committed on `master`; nothing is pushed.
All **61 tests pass**. A Chrome-style dinosaur game works when `index.html` is opened.

| Requirement | Status |
| --- | --- |
| R1 a game about a dinosaur | done: jump, duck, fast-fall, crash (spec R1.1 to R1.5) |
| R2 gameflow like Google's, escalating difficulty, dodge with Space | done: spec R2.1 to R2.14 |
| R3 high score saved | done: `localStorage`, spec R3.1 to R3.6 |

Files: `index.html`, `main.js` (browser: drawing, keys, loop), `game.js` (rules),
`storage.js` (high score), `spec.md`, `docs/decisions/0001` to `0003`, `tests/`
(`game`, `storage`, `main`, `traceability`, plus `helpers.js`), `README.md`.

Commits, oldest first: `ed83a07` spec, `893dd91` tests, `6161598` storage.js with
ADR 0001 and 0002, `2dcaea8` game.js with ADR 0003, `eb5d2d5` main.js and its tests,
`e9a395a` index.html, `4845a8e` README.

## How to run

- Play: double-click `index.html` (no server needed). Space or Up = jump, start and
  restart; Down = duck.
- Tests: `node --test "tests/**/*.test.js"` (Node 24 here; keep the quotes).
- Quick visual check without a person: headless Chrome can screenshot a page, e.g.
  `chrome.exe --headless --disable-gpu --allow-file-access-from-files --virtual-time-budget=1000 --screenshot=out.png <file:// url>`.
  Chrome is at `C:\Program Files\Google\Chrome\Application\chrome.exe`.

## How the code is organised (the short version)

- `game.js` holds the rules as plain numbers. It has no drawing and no keyboard code.
  The game is an object (`createGame`) changed by `press`/`release` (input) and
  `advance(game, elapsedSeconds)` (time, in fixed 1/60 s steps). The random source
  `rng` and the `store` are injected.
- `storage.js` makes a store with `load()` and `save(score)`, which falls back to
  memory if `localStorage` is missing or throws.
- `main.js` exports `start(win, doc)` so tests can pass fakes. It only draws and wires
  events; if you change a rule, change `game.js`, not `main.js`.
- Units: pixels and seconds. Heights go UP from the ground in `game.js`; `main.js`
  flips them for the canvas (`GROUND_Y = 130`).

## Decisions made in Round 1, and why

Records for the big ones are in `docs/decisions/`. The others are only here.

1. **Plain scripts, not ES modules** (ADR 0001): modules do not load from `file://`,
   and the page should work by double-clicking. Each file exports for Node tests via
   `module.exports`.
2. **`localStorage`** (ADR 0002) over cookies or a downloaded file. The user confirmed it.
3. **Fixed 1/60 s time step with a 0.25 s clamp** (ADR 0003), so the game plays the same
   at any screen refresh rate and a hidden tab cannot cause a huge jump.
4. **Clone as closely as practical** (user's answer). Numbers are the original game's
   per-frame values times 60: speed 360 to 780 px/s, +3.6 px/s every second, gravity
   2160, jump 600, score = distance x 0.025 capped at 99999.
5. **Spec IDs are mine.** problem.md only has R1 to R3; I split them into sub-IDs
   (R2.7 etc.) in `spec.md` and tests cite those.
6. **Hit box shrunk 4 px** on every side for the dinosaur; touching edges is not a crash.
7. **Obstacle rules:** 3 s with no obstacles at the start; birds from speed 510 at three
   heights and +/-48 px/s relative speed; groups of 2 to 3 cacti only at higher speeds;
   the gap grows with speed and obstacle width (original formula).
8. **Restart:** jump restarts only 0.75 s after a crash, and that press does not also
   jump. The score flashes 0.8 s every 100 points. Night is when `floor(score/700)` is odd.
9. **Fast-fall:** holding Down in the air triples gravity.
10. **Tests:** Node's built-in runner (CLAUDE.md said "pytest"; the user chose to leave
    CLAUDE.md as it was, and the new section in it now says so). A traceability test
    enforces the ID-in-title convention. A "bot" test plays 5 seeded runs of 30 s with
    a jump-only bot to prove normal gaps are survivable (and it was checked that
    zero gaps do crash it).
11. **Art is original** blocky pixel art drawn from small string grids and rectangles,
    not Google's sprites. The night fade, stars and moon are cosmetic only.

## Unresolved

- **Manual checks M1 to M4 (spec.md) have not been done by a person.** Only a headless
  screenshot of the first moments was looked at. Needed: look, feel, Space not
  scrolling, night at 700, flash at each 100, high score after reload. Ask the user
  whether they found anything.
- **Not checked in a real browser session:** blur/tab-hidden behaviour. The time clamp
  covers a long hidden tab, but `main.js` does not pause on `visibilitychange`.
- **Wording to tidy (a new commit, never an amend):** ADR 0002 says "the 4 KB limit is
  irrelevant but the API is awkward", which is clumsy.
- **Round 2's requirements are not known yet.** There is no Round 2 section in
  `problem.md`. Ask the user, and apply the Round instructions they paste.
- **Out of scope for Round 1** (in `spec.md`), so a later round may want them: sound,
  variable jump height, touch controls, pause, online scoreboards.
- `NEXT-SESSION.md` (untracked, hidden by `.git/info/exclude`) mentions the due date,
  Sun Nov 22, 2026, 11:59 PM. Check it before planning.

## Warnings

- `node --test tests/` finds no tests on Node 24; use the quoted glob.
- Several numbers live in both `spec.md` and `game.js` `CONFIG`. Changing one without the
  other leaves them disagreeing, and the spec is what graders read.
- The fairness-bot test in `tests/game.test.js` is tied to the gap formula and jump
  numbers. Changing gravity, jump speed, hit box or gaps can make it fail even if the
  game is fine; re-derive its take-off timing (there is a comment in the test).
- Tests parse `spec.md` with regexes: a requirement line must look like
  `- **R2.3** text`, and a test title must start with `R2.3:` or `traceability:`.
- The repository is public: no transcripts (`*.jsonl`), keys, `.venv`, `node_modules`
  or personal information. Check `git status` and `git diff --staged` before each commit.
- Git (here) prints "LF will be replaced by CRLF" warnings. They are harmless.
- `handoff-round-1.md` and the `CLAUDE.md` edit are **uncommitted**: the user wants to
  read and edit them first. Do not commit them unless asked. Never push, amend or undo
  commits.
