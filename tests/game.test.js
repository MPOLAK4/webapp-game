'use strict';
// Tests for game.js (R1, R2, and the game's side of R3).
// Every test title starts with the requirement ID from spec.md that it checks.
// Numbers like 600 or 0.75 are copied from spec.md on purpose: the test checks the
// code against the spec, not against the code's own constants.

const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game.js');
const { scriptedRng, seededRng } = require('./helpers.js');

const STEP = 1 / 60;

// A game that is already running, with the dinosaur standing on the ground.
function startedGame(options) {
  const g = G.createGame(options);
  G.press(g, 'jump'); // first jump starts the run (R2.2)
  g.dino.y = 0;
  g.dino.vy = 0;
  return g;
}

// Add an obstacle by hand, so a test does not depend on random spawning.
function place(g, props) {
  g.obstacles.push({
    type: 'cactusSmall', x: 300, y: 0, w: 17, h: 35, size: 1, gap: 100, speedOffset: 0,
    ...props,
  });
}

function run(g, seconds) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) G.update(g, STEP);
}

function near(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message || ''} expected ${expected}, got ${actual}`);
}

// ---------------------------------------------------------------- R1

test('R1.1: a new game is waiting, dinosaur at x=50 on the ground, standing 44x47', () => {
  const g = G.createGame();
  assert.equal(g.status, 'waiting');
  assert.equal(g.dino.x, 50);
  assert.equal(g.dino.y, 0);
  assert.deepEqual(G.getDinoSize(g.dino), { w: 44, h: 47 });
});

test('R1.2: a jump rises 70-100 px, then lands exactly on the ground', () => {
  const g = G.createGame();
  G.press(g, 'jump');
  assert.equal(g.dino.vy, 600);
  let peak = 0;
  let steps = 0;
  do {
    G.update(g, STEP);
    peak = Math.max(peak, g.dino.y);
    steps++;
  } while (g.dino.y > 0 && steps < 200);
  assert.ok(peak >= 70 && peak <= 100, `peak was ${peak}`);
  assert.equal(g.dino.y, 0);
  assert.equal(g.dino.vy, 0);
  assert.ok(steps < 200, 'the dinosaur never landed');
});

test('R1.3: a jump in mid-air is ignored (no double jump)', () => {
  const g = G.createGame();
  G.press(g, 'jump');
  for (let i = 0; i < 10; i++) G.update(g, STEP);
  const vyBefore = g.dino.vy;
  const yBefore = g.dino.y;
  assert.ok(yBefore > 0);
  G.press(g, 'jump');
  assert.equal(g.dino.vy, vyBefore);
  assert.equal(g.dino.y, yBefore);
});

test('R1.4: duck on the ground is 59x25 and releasing restores 44x47', () => {
  const g = startedGame();
  G.press(g, 'duck');
  assert.deepEqual(G.getDinoSize(g.dino), { w: 59, h: 25 });
  G.release(g, 'duck');
  assert.deepEqual(G.getDinoSize(g.dino), { w: 44, h: 47 });
});

test('R1.4: duck in the air keeps the size but makes the dinosaur fall faster', () => {
  function airtime(holdDuck) {
    const g = startedGame();
    G.press(g, 'jump');
    if (holdDuck) G.press(g, 'duck');
    let steps = 0;
    do { G.update(g, STEP); steps++; } while (g.dino.y > 0 && steps < 300);
    if (holdDuck) assert.deepEqual(G.getDinoSize(g.dino), { w: 44, h: 47 });
    return steps;
  }
  const normal = airtime(false);
  const fast = airtime(true);
  assert.ok(fast < normal, `fast fall took ${fast} steps, normal took ${normal}`);
});

test('R1.5: hitting an obstacle crashes the game and freezes the world', () => {
  const g = startedGame();
  place(g, { x: 60 }); // overlaps the dinosaur (x 50..94)
  G.update(g, STEP);
  assert.equal(g.status, 'crashed');
  const frozen = JSON.stringify({ d: g.dino, o: g.obstacles, dist: g.distance, s: g.speed });
  run(g, 1);
  assert.equal(JSON.stringify({ d: g.dino, o: g.obstacles, dist: g.distance, s: g.speed }), frozen);
});

// ---------------------------------------------------------------- R2

test('R2.1: Space and ArrowUp mean jump, ArrowDown means duck, other keys nothing', () => {
  assert.equal(G.keyToAction('Space'), 'jump');
  assert.equal(G.keyToAction('ArrowUp'), 'jump');
  assert.equal(G.keyToAction('ArrowDown'), 'duck');
  assert.equal(G.keyToAction('KeyA'), null);
  assert.equal(G.keyToAction('Enter'), null);
  assert.equal(G.keyToAction(undefined), null);
});

test('R2.2: waiting does not advance; the first jump starts the run and jumps', () => {
  const g = G.createGame();
  G.update(g, 1);
  assert.equal(g.status, 'waiting');
  assert.equal(g.distance, 0);
  assert.equal(g.time, 0);
  G.press(g, 'duck');
  assert.equal(g.status, 'waiting');
  G.release(g, 'duck');
  G.press(g, 'jump');
  assert.equal(g.status, 'running');
  assert.equal(g.dino.vy, 600);
});

test('R2.3: speed starts at 360 and rises 3.6 px/s every second', () => {
  const g = startedGame();
  assert.equal(g.speed, 360);
  run(g, 1);
  near(g.speed, 363.6, 0.05);
});

test('R2.3: speed never exceeds 780', () => {
  const g = startedGame();
  g.speed = 779.9;
  run(g, 2);
  assert.equal(g.speed, 780);
});

test('R2.4: score is distance x 0.025, a whole number, capped at 99999', () => {
  const g = G.createGame();
  g.distance = 4000;
  assert.equal(G.getScore(g), 100);
  g.distance = 4039;
  assert.equal(G.getScore(g), 100);
  g.distance = 1e12;
  assert.equal(G.getScore(g), 99999);
});

test('R2.4: running for one second at the start scores about 9', () => {
  const g = startedGame();
  run(g, 1);
  assert.equal(G.getScore(g), 9);
});

test('R2.4: scores are shown padded to 5 digits and never above 99999', () => {
  assert.equal(G.formatScore(0), '00000');
  assert.equal(G.formatScore(42), '00042');
  assert.equal(G.formatScore(99999), '99999');
  assert.equal(G.formatScore(123456), '99999');
  assert.equal(G.formatScore(-5), '00000');
});

test('R2.5: no obstacle in the first 3 seconds, then obstacles appear', () => {
  const g = startedGame({ rng: seededRng(1) });
  run(g, 2.9);
  assert.equal(g.obstacles.length, 0);
  run(g, 0.2);
  // The dinosaur never jumps here, so it may have crashed, but an obstacle was made.
  assert.ok(g.obstacles.length >= 1);
});

test('R2.6: obstacles appear at x=600 and move left at the game speed', () => {
  const g = startedGame();
  const o = G.spawnObstacle(g);
  assert.equal(o.x, 600);
  g.obstacles = [];
  place(g, { x: 300 });
  G.update(g, STEP);
  near(g.obstacles[0].x, 300 - 360 / 60, 0.1);
});

test('R2.6: an obstacle completely off the left edge is removed', () => {
  const g = startedGame();
  place(g, { x: -50, w: 17 });
  place(g, { x: 400 });
  G.update(g, STEP);
  assert.equal(g.obstacles.length, 1);
  assert.ok(g.obstacles[0].x > 300);
});

test('R2.7: small cactus is 17x35 and a group is a multiple of its width', () => {
  const g = startedGame(); // speed 360, so groups are allowed for small cacti (>= 240)
  g.rng = scriptedRng([0, 0, 0]); // small cactus, size 1, gap roll
  let o = G.spawnObstacle(g);
  assert.equal(o.type, 'cactusSmall');
  assert.deepEqual([o.w, o.h, o.y, o.size], [17, 35, 0, 1]);
  g.rng = scriptedRng([0, 0.99, 0]); // size roll high: group of 3
  o = G.spawnObstacle(g);
  assert.deepEqual([o.w, o.h, o.size], [51, 35, 3]);
});

test('R2.7: large cactus is 25x50 and only groups at speed >= 420', () => {
  const g = startedGame();
  g.rng = scriptedRng([0.5, 0.99, 0]); // large cactus, size roll high
  let o = G.spawnObstacle(g);
  assert.equal(o.type, 'cactusLarge');
  assert.deepEqual([o.w, o.h, o.size], [25, 50, 1]); // speed 360 < 420: single only
  g.speed = 420;
  g.rng = scriptedRng([0.5, 0.99, 0]);
  o = G.spawnObstacle(g);
  assert.deepEqual([o.w, o.h, o.size], [75, 50, 3]);
});

test('R2.7: small cactus groups need speed >= 240', () => {
  const g = startedGame();
  g.speed = 239;
  g.rng = scriptedRng([0, 0.99, 0]);
  const o = G.spawnObstacle(g);
  assert.equal(o.type, 'cactusSmall');
  assert.equal(o.size, 1);
});

test('R2.7: birds only appear at speed >= 510', () => {
  const g = startedGame();
  g.speed = 509;
  g.rng = scriptedRng([0.99, 0, 0]); // highest type roll
  assert.notEqual(G.spawnObstacle(g).type, 'bird');
  g.speed = 510;
  g.rng = scriptedRng([0.99, 0, 0, 0]);
  assert.equal(G.spawnObstacle(g).type, 'bird');
});

test('R2.7: a bird is 46x40, has one of three heights, and a speed offset of 48', () => {
  const g = startedGame();
  g.speed = 600;
  const heights = [];
  for (const roll of [0, 0.4, 0.99]) {
    g.rng = scriptedRng([0.99, roll, 0.1, 0]); // bird, height roll, offset roll, gap roll
    const o = G.spawnObstacle(g);
    assert.deepEqual([o.type, o.w, o.h], ['bird', 46, 40]);
    assert.equal(o.speedOffset, -48);
    heights.push(o.y);
  }
  assert.deepEqual(heights, [0, 25, 50]);
  g.rng = scriptedRng([0.99, 0, 0.9, 0]);
  assert.equal(G.spawnObstacle(g).speedOffset, 48);
});

test('R2.8: the gap is a whole number in [g, 1.5g]; the lowest roll gives g exactly', () => {
  const g = startedGame();
  g.rng = scriptedRng([0, 0, 0]); // small cactus, size 1, lowest gap roll
  // g = round(17 * 360/60 + 120 * 0.6) = round(102 + 72) = 174
  assert.equal(G.spawnObstacle(g).gap, 174);

  const many = startedGame({ rng: seededRng(99) });
  for (let i = 0; i < 300; i++) {
    const o = G.spawnObstacle(many);
    const minGap = o.type === 'bird' ? 150 : 120;
    const base = Math.round(o.w * many.speed / 60 + minGap * 0.6);
    assert.ok(Number.isInteger(o.gap), `gap ${o.gap} is not whole`);
    assert.ok(o.gap >= base && o.gap <= 1.5 * base, `gap ${o.gap} outside [${base}, ${1.5 * base}]`);
    many.speed = 360 + (i % 30) * 15; // visit many speeds, including birds
  }
});

test('R2.8: the next obstacle waits until the last one has opened its gap', () => {
  const waiting = startedGame();
  waiting.time = 5; // past the 3 s clear time
  place(waiting, { x: 500, w: 17, gap: 100 }); // 500 + 17 + 100 = 617 >= 600: wait
  G.update(waiting, STEP);
  assert.equal(waiting.obstacles.length, 1);

  const ready = startedGame();
  ready.time = 5;
  place(ready, { x: 400, w: 17, gap: 100 }); // 517 < 600: spawn
  G.update(ready, STEP);
  assert.equal(ready.obstacles.length, 2);
});

test('R2.8: a simple jump-timing bot survives 30 seconds (gaps are fair)', () => {
  // The bot only jumps, at the best moment for the next obstacle. If the gaps were
  // too small to land and jump again, or a group too wide to clear, it would crash.
  for (const seed of [1, 2, 3, 4, 5]) {
    const g = startedGame({ rng: seededRng(seed) });
    for (let i = 0; i < 30 * 60 && g.status === 'running'; i++) {
      const next = g.obstacles.find((o) => o.x + o.w > 54);
      if (next && g.dino.y === 0 && next.type !== 'bird') {
        // Seconds the obstacle spends overlapping the dinosaur's box (x 54..90).
        const overlapTime = (next.w + 36) / g.speed;
        // Best take-off: the middle of the airborne window is 0.278 s after take-off.
        const distanceToTouch = next.x - 90;
        if (distanceToTouch <= g.speed * (0.278 - overlapTime / 2)) G.press(g, 'jump');
      }
      G.update(g, STEP);
    }
    assert.equal(g.status, 'running', `bot crashed with seed ${seed} at ${g.time.toFixed(1)} s`);
  }
});

test('R2.9: boxes that overlap collide; boxes that only touch do not', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(G.boxesOverlap(a, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(G.boxesOverlap(a, { x: 10, y: 0, w: 10, h: 10 }), false); // touching side
  assert.equal(G.boxesOverlap(a, { x: 0, y: 10, w: 10, h: 10 }), false); // touching top
  assert.equal(G.boxesOverlap(a, { x: 50, y: 50, w: 10, h: 10 }), false);
});

test('R2.9: the dinosaur box is shrunk 4 px on every side', () => {
  const g = G.createGame();
  assert.deepEqual(G.getDinoBox(g.dino), { x: 54, y: 4, w: 36, h: 39 });
});

test('R2.9: standing into a cactus is a crash, jumping over it is not', () => {
  const hit = startedGame();
  place(hit, { x: 60 });
  G.update(hit, STEP);
  assert.equal(hit.status, 'crashed');

  const clear = startedGame();
  place(clear, { x: 60 });
  clear.dino.y = 60; // well above a 35 px cactus
  G.update(clear, STEP);
  assert.equal(clear.status, 'running');
});

test('R2.9: ducking clears a middle-height bird; standing hits it', () => {
  const bird = { type: 'bird', x: 60, y: 25, w: 46, h: 40 };

  const ducking = startedGame();
  place(ducking, bird);
  G.press(ducking, 'duck');
  G.update(ducking, STEP);
  assert.equal(ducking.status, 'running');

  const standing = startedGame();
  place(standing, bird);
  G.update(standing, STEP);
  assert.equal(standing.status, 'crashed');
});

test('R2.9: standing clears a high bird; jumping into it hits it', () => {
  const bird = { type: 'bird', x: 60, y: 50, w: 46, h: 40 };

  const standing = startedGame();
  place(standing, bird);
  G.update(standing, STEP);
  assert.equal(standing.status, 'running');

  const jumping = startedGame();
  place(jumping, bird);
  jumping.dino.y = 20;
  G.update(jumping, STEP);
  assert.equal(jumping.status, 'crashed');
});

function crashedGame(options) {
  const g = startedGame(options);
  place(g, { x: 60 });
  G.update(g, STEP);
  assert.equal(g.status, 'crashed');
  return g;
}

test('R2.10: jump input is ignored for 0.75 s after a crash', () => {
  const g = crashedGame();
  G.press(g, 'jump');
  assert.equal(g.status, 'crashed');
  run(g, 0.7);
  G.press(g, 'jump');
  assert.equal(g.status, 'crashed');
});

test('R2.10: after 0.75 s a jump starts a fresh run', () => {
  const g = startedGame();
  run(g, 2);
  g.distance = 8000; // a score of 200, so there is something to reset
  place(g, { x: 60 });
  G.update(g, STEP);
  assert.equal(g.status, 'crashed');
  run(g, 0.8);
  G.press(g, 'jump');
  assert.equal(g.status, 'running');
  assert.equal(g.distance, 0);
  assert.equal(g.speed, 360);
  assert.equal(g.time, 0);
  assert.deepEqual(g.obstacles, []);
  assert.equal(g.dino.y, 0);
  assert.equal(g.dino.vy, 0);
});

test('R2.11: passing a multiple of 100 sets a 0.8 s flash that counts down to 0', () => {
  const g = startedGame();
  g.distance = 3999; // score 99
  G.update(g, STEP); // adds about 6, so the score reaches 100
  assert.equal(G.getScore(g), 100);
  near(g.flash, 0.8, 0.02);
  run(g, 0.5);
  near(g.flash, 0.3, 0.03);
  run(g, 2);
  assert.equal(g.flash, 0);
});

test('R2.11: no flash when no multiple of 100 is passed', () => {
  const g = startedGame();
  run(g, 1);
  assert.equal(g.flash, 0);
});

test('R2.12: night while floor(score / 700) is odd', () => {
  for (const [score, night] of [[0, false], [699, false], [700, true], [1399, true], [1400, false], [2100, true]]) {
    assert.equal(G.isNight(score), night, `score ${score}`);
  }
});

test('R2.13: the same play gives the same result at 60 Hz and 120 Hz', () => {
  function play(frameSeconds) {
    const g = G.createGame();
    G.press(g, 'jump');
    for (let t = 0; t < 1 - 1e-9; t += frameSeconds) G.advance(g, frameSeconds);
    return g;
  }
  const slow = play(1 / 60);
  const fast = play(1 / 120);
  near(fast.dino.y, slow.dino.y, 1e-9, 'height');
  near(fast.distance, slow.distance, 1e-6, 'distance');
  near(fast.speed, slow.speed, 1e-9, 'speed');
});

test('R2.13: one frame of elapsed time counts for at most 0.25 s', () => {
  const g = startedGame();
  G.advance(g, 10); // a tab that was hidden for 10 seconds
  near(g.time, 0.25, 0.02);
});

test('R2.14: the same random source gives the same obstacles', () => {
  function snapshot() {
    const g = startedGame({ rng: seededRng(7) });
    run(g, 6);
    return JSON.stringify(g.obstacles);
  }
  const first = snapshot();
  assert.notEqual(first, '[]', 'the run must have produced an obstacle');
  assert.equal(snapshot(), first);
});

// ---------------------------------------------------------------- R3 (the game's side)

function fakeStore(initial) {
  return { saved: [], load() { return initial; }, save(score) { this.saved.push(score); } };
}

test('R3.1: a new game loads the high score from the store, 0 when there is none', () => {
  assert.equal(G.createGame({ store: fakeStore(1234) }).highScore, 1234);
  assert.equal(G.createGame({ store: fakeStore(0) }).highScore, 0);
  assert.equal(G.createGame().highScore, 0);
  assert.equal(G.formatScore(G.createGame().highScore), '00000');
});

test('R3.2: a crash with a higher score saves the new high score', () => {
  const store = fakeStore(10);
  const g = startedGame({ store });
  g.distance = 2000; // score 50
  place(g, { x: 60 });
  G.update(g, STEP);
  assert.equal(g.status, 'crashed');
  assert.deepEqual(store.saved, [50]);
  assert.equal(g.highScore, 50);
});

test('R3.2: a crash with a lower or equal score saves nothing', () => {
  for (const high of [80, 50]) {
    const store = fakeStore(high);
    const g = startedGame({ store });
    g.distance = 2000; // score 50
    place(g, { x: 60 });
    G.update(g, STEP);
    assert.deepEqual(store.saved, [], `high score ${high}`);
    assert.equal(g.highScore, high);
  }
});

test('R3.4: the game still plays when the store throws on load and on save', () => {
  const store = {
    load() { throw new Error('blocked'); },
    save() { throw new Error('blocked'); },
  };
  const g = startedGame({ store });
  assert.equal(g.highScore, 0);
  g.distance = 2000;
  place(g, { x: 60 });
  assert.doesNotThrow(() => G.update(g, STEP));
  assert.equal(g.status, 'crashed');
  assert.equal(g.highScore, 50); // kept in memory for this visit
});

test('R3.6: restarting after a crash keeps the high score', () => {
  const g = startedGame({ store: fakeStore(0) });
  g.distance = 2000;
  place(g, { x: 60 });
  G.update(g, STEP);
  run(g, 0.8);
  G.press(g, 'jump');
  assert.equal(g.status, 'running');
  assert.equal(g.highScore, 50);
});
