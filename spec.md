# Spec: webapp-game

Status: **Round 1.** Source of requirements: [problem.md](problem.md) (R1 to R3).
Each requirement below is split into numbered checks (R1.1, R1.2, ...). Every automated
test names the ID it checks, and `tests/traceability.test.js` fails if an ID has no test.

Answers you gave before the build (Round 1 clarification):

- High score is stored in **localStorage** (not a cookie).
- The game is a **close clone** of Google's Dinosaur game, not just the core loop.
- Tests use **Node's built-in runner**.

## How the game is built

- `game.js`: all rules, no DOM or canvas, so Node can test it.
- `storage.js`: reads and writes the high score, behind a tiny object tests can fake.
- `main.js`: canvas drawing, keyboard events, the animation loop. Not unit-tested
  (see Manual checks).
- `index.html`: loads the three scripts.

Units: pixels and seconds. The world is 600 px wide. Heights are measured **up from the
ground** (y = 0 is the ground). Speeds are px/s; "per frame" below means at 60 frames/s.

## R1. A game about the player controlling a dinosaur

- **R1.1** A new game is `waiting`. The dinosaur is at x = 50, on the ground (y = 0),
  standing (44 wide, 47 tall).
- **R1.2** A jump input while on the ground launches the dinosaur upward at 600 px/s. Gravity
  is 2160 px/s². It peaks between 70 and 100 px, then lands exactly on the ground
  with zero vertical speed.
- **R1.3** A jump input while in the air does nothing (no double jump).
- **R1.4** Holding duck on the ground makes the dinosaur 59 wide and 25 tall; releasing
  it restores 44 by 47. Holding duck in the air does not change size, but makes gravity
  3 times stronger (fast fall).
- **R1.5** When the dinosaur hits an obstacle the game becomes `crashed`: the dinosaur
  and the world stop moving.

## R2. Gameflow like Google's Dinosaur game; dodge obstacles with the space bar

- **R2.1** Keys: `Space` and `ArrowUp` mean jump, `ArrowDown` means duck, every other key
  means nothing.
- **R2.2** While `waiting`, time does not advance. The first jump input starts the run
  (`running`) and jumps. A duck input alone does not start it.
- **R2.3** Speed starts at 360 px/s, rises 3.6 px/s every second of running, and never
  exceeds 780 px/s.
- **R2.4** Score is distance run times 0.025, shown as a whole number padded to 5 digits
  ("00042"), never above 99999.
- **R2.5** No obstacle exists during the first 3 seconds of running; after that
  obstacles appear.
- **R2.6** Obstacles appear at the right edge (x = 600), move left at the game speed, and
  are removed once completely off the left edge.
- **R2.7** Obstacle types:
  - small cactus 17 by 35 and large cactus 25 by 50, in groups of 1 to 3 (width is
    the single width times the group size);
  - groups of more than 1 only when speed is at least 240 px/s (small) or 420 px/s (large);
  - bird 46 by 40, only when speed is at least 510 px/s, at one of three heights
    (bottom edge 0, 25 or 50), moving 48 px/s faster or slower than the ground.
- **R2.8** The gap after an obstacle is a random whole number in [g, 1.5 g], where
  g = round(width x speed/60 + minGap x 0.6) and minGap is 120 (cactus) or 150 (bird).
  The next obstacle appears only once the last one has fully entered the screen and its
  gap has opened up. A simple jump-timing bot must survive 30 seconds (the gaps are fair).
- **R2.9** Collision uses boxes. The dinosaur's box is shrunk 4 px on every side (forgiving);
  obstacle boxes are exact. Touching edges do not count as a hit.
  Consequences: a jump clears a cactus; ducking clears a middle-height bird and standing
  hits it; standing clears a high bird and jumping into it hits it.
- **R2.10** After a crash, jump input is ignored for 0.75 s. After that, jump starts a new
  run: score and speed reset, obstacles cleared, dinosaur on the ground. The high score is kept.
- **R2.11** Every time the score passes a multiple of 100, a flash timer is set to 0.8 s,
  counts down while running, and never goes below 0.
- **R2.12** It is night while floor(score / 700) is odd, otherwise day.
- **R2.13** The game advances in fixed steps of 1/60 s, so a 30 Hz and a 144 Hz screen play
  identically. One frame of elapsed time is clamped to 0.25 s (after a hidden tab).
- **R2.14** The random source can be supplied. The same source gives the same obstacles.

## R3. Keep the high score in storage

- **R3.1** The high score is loaded from storage when a game is created (0 if nothing is
  stored) and shown as "HI 00000".
- **R3.2** On a crash, if the score is higher than the high score, the new high score is
  saved. A lower or equal score saves nothing.
- **R3.3** A stored value is accepted only if it is 1 to 5 digits (0 to 99999). Anything
  else (empty, negative, decimal, text, too long) counts as 0.
- **R3.4** If storage is missing, or reading or writing throws (private mode, blocked),
  the game still plays and the high score lasts for that page visit only.
- **R3.5** In the browser the storage is `localStorage`, under the key
  `dino-high-score`. Looking up `localStorage` can itself throw; that counts as unavailable.
- **R3.6** A restart after a crash keeps the high score.

## Manual checks (tests cannot judge these)

Open `index.html` and play:

- **M1** The dinosaur, cacti, birds, clouds and ground are visible and look right.
- **M2** Jumping, ducking and speed-up feel like the original; pressing Space does not
  scroll the page.
- **M3** Night comes at score 700; the score flashes at each 100.
- **M4** Beat your high score, reload the page: "HI" still shows it.

## Out of scope for Round 1

Sound, variable jump height (releasing the key early), touch or mobile controls, pause,
online scoreboards.
