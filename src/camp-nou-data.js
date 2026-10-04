// Classic Camp Nou, before the current redevelopment. Section names and all
// coordinates below are our estimates; these are not official ticket numbers.
export const CAMP_NOU = {
  id: 'camp-nou', name: 'Camp Nou', nameZh: '诺坎普', pitchWidth: 68,
  pitchLength: 105, units: 'metres', version: 1, defaultSection: 'TR2-04',
  era: 'classic', geometry: 'oval', coordinateNotice: '经典改建前版本 · 分区、排、座位及建筑尺寸估算',
};
export const CAMP_NOU_STANDS = [
  { id: 'tribuna', name: '主看台 · Tribuna', english: 'Tribuna / Grandstand', color: '#9b4051' },
  { id: 'lateral', name: '侧看台 · Lateral', english: 'Lateral', color: '#355b96' },
  { id: 'nord', name: '北球门看台 · Gol Nord', english: 'Gol Nord', color: '#5570a0' },
  { id: 'sud', name: '南球门看台 · Gol Sud', english: 'Gol Sud', color: '#af555d' },
];
export const CAMP_NOU_TIERS = [
  { tier: '1', tierLabel: '第一层 · 估算', rx: 45, rz: 66, exponent: 3.4, rows: 24, rowDepth: .79, rowRise: .46, baseHeight: 2 },
  { tier: '2', tierLabel: '第二层 · 估算', rx: 69, rz: 90, exponent: 2.8, rows: 22, rowDepth: .81, rowRise: .55, baseHeight: 16 },
  { tier: '3', tierLabel: '第三层 · 估算', rx: 90, rz: 112, exponent: 2.4, rows: 27, rowDepth: .79, rowRise: .65, baseHeight: 31 },
];
// A rounded rectangle at pitch level becomes a rounder continuous bowl above.
// Using a normalized polar parameter avoids singular spacing at the axes.
export function campNouPoint(profile, theta, distance = 0, y = 0) {
  const exponent = profile.exponent ?? 2.8;
  const cos = Math.cos(theta), sin = Math.sin(theta);
  const radial = (Math.abs(cos) ** exponent + Math.abs(sin) ** exponent) ** (-1 / exponent);
  return { x: ((profile.rx ?? 45) + distance) * cos * radial, y,
    z: ((profile.rz ?? 66) + distance) * sin * radial };
}
export function campNouRowHeight(section, row, theta) {
  if (section.tier !== '3') return section.baseHeight + (row - 1) * section.rowRise;
  // The classic third tier rises opposite the roofed Tribuna. This affects
  // selectable eye positions as well as the concrete and the exterior rim.
  const lateral = (Math.cos(theta) + 1) / 2;
  return 31 + lateral * 3 + (row - 1) * (.5 + .15 * lateral);
}
function arcLength(profile, start, end, distance = 0) {
  let last = campNouPoint(profile, start, distance), length = 0;
  for (let i = 1; i <= 80; i++) {
    const p = campNouPoint(profile, start + (end - start) * i / 80, distance);
    length += Math.hypot(p.x - last.x, p.z - last.z); last = p;
  }
  return length;
}
// Estimated sectors split each of the four named stands into eight areas.
const arcs = [
  { stand: 'tribuna', prefix: 'TR', start: Math.PI * .75, end: Math.PI * 1.25 },
  { stand: 'lateral', prefix: 'LA', start: -Math.PI * .25, end: Math.PI * .25 },
  { stand: 'nord', prefix: 'GN', start: Math.PI * 1.25, end: Math.PI * 1.75 },
  { stand: 'sud', prefix: 'GS', start: Math.PI * .25, end: Math.PI * .75 },
];
const sections = [];
for (const profile of CAMP_NOU_TIERS) for (const arc of arcs) for (let block = 0; block < 8; block++) {
  const delta = (arc.end - arc.start) / 8, start = arc.start + block * delta + .0048,
    end = arc.start + (block + 1) * delta - .0048;
  const id = `${arc.prefix}${profile.tier}-${String(block + 1).padStart(2, '0')}`;
  sections.push({ ...profile, id, stand: arc.stand, side: arc.stand, geometry: 'oval', type: 'seat',
    start, end, angleStart: start, angleEnd: end, label: `${id} · 估算分区`, estimated: true,
    seatsPerRow: Math.max(20, Math.floor(arcLength(profile, start, end, profile.rows * profile.rowDepth * .46) / .52)),
    frontDistance: profile.rx,
  });
}
for (const [stand, prefix, count, center, rx, rz, baseHeight, label] of [
  ['tribuna', 'TR-BOX', 8, Math.PI, 88.7, 110, 28.3, 'Tribuna 第二层后部包厢'],
  ['lateral', 'LA1-BOX', 4, 0, 66, 87, 12.9, 'Lateral 第一层包厢'],
  ['lateral', 'LA2-BOX', 4, 0, 88.7, 110, 28.3, 'Lateral 第二层包厢'],
  ['nord', 'GN-BOX', 4, Math.PI * 1.5, 88.7, 110, 28.3, 'Gol Nord 第二层包厢'],
  ['sud', 'GS-BOX', 4, Math.PI * .5, 88.7, 110, 28.3, 'Gol Sud 第二层包厢'],
]) for (let i = 0; i < count; i++) {
  const start = center - Math.PI * .13 + i * Math.PI * .26 / count + .003,
    end = center - Math.PI * .13 + (i + 1) * Math.PI * .26 / count - .003;
  sections.push({ id: `${prefix}-${i + 1}`, label: `${label} ${i + 1} · 示意`, stand, side: stand,
    geometry: 'oval', type: 'suite', tier: 'boxes', tierLabel: `${label} · 位置估算`, rows: 2, seatsPerRow: 8,
    start, end, angleStart: start, angleEnd: end, rx, rz, exponent: 2.8,
    rowDepth: .64, rowRise: .1, baseHeight, frontDistance: rx, estimated: true });
}
for (const [stand, theta, prefix] of [['tribuna', Math.PI * .83, 'TR'], ['lateral', -.16, 'LA'], ['nord', Math.PI * 1.58, 'GN'], ['sud', Math.PI * .58, 'GS']]) {
  sections.push({ id: `${prefix}-WC`, label: `${CAMP_NOU_STANDS.find(s => s.id === stand).name} 无障碍平台 · 示意`,
    stand, side: stand, geometry: 'oval', type: 'accessible', tier: 'accessible', tierLabel: '无障碍视点 · 位置估算',
    rows: 1, seatsPerRow: 8, start: theta - .041, end: theta + .041, angleStart: theta - .041, angleEnd: theta + .041,
    rx: 43, rz: 64, exponent: 3.4, rowDepth: 1, rowRise: 0, baseHeight: 1.8, frontDistance: 43, estimated: true });
}
for (const [id, label, start, end] of [['CN-DUG-H', '教练席 A · 主客方向未核实', 3, 15], ['CN-DUG-A', '教练席 B · 主客方向未核实', -15, -3]]) {
  sections.push({ id, label, stand: 'tribuna', side: 'tribuna', geometry: 'oval', layout: 'cartesian', type: 'dugout',
    tier: 'pitchside', tierLabel: '主看台场边 · 位置估算', rows: 2, seatsPerRow: 12, start, end,
    frontDistance: 37.1, rowDepth: .85, rowRise: .18, baseHeight: .06, estimated: true });
}
export const CAMP_NOU_SECTIONS = sections;
export function getCampNouPosition(section, row, seat, eyeHeight = 0) {
  if (!section || !Number.isInteger(row) || row < 1 || row > section.rows ||
    !Number.isInteger(seat) || seat < 1 || seat > section.seatsPerRow || !Number.isFinite(eyeHeight))
    throw new RangeError('诺坎普分区、排号、座号或眼高无效');
  const theta = section.layout === 'cartesian' ? Math.PI : section.angleStart + (section.angleEnd - section.angleStart) * (seat - .5) / section.seatsPerRow;
  const y = campNouRowHeight(section, row, theta) + eyeHeight;
  if (section.layout === 'cartesian') return { x: -section.frontDistance - (row - 1) * section.rowDepth,
    y, z: section.start + (section.end - section.start) * (seat - .5) / section.seatsPerRow, exact: false };
  return { ...campNouPoint(section, theta, (row - 1) * section.rowDepth, y), exact: false };
}
export function validateCampNouData() {
  const ids = new Set(); let seats = 0, minPitchClearance = Infinity, highest = 0;
  for (const section of sections) {
    if (ids.has(section.id)) throw new Error(`重复估算分区：${section.id}`); ids.add(section.id);
    for (let row = 1; row <= section.rows; row++) for (let seat = 1; seat <= section.seatsPerRow; seat++) {
      const p = getCampNouPosition(section, row, seat);
      if (![p.x, p.y, p.z].every(Number.isFinite)) throw new Error(`非有限坐标：${section.id}`);
      const distance = Math.hypot(Math.max(Math.abs(p.x) - CAMP_NOU.pitchWidth / 2, 0), Math.max(Math.abs(p.z) - CAMP_NOU.pitchLength / 2, 0));
      if (distance < 2) throw new Error(`座位进入球场缓冲区：${section.id}`);
      minPitchClearance = Math.min(minPitchClearance, distance); highest = Math.max(highest, p.y); seats++;
    }
  }
  return { sections: ids.size, estimatedSeats: seats, minPitchClearance, highest, continuousBowl: true, officialSeatIds: false };
}
