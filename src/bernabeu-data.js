// Renovated Santiago Bernabéu, with its retractable roof shown open.
// O/E/N/S area IDs and every seat coordinate are illustrative estimates.
export const BERNABEU = {
  id: 'bernabeu', name: 'Santiago Bernabéu', nameZh: '伯纳乌', pitchWidth: 68,
  pitchLength: 105, units: 'metres', version: 1, defaultSection: 'O2-04',
  geometry: 'bernabeu', era: 'renovated', roofState: 'open',
  coordinateNotice: '改造后建筑 · 屋顶开启示意 · 分区、排、座位及尺寸估算',
};
export const BERNABEU_STANDS = [
  { id: 'west', name: '西侧主看台 · Lateral Oeste', english: 'Lateral Oeste', color: '#3a609d' },
  { id: 'east', name: '东侧看台 · Lateral Este', english: 'Lateral Este', color: '#5b7aae' },
  { id: 'north', name: '北球门看台 · Fondo Norte', english: 'Fondo Norte', color: '#3e76a1' },
  { id: 'south', name: '南球门看台 · Fondo Sur', english: 'Fondo Sur', color: '#566d9b' },
];
// Four simplified physical decks carry seven ticket-level reference labels.
// Contiguous labels share an uninterrupted slope; neither rows nor O/E/N/S
// numbers represent an official seating inventory.
export const BERNABEU_DECKS = [
  { deck: 'lower', rx: 43, rz: 64, exponent: 4, rows: 23, rowDepth: .78, rowRise: .47, baseHeight: 2 },
  { deck: 'middle', rx: 65, rz: 86, exponent: 4, rows: 18, rowDepth: .77, rowRise: .56, baseHeight: 18 },
  { deck: 'upper-front', rx: 82, rz: 103, exponent: 3.8, rows: 16, rowDepth: .77, rowRise: .61, baseHeight: 32 },
  { deck: 'upper-back', rx: 96, rz: 117, exponent: 3.4, rows: 18, rowDepth: .77, rowRise: .65, baseHeight: 44 },
];
export const BERNABEU_TIERS = [
  { ...BERNABEU_DECKS[0], tier: '1', tierLabel: 'Grada Baja · 下层前段估算', rows: 13 },
  { ...BERNABEU_DECKS[0], tier: '1A', tierLabel: 'Grada Alta · 下层后段估算', rx: 53.14, rz: 74.14, baseHeight: 8.11, rows: 10, continuous: true },
  { ...BERNABEU_DECKS[1], tier: '2', tierLabel: 'Tribuna · 几何位置估算', rows: 8 },
  { ...BERNABEU_DECKS[1], tier: '2A', tierLabel: '1º Anfiteatro · 位置估算', rx: 71.16, rz: 92.16, baseHeight: 22.48, rows: 10, continuous: true },
  { ...BERNABEU_DECKS[2], tier: '3', tierLabel: '2º Anfiteatro · 位置估算' },
  { ...BERNABEU_DECKS[3], tier: '4', tierLabel: '3º Anfiteatro · 位置估算', rows: 10 },
  { ...BERNABEU_DECKS[3], tier: '4A', tierLabel: '4º Anfiteatro · 位置估算', rx: 103.7, rz: 124.7, baseHeight: 50.5, rows: 8, continuous: true },
];
export function bernabeuPoint(profile, theta, distance = 0, y = 0) {
  const c = Math.cos(theta), s = Math.sin(theta), exponent = profile.exponent ?? 4;
  const r = (Math.abs(c) ** exponent + Math.abs(s) ** exponent) ** (-1 / exponent);
  return { x: (profile.rx + distance) * c * r, y, z: (profile.rz + distance) * s * r };
}
function arcLength(profile, start, end, distance = 0) {
  let previous = bernabeuPoint(profile, start, distance), length = 0;
  for (let i = 1; i <= 64; i++) {
    const next = bernabeuPoint(profile, start + (end - start) * i / 64, distance);
    length += Math.hypot(next.x - previous.x, next.z - previous.z); previous = next;
  }
  return length;
}
const arcs = [
  { stand: 'west', prefix: 'O', start: Math.PI * .75, end: Math.PI * 1.25 },
  { stand: 'east', prefix: 'E', start: -Math.PI * .25, end: Math.PI * .25 },
  { stand: 'north', prefix: 'N', start: Math.PI * 1.25, end: Math.PI * 1.75 },
  { stand: 'south', prefix: 'S', start: Math.PI * .25, end: Math.PI * .75 },
];
const sections = [];
for (const profile of BERNABEU_TIERS) for (const arc of arcs) for (let block = 0; block < 8; block++) {
  const delta = (arc.end - arc.start) / 8, start = arc.start + block * delta + .0045,
    end = arc.start + (block + 1) * delta - .0045;
  const id = `${arc.prefix}${profile.tier}-${String(block + 1).padStart(2, '0')}`;
  sections.push({ ...profile, id, label: `${id} · 示意分区`, stand: arc.stand, side: arc.stand,
    geometry: 'bernabeu', type: 'seat', start, end, angleStart: start, angleEnd: end,
    frontDistance: profile.rx, estimated: true,
    seatsPerRow: Math.max(16, Math.floor(arcLength(profile, start, end, profile.rows * profile.rowDepth * .44) / .53)) });
}
for (const arc of arcs) for (let box = 0; box < 4; box++) {
  const center = (arc.start + arc.end) / 2, start = center - .29 + box * .145 + .004, end = center - .29 + (box + 1) * .145 - .004;
  sections.push({ id: `${arc.prefix}-BOX-${box + 1}`, label: `${BERNABEU_STANDS.find(s => s.id === arc.stand).name} 包厢 ${box + 1} · 示意`,
    stand: arc.stand, side: arc.stand, geometry: 'bernabeu', type: 'suite', tier: 'boxes', tierLabel: '中层后部包厢 · 位置估算',
    rows: 2, seatsPerRow: 8, start, end, angleStart: start, angleEnd: end,
    rx: 79.8, rz: 100.8, exponent: 4, rowDepth: .63, rowRise: .1, baseHeight: 28.4, frontDistance: 79.8, estimated: true });
}
for (const arc of arcs) {
  const center = (arc.start + arc.end) / 2 + .19;
  sections.push({ id: `${arc.prefix}-WC`, label: `${BERNABEU_STANDS.find(s => s.id === arc.stand).name} 无障碍位 · 示意`,
    stand: arc.stand, side: arc.stand, geometry: 'bernabeu', type: 'accessible', tier: 'accessible', tierLabel: '无障碍平台 · 位置估算',
    rows: 1, seatsPerRow: 8, start: center - .034, end: center + .034, angleStart: center - .034, angleEnd: center + .034,
    rx: 41.6, rz: 62.6, exponent: 4, rowDepth: 1, rowRise: 0, baseHeight: 1.8, frontDistance: 41.6, estimated: true });
}
for (const [id, label, start, end] of [['SB-DUG-A', '东侧教练席 A · 主客方向未核实', 3, 15], ['SB-DUG-B', '东侧教练席 B · 主客方向未核实', -15, -3]]) {
  sections.push({ id, label, mapLabel: id.endsWith('A') ? 'A' : 'B', stand: 'east', side: 'east', geometry: 'bernabeu', layout: 'cartesian', type: 'dugout',
    tier: 'pitchside', tierLabel: '东侧场边 · 位置估算', rows: 2, seatsPerRow: 12, start, end,
    frontDistance: 37.2, rowDepth: .84, rowRise: .18, baseHeight: .06, estimated: true });
}
export const BERNABEU_SECTIONS = sections;
export function getBernabeuPosition(section, row, seat, eyeHeight = 0) {
  if (!section || !Number.isInteger(row) || row < 1 || row > section.rows || !Number.isInteger(seat) ||
    seat < 1 || seat > section.seatsPerRow || !Number.isFinite(eyeHeight)) throw new RangeError('伯纳乌分区、排号、座号或眼高无效');
  const y = section.baseHeight + (row - 1) * section.rowRise + eyeHeight;
  if (section.layout === 'cartesian') return { x: section.frontDistance + (row - 1) * section.rowDepth, y,
    z: section.start + (section.end - section.start) * (seat - .5) / section.seatsPerRow, exact: false };
  const theta = section.angleStart + (section.angleEnd - section.angleStart) * (seat - .5) / section.seatsPerRow;
  return { ...bernabeuPoint(section, theta, (row - 1) * section.rowDepth, y), exact: false };
}
export function validateBernabeuData() {
  const ids = new Set(); let seats = 0, minPitchClearance = Infinity, highest = 0;
  for (const section of sections) {
    if (ids.has(section.id)) throw new Error(`重复示意分区：${section.id}`); ids.add(section.id);
    for (let row = 1; row <= section.rows; row++) for (let seat = 1; seat <= section.seatsPerRow; seat++) {
      const p = getBernabeuPosition(section, row, seat);
      if (![p.x, p.y, p.z].every(Number.isFinite)) throw new Error(`非有限坐标：${section.id}`);
      const d = Math.hypot(Math.max(Math.abs(p.x) - 34, 0), Math.max(Math.abs(p.z) - 52.5, 0));
      if (d < 2) throw new Error(`示意位置进入球场缓冲区：${section.id}`);
      minPitchClearance = Math.min(minPitchClearance, d); highest = Math.max(highest, p.y); seats++;
    }
  }
  return { sections: ids.size, estimatedSeats: seats, minPitchClearance, highest, officialSeatIds: false, roofState: 'open' };
}
