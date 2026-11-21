# webapp-game

An HTML5 game that runs in the browser (canvas + plain JavaScript, no libraries).
The problem it solves is in [problem.md](problem.md).

## How to run

Open `index.html` in a browser, or serve the folder:

    python -m http.server 8000

then open http://localhost:8000. (`index.html` does not exist yet.)

## How to run the tests

Needs Node.js 20 or newer (its built-in test runner; nothing to install):

    node --test tests/

## Project index

| Card | What it is |
| --- | --- |
| `problem.md` | The problem and the numbered requirements (R1, R2, ...). Written by me. |
| `README.md` | This file: how to run, how to test, and this index. |
| `CLAUDE.md` | Instructions the coding assistant follows in this project. |
| `.gitignore` | Files git must never track (transcripts, secrets, `node_modules`). |
| `index.html` *(coming)* | The page that loads the game. |
| `game.js` *(coming)* | Game rules, kept separate from drawing so it can be tested. |
| `tests/` *(coming)* | Unit tests; they name the requirement IDs they check. Not part of a release. |
