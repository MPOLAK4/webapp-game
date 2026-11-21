'use strict';
// Shared helpers for the tests. Not a test file itself (the name has no ".test").

// A random source that returns the listed numbers in order, then repeats the last one.
// Lets a test decide exactly which obstacle "randomly" appears.
function scriptedRng(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

// A small seeded generator: the same seed always gives the same sequence.
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A fake "localStorage": remembers values in a plain object.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

// A storage whose every call throws, like localStorage in some private modes.
function brokenStorage() {
  const fail = () => { throw new Error('storage blocked'); };
  return { getItem: fail, setItem: fail };
}

module.exports = { scriptedRng, seededRng, fakeStorage, brokenStorage };
