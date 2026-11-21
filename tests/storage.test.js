'use strict';
// Tests for storage.js (R3: keeping the high score).
// A fake storage object stands in for the browser's localStorage, so these run in Node.

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../storage.js');
const { fakeStorage, brokenStorage } = require('./helpers.js');

test('R3.1: load returns the stored high score, or 0 when nothing is stored', () => {
  assert.equal(S.createHighScoreStore(fakeStorage({ 'dino-high-score': '1234' })).load(), 1234);
  assert.equal(S.createHighScoreStore(fakeStorage()).load(), 0);
});

test('R3.2: save writes the score to storage as text', () => {
  const storage = fakeStorage();
  const store = S.createHighScoreStore(storage);
  store.save(321);
  assert.equal(storage.data['dino-high-score'], '321');
  assert.equal(S.createHighScoreStore(storage).load(), 321); // survives a "reload"
});

test('R3.3: only 1 to 5 digits count as a score; anything else is 0', () => {
  const good = { '0': 0, '7': 7, '00042': 42, '99999': 99999 };
  for (const [text, number] of Object.entries(good)) {
    assert.equal(S.parseScore(text), number, `"${text}"`);
  }
  for (const bad of ['', ' ', '-5', '12.5', 'abc', '12abc', '100000', '1e3', null, undefined, 42, {}]) {
    assert.equal(S.parseScore(bad), 0, `${JSON.stringify(bad)}`);
  }
});

test('R3.3: load treats a damaged stored value as 0', () => {
  const store = S.createHighScoreStore(fakeStorage({ 'dino-high-score': 'banana' }));
  assert.equal(store.load(), 0);
});

test('R3.4: with storage that throws, load and save do not throw and the score is kept in memory', () => {
  const store = S.createHighScoreStore(brokenStorage());
  assert.equal(store.load(), 0);
  assert.doesNotThrow(() => store.save(77));
  assert.equal(store.load(), 77);
});

test('R3.4: with no storage at all (null), it works the same way', () => {
  const store = S.createHighScoreStore(null);
  assert.equal(store.load(), 0);
  store.save(12);
  assert.equal(store.load(), 12);
});

test('R3.5: the storage key is dino-high-score', () => {
  assert.equal(S.STORAGE_KEY, 'dino-high-score');
});

test('R3.5: pickBrowserStorage returns localStorage, or null when looking it up throws', () => {
  const local = fakeStorage();
  assert.equal(S.pickBrowserStorage({ localStorage: local }), local);
  assert.equal(S.pickBrowserStorage({}), null);
  assert.equal(S.pickBrowserStorage(undefined), null);
  const blocked = {};
  Object.defineProperty(blocked, 'localStorage', {
    get() { throw new Error('SecurityError'); },
  });
  assert.equal(S.pickBrowserStorage(blocked), null);
});
