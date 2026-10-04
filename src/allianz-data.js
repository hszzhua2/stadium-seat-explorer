// Allianz Arena match configuration. Section IDs and individual positions are
// illustrative estimates, not official ticket blocks or booking inventory.
export const ALLIANZ = {
  id: 'allianz-arena', name: 'Allianz Arena', nameZh: '安联球场', pitchWidth: 68,
  pitchLength: 105, units: 'metres', version: 1, defaultSection: 'AW2-04',
  geometry: 'allianz', roofState: 'fixed-open-centre',
  coordinateNotice: '足球比赛模式 · 固定屋顶中央开口 · 分区、排、座位及坐标估算',
};
export const ALLIANZ_STANDS = [
  { id: 'west', name: '西侧看台 · West', english: 'West Stand', color: '#af384a' },
  { id: 'east', name: '东侧看台 · East', english: 'East Stand', color: '#c45a63' },
  { id: 'north', name: '北侧看台 · Nord', english: 'North Stand', color: '#a84253' },
  { id: 'south', name: '南侧看台 · Süd', english: 'South Stand', color: '#c23643' },
];
// Approximate 24°/30°/34° lower/middle/upper gradients follow the official
// arena facts; row counts and physical row starts remain explicitly estimated.
export const ALLIANZ_TIERS = [
  // Pitch-level corners stay close to a rounded rectangle. A rounder ellipse
  // cut into the corner runoff and made rear-row rays cross the front treads.
  { tier: '1', tierLabel: '下层 · 约24°坡度 · 估算', rx: 43, rz: 62, exponent: 9.3, rows: 23, rowDepth: .79, rowRise: .352, baseHeight: 1.4 },
  { tier: '2', tierLabel: '中层 · 约30°坡度 · 估算', rx: 62.2, rz: 81, exponent: 4, rows: 20, rowDepth: .78, rowRise: .45, baseHeight: 13.2 },
  { tier: '3', tierLabel: '上层 · 约34°坡度 · 估算', rx: 80.3, rz: 99.1, exponent: 3.4, rows: 26, rowDepth: .76, rowRise: .513, baseHeight: 26.8 },
];
export function allianzPoint(profile, theta, distance = 0, y = 0) {
  const c = Math.cos(theta), s = Math.sin(theta), e = profile.exponent ?? 4;
  const radius = (Math.abs(c) ** e + Math.abs(s) ** e) ** (-1 / e);
  return { x: (profile.rx + distance) * c * radius, y, z: (profile.rz + distance) * s * radius };
}
function arcLength(profile, start, end, distance) {
  let previous = allianzPoint(profile, start, distance), length = 0;
  for (let i = 1; i <= 64; i++) {
    const p = allianzPoint(profile, start + (end - start) * i / 64, distance);
    length += Math.hypot(p.x - previous.x, p.z - previous.z); previous = p;
  }
  return length;
}
const arcs = [
  { stand: 'west', prefix: 'AW', start: Math.PI * .75, end: Math.PI * 1.25 },
  { stand: 'east', prefix: 'AE', start: -Math.PI * .25, end: Math.PI * .25 },
  { stand: 'north', prefix: 'AN', start: Math.PI * 1.25, end: Math.PI * 1.75 },
  { stand: 'south', prefix: 'AS', start: Math.PI * .25, end: Math.PI * .75 },
];
const sections = [];
for (const profile of ALLIANZ_TIERS) for (const arc of arcs) for (let block = 0; block < 8; block++) {
  const delta = (arc.end - arc.start) / 8, start = arc.start + delta * block + .0048, end = arc.start + delta * (block + 1) - .0048;
  const id = `${arc.prefix}${profile.tier}-${String(block + 1).padStart(2, '0')}`;
  // Official examples locate South standing centrally and across its wings,
  // while North standing sits in two side patches, not its central seated area.
  // These conservative schematic boundaries are not current ticket block IDs.
  const standing = profile.tier === '1' && ((arc.stand === 'south' && block >= 1 && block <= 6) || (arc.stand === 'north' && [1, 6].includes(block)));
  sections.push({ ...profile, id, label: `${id} · ${standing ? '示意站区' : '示意分区'}`, stand: arc.stand, side: arc.stand,
    geometry: 'allianz', type: standing ? 'standing' : 'seat', rail: standing, start, end, angleStart: start, angleEnd: end, frontDistance: profile.rx,
    seatsPerRow: Math.max(16, Math.floor(arcLength(profile, start, end, profile.rows * profile.rowDepth * .45) / .52)), estimated: true });
}
for (const arc of arcs) for (let index = 0; index < 4; index++) {
  const center = (arc.start + arc.end) / 2, start = center - .3 + index * .15 + .004, end = center - .3 + (index + 1) * .15 - .004;
  sections.push({ id: `${arc.prefix}-BOX-${index + 1}`, label: `${ALLIANZ_STANDS.find(s => s.id === arc.stand).name} 包厢 ${index + 1} · 示意`,
    stand: arc.stand, side: arc.stand, geometry: 'allianz', type: 'suite', tier: 'boxes', tierLabel: '层间包厢 · 位置估算',
    rows: 2, seatsPerRow: 8, start, end, angleStart: start, angleEnd: end,
    rx: 78.7, rz: 97.5, exponent: 4, rowDepth: .64, rowRise: .1, baseHeight: 22.6, frontDistance: 78.7, estimated: true });
}
for (const arc of arcs.filter(arc => arc.stand !== 'south')) {
  const center = (arc.start + arc.end) / 2 + .23;
  sections.push({ id: `${arc.prefix}-WC`, label: `${ALLIANZ_STANDS.find(s => s.id === arc.stand).name} 无障碍平台 · 示意`,
    stand: arc.stand, side: arc.stand, geometry: 'allianz', type: 'accessible', tier: 'accessible', tierLabel: '无障碍视点 · 位置估算',
    rows: 1, seatsPerRow: 8, start: center - .037, end: center + .037, angleStart: center - .037, angleEnd: center + .037,
    rx: 61.1, rz: 80.1, exponent: 4.4, rowDepth: 1, rowRise: 0, baseHeight: 9.5, frontDistance: 61.1, estimated: true });
}
for (const [id, label, start, end] of [['AA-DUG-A', '教练席 A · 主客方向未核实', 3, 15], ['AA-DUG-B', '教练席 B · 主客方向未核实', -15, -3]]) {
  sections.push({ id, label, mapLabel: id.endsWith('A') ? 'A' : 'B', stand: 'west', side: 'west', geometry: 'allianz', layout: 'cartesian',
    type: 'dugout', tier: 'pitchside', tierLabel: '场边 · 位置估算', rows: 2, seatsPerRow: 12, start, end,
    frontDistance: 37.2, rowDepth: .84, rowRise: .18, baseHeight: .06, estimated: true });
}
export const ALLIANZ_SECTIONS = sections;
export function getAllianzPosition(section, row, seat, eyeHeight = 0) {
  if (!section || !Number.isInteger(row) || row < 1 || row > section.rows || !Number.isInteger(seat) ||
    seat < 1 || seat > section.seatsPerRow || !Number.isFinite(eyeHeight)) throw new RangeError('安联分区、排号、座号或眼高无效');
  const y = section.baseHeight + (row - 1) * section.rowRise + eyeHeight;
  if (section.layout === 'cartesian') return { x: -section.frontDistance - (row - 1) * section.rowDepth, y,
    z: section.start + (section.end - section.start) * (seat - .5) / section.seatsPerRow, exact: false };
  const theta = section.angleStart + (section.angleEnd - section.angleStart) * (seat - .5) / section.seatsPerRow;
  return { ...allianzPoint(section, theta, (row - 1) * section.rowDepth, y), exact: false };
}
export function validateAllianzData() {
  const ids = new Set(); let seats = 0, minPitchClearance = Infinity, highest = 0;
  for (const section of sections) {
    if (ids.has(section.id)) throw new Error(`重复示意分区：${section.id}`); ids.add(section.id);
    for (let row = 1; row <= section.rows; row++) for (let seat = 1; seat <= section.seatsPerRow; seat++) {
      const p = getAllianzPosition(section, row, seat);
      if (![p.x, p.y, p.z].every(Number.isFinite)) throw new Error(`非有限坐标：${section.id}`);
      const d = Math.hypot(Math.max(Math.abs(p.x) - 34, 0), Math.max(Math.abs(p.z) - 52.5, 0));
      if (d < 2) throw new Error(`示意座位进入球场缓冲区：${section.id}`);
      minPitchClearance = Math.min(minPitchClearance, d); highest = Math.max(highest, p.y); seats++;
    }
  }
  return { sections: ids.size, estimatedSeats: seats, minPitchClearance, highest, officialSeatIds: false, fixedRoof: true };
}
