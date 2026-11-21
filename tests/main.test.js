// Tests for main.js, the browser layer. There is no real browser here, so we hand
// start() a fake window, document and canvas. These tests only check the wiring
// (keys, saving, drawing without errors). How the game LOOKS is checked by hand: M1-M4.

const test = require('node:test');
const assert = require('node:assert/strict');
const { start } = require('../main.js');
const { fakeStorage } = require('./helpers.js');

// A canvas context that accepts any call and any property, and counts the calls.
function fakeContext() {
  const calls = { fillRect: 0, fillText: 0 };
  const target = {};
  const ctx = new Proxy(target, {
    get(obj, name) {
      if (name in obj) return obj[name];
      return (...args) => {
        if (name in calls) calls[name]++;
      };
    },
    set(obj, name, value) {
      obj[name] = value;
      return true;
    },
  });
  return { ctx, calls };
}

function fakePage({ localStorage } = {}) {
  const { ctx, calls } = fakeContext();
  const handlers = {};
  let nextFrame = null;
  const win = {
    localStorage,
    addEventListener(type, fn) { handlers[type] = fn; },
    requestAnimationFrame(fn) { nextFrame = fn; },
  };
  const doc = { getElementById: () => ({ getContext: () => ctx }) };
  // key(): send a fake key event and report whether preventDefault was called.
  function key(type, code, extra = {}) {
    let prevented = false;
    handlers[type]({ code, repeat: false, preventDefault() { prevented = true; }, ...extra });
    return prevented;
  }
  return { win, doc, calls, key, handlers, runFrame: (ms) => nextFrame(ms) };
}

test('R1.1: the first frame draws the picture without throwing', () => {
  const page = fakePage({ localStorage: fakeStorage() });
  start(page.win, page.doc);
  page.runFrame(0);
  page.runFrame(16);
  assert.ok(page.calls.fillRect > 0, 'something was drawn');
  assert.ok(page.calls.fillText > 0, 'the score text was drawn');
});

test('R2.1: Space and the arrow keys are claimed (so the page cannot scroll); other keys are not', () => {
  const page = fakePage();
  start(page.win, page.doc);
  assert.equal(page.key('keydown', 'Space'), true);
  assert.equal(page.key('keydown', 'ArrowUp'), true);
  assert.equal(page.key('keydown', 'ArrowDown'), true);
  assert.equal(page.key('keyup', 'Space'), true);
  assert.equal(page.key('keydown', 'KeyA'), false);
});

test('R2.2: pressing Space in the page starts the run and jumps', () => {
  const page = fakePage();
  const { game } = start(page.win, page.doc);
  assert.equal(game.status, 'waiting');
  page.key('keydown', 'Space');
  assert.equal(game.status, 'running');
  assert.ok(game.dino.vy > 0, 'the dinosaur is jumping');
});

test('R1.4: the down arrow ducks while held and stops when released', () => {
  const page = fakePage();
  const { game } = start(page.win, page.doc);
  page.key('keydown', 'ArrowDown');
  assert.equal(game.dino.ducking, true);
  page.key('keyup', 'ArrowDown');
  assert.equal(game.dino.ducking, false);
});

test('R1.4: losing window focus lets go of duck (no stuck duck)', () => {
  const page = fakePage();
  const { game } = start(page.win, page.doc);
  page.key('keydown', 'ArrowDown');
  page.handlers.blur();
  assert.equal(game.dino.ducking, false);
});

test('R2.13: frames drive the game by real elapsed time', () => {
  const page = fakePage();
  const { game } = start(page.win, page.doc);
  page.key('keydown', 'Space');
  page.runFrame(1000); // first frame only records the time
  page.runFrame(1100); // 0.1 s later
  assert.ok(game.time > 0.09 && game.time < 0.11, 'about 0.1 s of game time passed: ' + game.time);
});

test('R3.5: the high score is read from localStorage when the page starts', () => {
  const page = fakePage({ localStorage: fakeStorage({ 'dino-high-score': '321' }) });
  const { game } = start(page.win, page.doc);
  assert.equal(game.highScore, 321);
});

test('R3.4: the page still starts when localStorage is blocked', () => {
  const win = {
    get localStorage() { throw new Error('blocked'); },
    addEventListener() {},
    requestAnimationFrame() {},
  };
  const { ctx } = fakeContext();
  const doc = { getElementById: () => ({ getContext: () => ctx }) };
  const { game } = start(win, doc);
  assert.equal(game.highScore, 0);
});
