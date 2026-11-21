'use strict';
// Keeps the tests and spec.md in step:
//  - every requirement ID in spec.md has at least one automated test, and
//  - every test title starts with an ID that exists in spec.md.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const spec = fs.readFileSync(path.join(root, 'spec.md'), 'utf8');
const specIds = [...spec.matchAll(/^- \*\*(R\d+\.\d+)\*\*/gm)].map((m) => m[1]);

const testFiles = fs.readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js') && f !== 'traceability.test.js');
const titles = [];
for (const file of testFiles) {
  const source = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const m of source.matchAll(/^test\(\s*(['"`])(.*?)\1/gm)) titles.push({ file, title: m[2] });
}
const citedIds = new Set(titles.map((t) => (t.title.match(/^(R\d+\.\d+):/) || [])[1]));

test('traceability: spec.md lists requirement IDs (sanity check for this test file)', () => {
  assert.ok(specIds.length >= 20, `only found ${specIds.length} IDs in spec.md`);
});

test('traceability: every requirement ID in spec.md has a test that names it', () => {
  const missing = specIds.filter((id) => !citedIds.has(id));
  assert.deepEqual(missing, [], `no test names: ${missing.join(', ')}`);
});

test('traceability: every test title starts with a requirement ID from spec.md, like "R2.3:"', () => {
  const bad = titles.filter((t) => !specIds.includes((t.title.match(/^(R\d+\.\d+):/) || [])[1]));
  assert.deepEqual(bad.map((t) => `${t.file}: ${t.title}`), []);
});
