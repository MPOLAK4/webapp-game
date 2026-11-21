// storage.js: keeps the high score between visits (R3).
//
// The game never touches localStorage directly. It is given a "store" with two
// methods, load() and save(score), so tests can give it a fake one.
// This file works in two places: a browser <script> tag, and Node (for the tests).

(function () {
  'use strict';

  const STORAGE_KEY = 'dino-high-score';

  // Turn whatever was stored into a score. Only 1 to 5 digits are accepted
  // (0 to 99999); anything else (empty, negative, decimal, text, too long) is 0.
  function parseScore(text) {
    if (typeof text !== 'string' || !/^\d{1,5}$/.test(text)) return 0;
    return Number(text);
  }

  // Find the browser's localStorage. Even looking it up can throw (some privacy
  // settings), so the lookup is wrapped. Returns null when it is not usable.
  function pickBrowserStorage(root) {
    try {
      return (root && root.localStorage) || null;
    } catch (error) {
      return null;
    }
  }

  // `storage` is anything with getItem(key) and setItem(key, value), or null.
  // If storage is missing or throws, the score is still kept in memory, so the
  // game keeps working and the high score lasts until the page is closed (R3.4).
  function createHighScoreStore(storage, key = STORAGE_KEY) {
    let remembered = 0;
    return {
      load() {
        try {
          remembered = Math.max(remembered, parseScore(storage.getItem(key)));
        } catch (error) {
          // storage missing or blocked: use what we remember
        }
        return remembered;
      },
      save(score) {
        remembered = score;
        try {
          storage.setItem(key, String(score));
        } catch (error) {
          // storage missing or blocked: the in-memory copy is all we have
        }
      },
    };
  }

  const api = { STORAGE_KEY, parseScore, pickBrowserStorage, createHighScoreStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.DinoStorage = api;
})();
