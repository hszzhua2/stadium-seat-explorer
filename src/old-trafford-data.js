// Existing Old Trafford, not the proposed replacement stadium. Our OT-* IDs,
// row counts and coordinates are schematic, never official ticket block IDs.
export const OLD_TRAFFORD = {
  id: 'old-trafford', name: 'Old Trafford', nameZh: '老特拉福德', pitchWidth: 68,
  pitchLength: 105, units: 'metres', version: 1, defaultSection: 'OT-N2-04',
  geometry: 'old-trafford', era: 'existing', roofState: 'fixed-open-centre',
  coordinateNotice: '现有老特拉福德 · 分区、排、座位、建筑及空间坐标估算',
};
// Keep the shared X-width/Z-length pitch convention: North/South are the long
// sides and East/West the goal ends. Local +Z points towards Stretford/West.
export const OLD_TRAFFORD_STANDS = [
  { id: 'north', name: '北看台 · Sir Alex Ferguson', english: 'Sir Alex Ferguson Stand', color: '#af3447' },
  { id: 'south', name: '南看台 · Sir Bobby Charlton', english: 'Sir Bobby Charlton Stand', color: '#bd655d' },
  { id: 'west', name: '西看台 · Stretford End', english: 'Stretford End', color: '#aa263c' },
  { id: 'east', name: '东看台 · East Stand', english: 'East Stand', color: '#a44d55' },
];
export const OLD_TRAFFORD_LAYOUT = {
  north: { long: true, sign: -1 }, south: { long: true, sign: 1 },
  east: { long: false, sign: -1 }, west: { long: false, sign: 1 },
};
export const OLD_TRAFFORD_TIERS = [
  { stand: 'north', prefix: 'N', tier: '1', tierLabel: '北看台第一层 · 估算', rows: 30, frontDistance: 40.5, baseHeight: 1.8, rowDepth: .76, rowRise: .44, length: 106, blocks: 8 },
  { stand: 'north', prefix: 'N', tier: '2', tierLabel: '北看台第二层 · 估算', rows: 16, frontDistance: 64, baseHeight: 22, rowDepth: .78, rowRise: .54, length: 106, blocks: 8 },
  { stand: 'north', prefix: 'N', tier: '3', tierLabel: '北看台第三层 · 估算', rows: 27, frontDistance: 78, baseHeight: 35, rowDepth: .78, rowRise: .59, length: 106, blocks: 8 },
  { stand: 'south', prefix: 'S', tier: '1', tierLabel: '南看台单层 · 估算', rows: 29, frontDistance: 40.5, baseHeight: 1.8, rowDepth: .76, rowRise: .43, length: 106, blocks: 8 },
  { stand: 'east', prefix: 'E', tier: '1', tierLabel: '东看台第一层 · 估算', rows: 26, frontDistance: 58.5, baseHeight: 1.8, rowDepth: .76, rowRise: .44, length: 70, blocks: 6 },
  { stand: 'east', prefix: 'E', tier: '2', tierLabel: '东看台第二层 · 估算', rows: 24, frontDistance: 78, baseHeight: 21.5, rowDepth: .78, rowRise: .55, length: 70, blocks: 6 },
  { stand: 'west', prefix: 'W', tier: '1', tierLabel: 'Stretford 第一层 · 估算', rows: 26, frontDistance: 58.5, baseHeight: 1.8, rowDepth: .76, rowRise: .44, length: 70, blocks: 6 },
  { stand: 'west', prefix: 'W', tier: '2', tierLabel: 'Stretford 第二层 · Rail seating 示意', rows: 24, frontDistance: 78, baseHeight: 21.5, rowDepth: .78, rowRise: .55, length: 70, blocks: 6, type: 'standing' },
];
const sections = [];
for (const profile of OLD_TRAFFORD_TIERS) for (let block = 0; block < profile.blocks; block++) {
  const span = profile.length / profile.blocks, start = -profile.length / 2 + block * span + .5, end = start + span - 1;
  const id = `OT-${profile.prefix}${profile.tier}-${String(block + 1).padStart(2, '0')}`;
  sections.push({ ...profile, id, label: `${id} · 示意分区`, stand: profile.stand, side: profile.stand,
    geometry: 'old-trafford', type: profile.type ?? 'seat', start, end,
    seatsPerRow: Math.floor((end - start) / .52), estimated: true });
}
export const OLD_TRAFFORD_CORNERS = [
  { corner: 'NW', label: '西北连接角区', stand: 'north', centerX: -35, centerZ: 53, angleStart: Math.PI / 2, angleEnd: Math.PI },
  { corner: 'NE', label: '东北连接角区', stand: 'north', centerX: -35, centerZ: -53, angleStart: Math.PI, angleEnd: Math.PI * 1.5 },
  { corner: 'SW', label: '西南连接角区', stand: 'south', centerX: 35, centerZ: 53, angleStart: 0, angleEnd: Math.PI / 2 },
  { corner: 'SE', label: '东南连接角区', stand: 'south', centerX: 35, centerZ: -53, angleStart: Math.PI * 1.5, angleEnd: Math.PI * 2 },
];
for (const corner of OLD_TRAFFORD_CORNERS) for (const tier of ['1', '2']) for (let block = 0; block < 3; block++) {
  const start = corner.angleStart + block * Math.PI / 6 + .014, end = start + Math.PI / 6 - .028;
  const upper = tier === '2', rx = upper ? 29 : 5.5, rz = upper ? 25 : 5.5, rows = upper ? 17 : 25;
  const id = `OT-${corner.corner}${tier}-${block + 1}`;
  sections.push({ ...corner, id, label: `${corner.label} ${tier}层 · 位置估算`, side: corner.stand,
    geometry: 'old-trafford', layout: 'corner', tier: `corner-${tier}`, tierLabel: `${corner.label}${tier}层 · 估算`,
    type: tier === '1' ? 'standing' : 'seat', rows, seatsPerRow: Math.max(12, Math.floor((rx + (rows - 1) * .76 / 2) * (end - start) / .52)),
    start, end, angleStart: start, angleEnd: end, rx, rz, frontDistance: rx,
    baseHeight: upper ? 21.5 : 1.8, rowDepth: .76, rowRise: upper ? .54 : .44, estimated: true });
}
for (const [stand, prefix, frontDistance, baseHeight, length] of [
  ['north', 'N', 76, 31, 60], ['south', 'S', 63.9, 14.2, 55],
  ['east', 'E', 77, 19, 40], ['west', 'W', 77, 19, 40],
]) for (let i = 0; i < 4; i++) {
  const start = -length / 2 + i * length / 4 + .35, end = start + length / 4 - .7;
  sections.push({ id: `OT-${prefix}-BOX-${i + 1}`, label: `${OLD_TRAFFORD_STANDS.find(s => s.id === stand).name} 包厢 ${i + 1} · 示意`,
    stand, side: stand, geometry: 'old-trafford', type: 'suite', tier: 'boxes', tierLabel: '层间包厢 · 位置估算',
    rows: 2, seatsPerRow: 8, start, end, frontDistance, baseHeight, rowDepth: .65, rowRise: .1, estimated: true });
}
for (const [id, stand, start, end, frontDistance, baseHeight] of [
  ['OT-S-WC', 'south', 22, 36, 62.5, 14.0], ['OT-E-WC', 'east', 12, 25, 59, 1.8], ['OT-W2-WC', 'west', -24, -11, 78, 21.5],
]) sections.push({ id, label: `${OLD_TRAFFORD_STANDS.find(s => s.id === stand).name} 无障碍平台 · 示意`,
  stand, side: stand, geometry: 'old-trafford', type: 'accessible', tier: 'accessible', tierLabel: '无障碍视点 · 估算',
  rows: 1, seatsPerRow: 8, start, end, frontDistance, baseHeight, rowDepth: 1, rowRise: 0, estimated: true });
