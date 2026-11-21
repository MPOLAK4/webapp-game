// main.js: the part that touches the browser: draws the game on the canvas, listens
// to the keyboard, and runs the animation loop. The rules live in game.js and the
// saving lives in storage.js; this file only connects them to the screen.
//
// start(win, doc) takes the window and document as arguments (instead of using the
// globals) so tests can run it with fakes.

(function () {
  'use strict';

  const inNode = typeof module !== 'undefined' && module.exports;
  const Game = inNode ? require('./game.js') : window.DinoGame;
  const Store = inNode ? require('./storage.js') : window.DinoStorage;

  const WIDTH = Game.CONFIG.WORLD_WIDTH;
  const HEIGHT = 150;
  const GROUND_Y = 130; // canvas y of the ground line. The game measures height UP from it.

  const DAY = { bg: [247, 247, 247], fg: [83, 83, 83] };
  const NIGHT = { bg: [32, 33, 36], fg: [172, 172, 172] };

  // ------------------------------------------------------------ pixel art
  // '#' is a filled pixel, 'o' is the eye (drawn in the background colour), '.' is empty.
  // Each pixel is drawn 2x2 on the canvas.
  const DINO_BODY = [
    '..........##########..',
    '..........#o##########',
    '..........############',
    '..........############',
    '..........#######.....',
    '..........#######.....',
    '..........##########..',
    '#.........######......',
    '#........#######......',
    '#.......########.#....',
    '##.....#########.#....',
    '###...###########.....',
    '####.#############....',
    '###################...',
    '.##################...',
    '..#################...',
    '...###############....',
    '....#############.....',
    '.....###########......',
    '......#########.......',
  ];
  const DINO_LEGS = [
    [
      '........###..###......',
      '........###...........',
      '........####..........',
    ],
    [
      '........###..###......',
      '.............###......',
      '.............####.....',
    ],
  ];
  const DINO_DUCK = [
    [
      '..................########..',
      '..................#o########',
      '..................##########',
      '###...............######....',
      '#####.........##############',
      '#########################...',
      '.########################...',
      '..######################....',
      '....##################......',
      '.......###..###.............',
      '.......###..................',
    ],
    [
      '..................########..',
      '..................#o########',
      '..................##########',
      '###...............######....',
      '#####.........##############',
      '#########################...',
      '.########################...',
      '..######################....',
      '....##################......',
      '.......###..###.............',
      '............###.............',
    ],
  ];

  function mix(a, b, t) {
    return 'rgb(' + [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)).join(',') + ')';
  }

  function drawArt(ctx, rows, left, top, fg, bg) {
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === '.') continue;
        ctx.fillStyle = ch === 'o' ? bg : fg;
        ctx.fillRect(left + c * 2, top + r * 2, 2, 2);
      }
    }
  }

  // ------------------------------------------------------------ drawing

  function drawCactus(ctx, o, fg) {
    const unitW = o.w / o.size;
    const top = GROUND_Y - o.y - o.h;
    ctx.fillStyle = fg;
    for (let i = 0; i < o.size; i++) {
      const x = o.x + i * unitW;
      const trunk = Math.round(unitW * 0.36);
      const trunkX = x + Math.floor((unitW - trunk) / 2);
      ctx.fillRect(trunkX, top, trunk, o.h); // trunk
      const armTop = top + Math.round(o.h * 0.3);
      const armH = Math.round(o.h * 0.3);
      ctx.fillRect(x, armTop, 3, armH); // left arm, upright part
      ctx.fillRect(x, armTop + armH - 3, trunkX - x + 1, 3); // left arm, joins the trunk
      const rightTop = top + Math.round(o.h * 0.15);
      ctx.fillRect(x + unitW - 3, rightTop, 3, armH); // right arm, upright part
      ctx.fillRect(trunkX + trunk - 1, rightTop + armH - 3, x + unitW - (trunkX + trunk) + 1, 3);
    }
  }

  function drawBird(ctx, o, fg, bg, now) {
    const top = GROUND_Y - o.y - o.h;
    const wingsUp = Math.floor(now / 166) % 2 === 0;
    ctx.fillStyle = fg;
    ctx.fillRect(o.x + 10, top + 16, 28, 9); // body
    ctx.fillRect(o.x + 38, top + 17, 8, 3); // tail
    ctx.beginPath(); // beak
    ctx.moveTo(o.x, top + 20);
    ctx.lineTo(o.x + 11, top + 15);
    ctx.lineTo(o.x + 11, top + 24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // wing
    if (wingsUp) {
      ctx.moveTo(o.x + 16, top + 16);
      ctx.lineTo(o.x + 30, top);
      ctx.lineTo(o.x + 35, top + 16);
    } else {
      ctx.moveTo(o.x + 16, top + 25);
      ctx.lineTo(o.x + 30, top + 40);
      ctx.lineTo(o.x + 35, top + 25);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.fillRect(o.x + 14, top + 18, 2, 2); // eye
  }

  function drawDino(ctx, game, fg, bg) {
    const d = game.dino;
    const legFrame = game.status === 'running' && d.y === 0 ? Math.floor(game.time * 10) % 2 : 0;
    if (d.ducking) {
      const rows = DINO_DUCK[legFrame];
      drawArt(ctx, rows, d.x, GROUND_Y - d.y - rows.length * 2, fg, bg);
      if (game.status === 'crashed') {
        ctx.fillStyle = bg;
        ctx.fillRect(d.x + 38, GROUND_Y - d.y - 21, 4, 4);
      }
    } else {
      const rows = DINO_BODY.concat(DINO_LEGS[legFrame]);
      const top = GROUND_Y - d.y - rows.length * 2;
      drawArt(ctx, rows, d.x, top, fg, bg);
      if (game.status === 'crashed') {
        ctx.fillStyle = bg;
        ctx.fillRect(d.x + 38, top + 2, 4, 4); // a bigger "eye": the dinosaur is dead
      }
    }
  }

  function drawGround(ctx, game, fg, bg, nightLevel) {
    ctx.fillStyle = fg;
    ctx.fillRect(0, GROUND_Y, WIDTH, 1);
    // Little bumps and dashes under the line, scrolling with the distance run.
    const scroll = game.distance % 24;
    ctx.globalAlpha = 0.6;
    for (let i = -1; i < WIDTH / 24 + 1; i++) {
      const hash = ((Math.floor(game.distance / 24) + i) * 2654435761) >>> 0;
      const x = i * 24 - scroll + (hash % 11);
      ctx.fillRect(x, GROUND_Y + 4 + (hash % 3) * 4, 2 + (hash % 6), 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawSky(ctx, clouds, fg, bg, nightLevel) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = fg;
    for (const c of clouds) {
      ctx.fillRect(c.x, c.y + 6, 44, 6);
      ctx.fillRect(c.x + 8, c.y + 2, 24, 6);
      ctx.fillRect(c.x + 16, c.y, 10, 3);
    }
    if (nightLevel > 0.01) {
      ctx.globalAlpha = nightLevel;
      ctx.fillStyle = fg;
      for (let i = 0; i < 14; i++) {
        ctx.fillRect((i * 97 + 31) % WIDTH, 12 + ((i * 53) % 70), 2, 2); // fixed stars
      }
      ctx.beginPath(); // moon
      ctx.arc(520, 40, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(526, 37, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawText(ctx, game, fg, bg) {
    const score = Game.getScore(game);
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = fg;
    const hidden = game.flash > 0 && Math.floor(game.flash / (Game.CONFIG.FLASH_DURATION / 6)) % 2 === 1;
    if (!hidden) ctx.fillText(Game.formatScore(score), WIDTH - 10, 20);
    ctx.globalAlpha = 0.6;
    ctx.fillText('HI ' + Game.formatScore(game.highScore), WIDTH - 66, 20);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    if (game.status === 'waiting') {
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('Press SPACE to start', WIDTH / 2, 62);
    } else if (game.status === 'crashed') {
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText('G A M E   O V E R', WIDTH / 2, 55);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 3;
      ctx.beginPath(); // restart icon: a circular arrow
      ctx.arc(WIDTH / 2, 82, 10, -0.5, 4.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2 + 4, 66);
      ctx.lineTo(WIDTH / 2 + 15, 71);
      ctx.lineTo(WIDTH / 2 + 9, 80);
      ctx.closePath();
      ctx.fill();
      if (game.crashTime >= Game.CONFIG.RESTART_DELAY) {
        ctx.font = '12px "Courier New", monospace';
        ctx.fillText('Press SPACE to restart', WIDTH / 2, 112);
      }
    }
  }

  // ------------------------------------------------------------ the page

  function start(win, doc) {
    const canvas = doc.getElementById('game');
    const ctx = canvas.getContext('2d');
    const store = Store.createHighScoreStore(Store.pickBrowserStorage(win));
    const game = Game.createGame({ store });

    // Cosmetic only (not part of the rules), so plain Math.random is fine here.
    const clouds = [0, 1, 2].map((i) => ({ x: 80 + i * 220 + Math.random() * 60, y: 18 + Math.random() * 40 }));
    let nightLevel = 0; // 0 = day, 1 = night; eases between them
    let last = null;

    function render(now, dt) {
      const target = Game.isNight(Game.getScore(game)) ? 1 : 0;
      nightLevel += (target - nightLevel) * Math.min(1, dt * 2.5);
      const bg = mix(DAY.bg, NIGHT.bg, nightLevel);
      const fg = mix(DAY.fg, NIGHT.fg, nightLevel);

      const drift = game.status === 'running' ? game.speed * 0.2 : 15;
      for (const c of clouds) {
        c.x -= drift * dt;
        if (c.x < -50) {
          c.x = WIDTH + Math.random() * 100;
          c.y = 18 + Math.random() * 40;
        }
      }

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      drawSky(ctx, clouds, fg, bg, nightLevel);
      drawGround(ctx, game, fg, bg, nightLevel);
      for (const o of game.obstacles) {
        if (o.type === 'bird') drawBird(ctx, o, fg, bg, now);
        else drawCactus(ctx, o, fg);
      }
      drawDino(ctx, game, fg, bg);
      drawText(ctx, game, fg, bg);
    }

    // Called once per screen refresh with the time in milliseconds.
    function frame(now) {
      const dt = last === null ? 0 : Math.min(0.1, (now - last) / 1000);
      const elapsed = last === null ? 0 : (now - last) / 1000;
      last = now;
      Game.advance(game, elapsed);
      render(now, dt);
      win.requestAnimationFrame(frame);
    }

    win.addEventListener('keydown', (event) => {
      const action = Game.keyToAction(event.code);
      if (!action) return;
      event.preventDefault(); // Space and the arrows would otherwise scroll the page
      if (!event.repeat) Game.press(game, action);
    });
    win.addEventListener('keyup', (event) => {
      const action = Game.keyToAction(event.code);
      if (!action) return;
      event.preventDefault();
      Game.release(game, action);
    });
    win.addEventListener('blur', () => Game.release(game, 'duck')); // no stuck duck

    win.requestAnimationFrame(frame);
    return { game, frame };
  }

  const api = { start };
  if (inNode) module.exports = api;
  else start(window, document);
})();
