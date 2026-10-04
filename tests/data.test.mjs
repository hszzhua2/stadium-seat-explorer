import test from 'node:test';
import assert from 'node:assert/strict';
import { SECTIONS, SECTION_BY_ID, STANDS, VENUE, getRowSeatCount, getPosition, importCoordinates, clearCoordinates, getImportedCount, defaultEyeHeight } from '../src/seat-data.js';

test('all four stands and requested viewing-location types have selectable positions', () => {
  assert.deepEqual(new Set(SECTIONS.map(section => section.stand)), new Set(STANDS.map(stand => stand.id)));
  for (const type of ['seat', 'standing', 'suite', 'accessible', 'dugout']) {
    assert.ok(SECTIONS.some(section => section.type === type), type);
  }
  assert.equal(SECTION_BY_ID.size, SECTIONS.length, 'section identifiers are unique');
  for (const section of SECTIONS) {
    assert.ok(Number.isInteger(section.rows) && section.rows > 0, section.id);
    assert.ok(getRowSeatCount(section, 1) > 0, section.id);
    for (const [row, seat] of [[1, 1], [section.rows, section.seatsPerRow]]) {
      const position = getPosition(section, row, seat);
      assert.ok(['x', 'y', 'z'].every(key => Number.isFinite(position[key])), section.id);
      assert.ok(Math.abs(position.x) < 120 && Math.abs(position.z) < 125 && position.y >= 0 && position.y < 70, section.id);
      if (section.side === 'main') assert.ok(position.x < -VENUE.pitchWidth / 2, section.id);
      if (section.side === 'kenny') assert.ok(position.x > VENUE.pitchWidth / 2, section.id);
      if (section.side === 'kop') assert.ok(position.z > VENUE.pitchLength / 2, section.id);
      if (section.side === 'road') assert.ok(position.z < -VENUE.pitchLength / 2, section.id);
    }
  }
});

test('estimated rows rise and move away from the pitch, while seats spread along a row', () => {
  for (const section of SECTIONS.filter(section => section.rows > 1)) {
    const front = getPosition(section, 1, 1);
    const rear = getPosition(section, section.rows, 1);
    const lastSeat = getPosition(section, 1, section.seatsPerRow);
    assert.ok(rear.y > front.y, section.id);
    if (['main', 'kenny'].includes(section.side)) {
      assert.ok(Math.abs(rear.x) > Math.abs(front.x), section.id);
      assert.ok(lastSeat.z > front.z, section.id);
    } else {
      assert.ok(Math.abs(rear.z) > Math.abs(front.z), section.id);
      assert.ok(lastSeat.x > front.x, section.id);
    }
  }
  for (const section of SECTIONS.filter(section => section.type === 'accessible')) {
    assert.equal(getPosition(section, 1, 1).y, getPosition(section, 1, section.seatsPerRow).y);
  }
});

test('selection bounds and eye height are enforced', () => {
  const section = SECTION_BY_ID.get('L5');
  for (const row of [0, section.rows + 1, 1.5, NaN]) assert.throws(() => getPosition(section, row, 1), RangeError);
  for (const seat of [0, section.seatsPerRow + 1, 1.5, NaN]) assert.throws(() => getPosition(section, 1, seat), RangeError);
  for (const eye of [-0.1, 3.1, NaN, Infinity]) assert.throws(() => getPosition(section, 1, 1, eye), RangeError);
  const base = getPosition(section, 1, 1);
  const standing = getPosition(section, 1, 1, defaultEyeHeight('standing'));
  assert.equal(standing.x, base.x);
  assert.equal(standing.z, base.z);
  assert.ok(Math.abs(standing.y - base.y - 1.68) < 1e-12);
  assert.equal(defaultEyeHeight('seat', 'standing'), 1.68);
  assert.equal(defaultEyeHeight('standing', 'seated'), 1.15);
});

test('precise coordinate imports are atomic, replace old data and add only eye height', t => {
  clearCoordinates();
  t.after(clearCoordinates);
  const section = SECTION_BY_ID.get('L5');
  const first = { sectionId: 'L5', row: 1, seat: 1, x: -42.6, y: 3.25, z: -6.3 };
  assert.equal(importCoordinates({ version: 1, seats: [first] }), 1);
  assert.equal(getImportedCount(), 1);
  assert.deepEqual(getPosition(section, 1, 1, 1.15), { x: -42.6, y: 4.4, z: -6.3, exact: true });
  assert.equal(getPosition(section, 1, 2).exact, false);
  const invalidRecords = [
    { ...first, sectionId: 'NOT-A-SECTION' }, { ...first, row: 0 },
    { ...first, seat: section.seatsPerRow + 1 }, { ...first, x: '42' },
    { ...first, x: Infinity }, { ...first, x: 1001 }, { ...first, y: -11 }, { ...first, y: 201 },
  ];
  for (const record of invalidRecords) {
    assert.throws(() => importCoordinates({ version: 1, seats: [record] }));
    assert.equal(getImportedCount(), 1, 'a rejected file leaves the previous import intact');
    assert.equal(getPosition(section, 1, 1).x, first.x);
  }
  for (const data of [null, {}, { version: 2, seats: [first] }, { version: 1, seats: [] }, { version: 1, seats: [first, first] }]) {
    assert.throws(() => importCoordinates(data));
  }
  assert.equal(importCoordinates({ version: 1, seats: [{ ...first, seat: 2, x: -44 }] }), 1);
  assert.equal(getPosition(section, 1, 1).exact, false, 'new file replaces the previous file');
  assert.equal(getPosition(section, 1, 2).exact, true);
  clearCoordinates();
  assert.equal(getImportedCount(), 0);
  assert.equal(getPosition(section, 1, 2).exact, false);
});