for (const corner of OLD_TRAFFORD_CORNERS) {
  const upper = corner.stand === 'north', center = (corner.angleStart + corner.angleEnd) / 2;
  sections.push({ ...corner, id: `OT-${corner.corner}-WC`, label: `${corner.label} 无障碍平台 · 示意`, side: corner.stand,
    geometry: 'old-trafford', layout: 'corner', type: 'accessible', tier: 'accessible', tierLabel: '角区无障碍视点 · 估算',
    rows: 1, seatsPerRow: 6, start: center - .12, end: center + .12, angleStart: center - .12, angleEnd: center + .12,
    rx: upper ? 29 : 5.5, rz: upper ? 25 : 5.5, frontDistance: upper ? 29 : 5.5, baseHeight: upper ? 21.5 : 1.8,
    rowDepth: 1, rowRise: 0, estimated: true });
}
for (const [id, start, end] of [['OT-DUG-A', 3, 9.7], ['OT-DUG-B', -9.7, -3]]) {
  sections.push({ id, label: `南侧露天教练席 ${id.endsWith('A') ? 'A' : 'B'} · 主客方向未核实`, mapLabel: id.endsWith('A') ? 'A' : 'B',
    stand: 'south', side: 'south', geometry: 'old-trafford', type: 'dugout', tier: 'pitchside', tierLabel: '2026前/中/后三排6/7/8座 · 位置估算',
    rows: 3, seatsPerRow: 8, rowSeatCounts: [6, 7, 8], start, end, frontDistance: 37.5, baseHeight: -.1, rowDepth: .83, rowRise: .23, estimated: true });
}
export const OLD_TRAFFORD_SECTIONS = sections;
export function oldTraffordRowSeatCount(section, row) { return section.rowSeatCounts?.[row - 1] ?? section.seatsPerRow; }
export function getOldTraffordPosition(section, row, seat, eyeHeight = 0) {
  if (!section || !Number.isInteger(row) || row < 1 || row > section.rows || !Number.isInteger(seat) ||
    seat < 1 || seat > oldTraffordRowSeatCount(section, row) || !Number.isFinite(eyeHeight)) throw new RangeError('老特拉福德分区、排号、座号或眼高无效');
  const count = oldTraffordRowSeatCount(section, row), y = section.baseHeight + (row - 1) * section.rowRise + eyeHeight;
  const along = section.start + (section.end - section.start) * (seat - .5) / count, distance = section.frontDistance + (row - 1) * section.rowDepth;
  if (section.layout === 'corner') return { x: section.centerX + (section.rx + (row - 1) * section.rowDepth) * Math.cos(along),
    y, z: section.centerZ + (section.rz + (row - 1) * section.rowDepth) * Math.sin(along), exact: false };
  const side = OLD_TRAFFORD_LAYOUT[section.side];
  return side.long ? { x: side.sign * distance, y, z: along, exact: false } : { x: along, y, z: side.sign * distance, exact: false };
}
export function validateOldTraffordData() {
  const ids = new Set(); let seats = 0, minPitchClearance = Infinity, highest = 0;
  for (const section of sections) {
    if (ids.has(section.id)) throw new Error(`重复示意分区：${section.id}`); ids.add(section.id);
    for (let row = 1; row <= section.rows; row++) for (let seat = 1; seat <= oldTraffordRowSeatCount(section, row); seat++) {
      const p = getOldTraffordPosition(section, row, seat), d = Math.hypot(Math.max(Math.abs(p.x) - 34, 0), Math.max(Math.abs(p.z) - 52.5, 0));
      if (![p.x, p.y, p.z].every(Number.isFinite) || d < 2) throw new Error(`老特拉福德示意座位进入球场：${section.id}`);
      minPitchClearance = Math.min(minPitchClearance, d); highest = Math.max(highest, p.y); seats++;
    }
  }
  return { sections: ids.size, estimatedSeats: seats, minPitchClearance, highest, officialSeatIds: false, dugoutRows: [6, 7, 8], existingStadium: true };
}
