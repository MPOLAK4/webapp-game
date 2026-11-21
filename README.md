# webapp-game

An HTML5 game that runs in the browser (canvas + plain JavaScript, no libraries):
a clone of Chrome's offline dinosaur game. The problem it solves is in
[problem.md](problem.md).

## How to run

Open `index.html` in a browser (double-click it; no server needed), or serve the folder:

    python -m http.server 8000

then open http://localhost:8000.

Controls: **Space** or **Up arrow** to jump (and to start or restart), **Down arrow** to duck.
Your high score is saved in the browser (`localStorage`).

## How to run the tests

Needs Node.js 20 or newer (its built-in test runner; nothing to install):

    node --test "tests/**/*.test.js"

(The quotes matter: on newer Node versions, `node --test tests/` does not find the files.)

Some things only a person can check (how the game looks and feels, the night
switch, the score flash). They are the manual checks M1 to M4 in [spec.md](spec.md).

## Project index

| Card | What it is |
| --- | --- |
| `problem.md` | The problem and the numbered requirements (R1, R2, ...). Written by me. |
| `spec.md` | What each requirement means in exact, testable terms (R1.1, R2.3, ...), plus manual checks. |
| `README.md` | This file: how to run, how to test, and this index. |
| `CLAUDE.md` | Instructions the coding assistant follows in this project. |
| `.gitignore` | Files git must never track (transcripts, secrets, `node_modules`). |
| `.gitattributes` | Keeps `tests/` out of release archives (`git archive`). |
| `index.html` | The page that loads the game. |
| `game.js` | Game rules (physics, obstacles, score, crash), kept separate from drawing so it can be tested. |
| `storage.js` | Saving and loading the high score, with a safe fallback if storage is blocked. |
| `main.js` | The browser part: drawing on the canvas, keyboard, animation loop. |
| `tests/` | Unit tests; they name the requirement IDs they check. Not part of a release. |
| `docs/decisions/` | Decision records: why things were built the way they were. |
