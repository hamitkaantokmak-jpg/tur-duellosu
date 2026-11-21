/* Static season catalog and driver-name fallback embedded in index.html. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pick = (name) => JSON.parse(html.match(new RegExp(`^const ${name} = (\\{.*\\});$`, 'm'))[1]);
const CATALOG = pick('CATALOG');
const NAMES = pick('NAMES');
const KNOWN_SESSIONS = new Set(['Practice 1', 'Practice 2', 'Practice 3', 'Qualifying', 'Sprint Qualifying', 'Sprint Shootout', 'Sprint', 'Race']);

test('every season lists weekends once, in date order, with known session names', () => {
  for (const [year, events] of Object.entries(CATALOG)) {
    assert.ok(events.length > 0, year);
    assert.equal(new Set(events.map((e) => e.e)).size, events.length, `${year} has duplicate weekends`);
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      assert.match(e.d, new RegExp(`^${year}-\\d\\d-\\d\\d$`), `${year} ${e.e} date`);
      if (i) assert.ok(events[i - 1].d < e.d, `${year}: ${events[i - 1].e} must precede ${e.e}`);
      assert.ok(e.s.length > 0 && e.s.every((s) => KNOWN_SESSIONS.has(s)), `${year} ${e.e} sessions`);
    }
  }
});

test('driver-name fallback never gives two codes the same person', () => {
  const owner = new Map();
  for (const [code, [first, last]] of Object.entries(NAMES.names)) {
    assert.match(code, /^[A-Z]{3}$/);
    const who = `${first} ${last}`;
    assert.ok(!owner.has(who), `${code} and ${owner.get(who)} both map to ${who}`);
    owner.set(who, code);
  }
});
