// game.js: the rules of the dinosaur game (R1, R2, and the game's side of R3).
//
// No drawing and no keyboard events live here, only numbers. That is what lets Node
// test it. main.js reads the game object and draws it.
//
// Units: pixels and seconds. Heights are measured UP from the ground (y = 0 is the
// ground), unlike a canvas where y grows downward. main.js flips them when drawing.
// The numbers come from spec.md; change them there too.

(function () {
  'use strict';

  const CONFIG = {
    WORLD_WIDTH: 600,
    DINO_X: 50,
    STAND: { w: 44, h: 47 },
    DUCK: { w: 59, h: 25 },
    HITBOX_INSET: 4, // the dinosaur's hit box is this much smaller on every side
    JUMP_VELOCITY: 600, // px/s, upward
    GRAVITY: 2160, // px/s^2
    FAST_FALL: 3, // gravity multiplier while duck is held in the air
    START_SPEED: 360, // px/s
    MAX_SPEED: 780,
    ACCELERATION: 3.6, // px/s gained every second
    SCORE_PER_PIXEL: 0.025,
    MAX_SCORE: 99999,
    CLEAR_TIME: 3, // seconds with no obstacles at the start of a run
    GAP_COEFFICIENT: 0.6,
    MAX_GAP_FACTOR: 1.5,
    RESTART_DELAY: 0.75, // seconds after a crash before jump restarts
    FLASH_DURATION: 0.8,
    FLASH_EVERY: 100, // points
    NIGHT_EVERY: 700, // points
    BIRD_HEIGHTS: [0, 25, 50],
    BIRD_SPEED_OFFSET: 48, // px/s faster or slower than the ground
    STEP: 1 / 60, // fixed time step, seconds
    MAX_FRAME: 0.25, // longest elapsed time one frame may count for
  };

  // minSpeed: slowest game speed at which this type can appear.
  // groupSpeed: slowest speed at which a group of 2 or 3 can appear.
  // Order matters: spawnObstacle picks from this list by index.
  const OBSTACLE_TYPES = {
    cactusSmall: { w: 17, h: 35, minGap: 120, minSpeed: 0, groupSpeed: 240 },
    cactusLarge: { w: 25, h: 50, minGap: 120, minSpeed: 0, groupSpeed: 420 },
    bird: { w: 46, h: 40, minGap: 150, minSpeed: 510, groupSpeed: Infinity },
  };

  // ---------------------------------------------------------------- scores

  function getScore(game) {
    return Math.min(CONFIG.MAX_SCORE, Math.floor(game.distance * CONFIG.SCORE_PER_PIXEL));
  }

  // 42 -> "00042". Used for both the score and the high score.
  function formatScore(score) {
    const whole = Math.min(CONFIG.MAX_SCORE, Math.max(0, Math.floor(score)));
    return String(whole).padStart(5, '0');
  }

  function isNight(score) {
    return Math.floor(score / CONFIG.NIGHT_EVERY) % 2 === 1;
  }

  // ---------------------------------------------------------------- boxes

  function getDinoSize(dino) {
    const size = dino.ducking ? CONFIG.DUCK : CONFIG.STAND;
    return { w: size.w, h: size.h };
  }

  // The dinosaur's hit box: its picture, shrunk a little so near misses are forgiven.
  function getDinoBox(dino) {
    const size = getDinoSize(dino);
    const inset = CONFIG.HITBOX_INSET;
    return { x: dino.x + inset, y: dino.y + inset, w: size.w - 2 * inset, h: size.h - 2 * inset };
  }

  function getObstacleBox(obstacle) {
    return { x: obstacle.x, y: obstacle.y, w: obstacle.w, h: obstacle.h };
  }

  // Two boxes collide only if they overlap; merely touching edges does not count.
  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---------------------------------------------------------------- the game object

  function isGrounded(dino) {
    return dino.y === 0 && dino.vy === 0;
  }

  // Ducking only happens on the ground (in the air, duck means "fall faster").
  function syncDuck(game) {
    game.dino.ducking = game.duckHeld && isGrounded(game.dino);
  }

  // Everything that starts fresh on each run. The high score is NOT reset.
  function resetRun(game) {
    game.time = 0; // seconds of running
    game.distance = 0; // pixels run; the score comes from this
    game.speed = CONFIG.START_SPEED;
    game.flash = 0; // seconds of "score flash" left (every 100 points)
    game.crashTime = 0; // seconds since the crash
    game.newRecord = false;
    game.obstacles = [];
    game.dino = { x: CONFIG.DINO_X, y: 0, vy: 0, ducking: false };
    syncDuck(game);
  }

  // `rng` returns a number in [0, 1) like Math.random; tests pass a fixed one.
  // `store` has load() and save(score) (see storage.js); null means "do not save".
  function createGame({ rng = Math.random, store = null } = {}) {
    const game = {
      rng,
      store,
      status: 'waiting', // 'waiting' -> 'running' -> 'crashed' -> 'running' ...
      highScore: 0,
      duckHeld: false,
      accumulator: 0,
    };
    try {
      if (store) game.highScore = store.load();
    } catch (error) {
      game.highScore = 0; // a broken store must never break the game (R3.4)
    }
    resetRun(game);
    return game;
  }

  // ---------------------------------------------------------------- input

  // Keyboard code -> action. Only 'jump' and 'duck' exist; main.js does the rest.
  function keyToAction(code) {
    if (code === 'Space' || code === 'ArrowUp') return 'jump';
    if (code === 'ArrowDown') return 'duck';
    return null;
  }

  function jump(game) {
    if (isGrounded(game.dino)) game.dino.vy = CONFIG.JUMP_VELOCITY;
    syncDuck(game);
  }

  // An action key went down.
  function press(game, action) {
    if (action === 'duck') {
      game.duckHeld = true;
      syncDuck(game);
    } else if (action === 'jump') {
      if (game.status === 'waiting') {
        game.status = 'running';
        jump(game);
      } else if (game.status === 'running') {
        jump(game);
      } else if (game.status === 'crashed' && game.crashTime >= CONFIG.RESTART_DELAY) {
        resetRun(game);
        game.status = 'running';
      }
    }
  }

  // An action key went up.
  function release(game, action) {
    if (action === 'duck') {
      game.duckHeld = false;
      syncDuck(game);
    }
  }

  // ---------------------------------------------------------------- obstacles

  // Create one obstacle at the right edge and add it to the game. Four things are
  // chosen by the random source, always in this order: type, size (or height), the
  // bird's speed offset (birds only), and the gap.
  function spawnObstacle(game) {
    const rng = game.rng;
    const eligible = Object.keys(OBSTACLE_TYPES)
      .filter((name) => game.speed >= OBSTACLE_TYPES[name].minSpeed);
    const typeIndex = Math.min(eligible.length - 1, Math.floor(rng() * eligible.length));
    const type = eligible[typeIndex];
    const spec = OBSTACLE_TYPES[type];

    let size = 1;
    let y = 0;
    let speedOffset = 0;
    if (type === 'bird') {
      const heights = CONFIG.BIRD_HEIGHTS;
      y = heights[Math.min(heights.length - 1, Math.floor(rng() * heights.length))];
      speedOffset = rng() < 0.5 ? -CONFIG.BIRD_SPEED_OFFSET : CONFIG.BIRD_SPEED_OFFSET;
    } else {
      const sizeRoll = rng();
      const maxSize = game.speed >= spec.groupSpeed ? 3 : 1;
      size = 1 + Math.min(maxSize - 1, Math.floor(sizeRoll * maxSize));
    }

    const w = spec.w * size;
    // The faster the game and the wider the obstacle, the more room to land and re-jump.
    const baseGap = Math.round(w * game.speed / 60 + spec.minGap * CONFIG.GAP_COEFFICIENT);
    const gap = Math.round(baseGap + rng() * baseGap * (CONFIG.MAX_GAP_FACTOR - 1));

    const obstacle = { type, x: CONFIG.WORLD_WIDTH, y, w, h: spec.h, size, gap, speedOffset };
    game.obstacles.push(obstacle);
    return obstacle;
  }

  // ---------------------------------------------------------------- one step of time

  function crash(game) {
    game.status = 'crashed';
    game.crashTime = 0;
    const score = getScore(game);
    if (score > game.highScore) {
      game.highScore = score;
      game.newRecord = true;
      try {
        if (game.store) game.store.save(score);
      } catch (error) {
        // saving failed; the high score still counts for this page visit (R3.4)
      }
    }
  }

  function updateDino(game, dt) {
    const dino = game.dino;
    if (dino.y > 0 || dino.vy > 0) {
      const gravity = CONFIG.GRAVITY * (game.duckHeld ? CONFIG.FAST_FALL : 1);
      dino.vy -= gravity * dt;
      dino.y += dino.vy * dt;
      if (dino.y <= 0) {
        dino.y = 0;
        dino.vy = 0;
      }
    }
    syncDuck(game);
  }

  function updateObstacles(game, dt) {
    for (const o of game.obstacles) o.x -= (game.speed + o.speedOffset) * dt;
    game.obstacles = game.obstacles.filter((o) => o.x + o.w >= 0);

    if (game.time >= CONFIG.CLEAR_TIME) {
      const last = game.obstacles[game.obstacles.length - 1];
      if (!last || last.x + last.w + last.gap < CONFIG.WORLD_WIDTH) spawnObstacle(game);
    }
  }

  // Move the game forward by `dt` seconds. Only a running game moves; a crashed game
  // just counts the time since the crash so the restart delay can end.
  function update(game, dt) {
    if (game.status === 'crashed') {
      game.crashTime += dt;
      return;
    }
    if (game.status !== 'running') return;

    game.time += dt;
    game.speed = Math.min(CONFIG.MAX_SPEED, game.speed + CONFIG.ACCELERATION * dt);

    const scoreBefore = getScore(game);
    game.distance += game.speed * dt;
    game.flash = Math.max(0, game.flash - dt);
    if (Math.floor(getScore(game) / CONFIG.FLASH_EVERY) > Math.floor(scoreBefore / CONFIG.FLASH_EVERY)) {
      game.flash = CONFIG.FLASH_DURATION;
    }

    updateDino(game, dt);
    updateObstacles(game, dt);

    const dinoBox = getDinoBox(game.dino);
    if (game.obstacles.some((o) => boxesOverlap(dinoBox, getObstacleBox(o)))) crash(game);
  }

  // Feed real elapsed time (seconds since the last frame) in. The game moves in fixed
  // steps of 1/60 s, so it plays the same on a 30 Hz and a 144 Hz screen (R2.13).
  function advance(game, elapsed) {
    game.accumulator += Math.min(Math.max(elapsed, 0), CONFIG.MAX_FRAME);
    while (game.accumulator + 1e-9 >= CONFIG.STEP) {
      update(game, CONFIG.STEP);
      game.accumulator -= CONFIG.STEP;
    }
  }

  const api = {
    CONFIG, OBSTACLE_TYPES,
    createGame, keyToAction, press, release, update, advance, spawnObstacle,
    getScore, formatScore, isNight,
    getDinoSize, getDinoBox, getObstacleBox, boxesOverlap,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.DinoGame = api;
})();
