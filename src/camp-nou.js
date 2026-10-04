import * as THREE from 'three';
import { CAMP_NOU, CAMP_NOU_TIERS, campNouPoint, campNouRowHeight } from './camp-nou-data.js';

const TAU = Math.PI * 2;
const inwardYaw = p => Math.atan2(-p.x, -p.z);
function appendQuad(vertices, a, b, c, d) { vertices.push(...a, ...b, ...d, ...b, ...c, ...d); }
function geometryFrom(vertices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2));
  geometry.computeVertexNormals(); return geometry;
}
const array = p => [p.x, p.y, p.z];

// All curved treads and the seats use the same footprint and angle-dependent
// third-tier elevations. There is no independent four-rectangle seating model.
function treadGeometry(sections) {
  const vertices = [];
  for (const section of sections) for (let row = 1; row <= section.rows; row++) {
    const distance = (row - 1) * section.rowDepth, rise = Math.max(section.rowRise, .46);
    const slices = Math.max(3, Math.ceil((section.angleEnd - section.angleStart) * 35));
    for (let slice = 0; slice < slices; slice++) {
      const a = section.angleStart + (section.angleEnd - section.angleStart) * slice / slices;
      const b = section.angleStart + (section.angleEnd - section.angleStart) * (slice + 1) / slices;
      const ya = campNouRowHeight(section, row, a) - .025, yb = campNouRowHeight(section, row, b) - .025;
      const p1 = array(campNouPoint(section, a, distance - .36, ya));
      const p2 = array(campNouPoint(section, b, distance - .36, yb));
      const p3 = array(campNouPoint(section, b, distance + section.rowDepth - .36, yb));
      const p4 = array(campNouPoint(section, a, distance + section.rowDepth - .36, ya));
      appendQuad(vertices, p1, p2, p3, p4);
      appendQuad(vertices, [p1[0], ya - rise, p1[2]], [p2[0], yb - rise, p2[2]], p2, p1);
      appendQuad(vertices, p4, [p4[0], ya - rise, p4[2]], [p3[0], yb - rise, p3[2]], p3);
    }
  }
  return geometryFrom(vertices);
}
function ring(group, profile, inner, outer, y1, y2, mat, name, slices = 180, start = 0, end = TAU) {
  const vertices = [];
  for (let i = 0; i < slices; i++) {
    const a = start + (end - start) * i / slices, b = start + (end - start) * (i + 1) / slices;
    const ya1 = typeof y1 === 'function' ? y1(a) : y1, ya2 = typeof y2 === 'function' ? y2(a) : y2;
    const yb1 = typeof y1 === 'function' ? y1(b) : y1, yb2 = typeof y2 === 'function' ? y2(b) : y2;
    appendQuad(vertices, array(campNouPoint(profile, a, inner, ya1)), array(campNouPoint(profile, a, outer, ya2)),
      array(campNouPoint(profile, b, outer, yb2)), array(campNouPoint(profile, b, inner, yb1)));
  }
  const mesh = new THREE.Mesh(geometryFrom(vertices), mat); mesh.name = name; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function wall(group, profile, distance, low, high, mat, name, start = 0, end = TAU, slices = 160) {
  const vertices = [];
  for (let i = 0; i < slices; i++) {
    const a = start + (end - start) * i / slices, b = start + (end - start) * (i + 1) / slices;
    const yl = theta => typeof low === 'function' ? low(theta) : low;
    const yh = theta => typeof high === 'function' ? high(theta) : high;
    appendQuad(vertices, array(campNouPoint(profile, a, distance, yl(a))), array(campNouPoint(profile, b, distance, yl(b))),
      array(campNouPoint(profile, b, distance, yh(b))), array(campNouPoint(profile, a, distance, yh(a))));
  }
  const mesh = new THREE.Mesh(geometryFrom(vertices), mat); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}

function buildSuites(viewer, group, helpers) {
  const { beam, material } = helpers, mats = viewer.mats;
  const cap = material('#737779', { side: THREE.DoubleSide });
  for (const section of viewer.sections.filter(s => s.type === 'suite')) {
    const start = section.angleStart, end = section.angleEnd, rear = (section.rows - 1) * section.rowDepth + .68;
    const suite = new THREE.Group(); suite.name = `${section.id}: estimated glazed box`;
    group.add(suite);
    // A curved box follows the actual row footprint. Rectangular chord-aligned
    // boxes protruded into adjoining rows at their ends and buried viewpoints.
    ring(suite, section, -.6, rear, section.baseHeight + 2.08, section.baseHeight + 2.08, cap, `${section.id}: box ceiling`, 16, start, end);
    ring(suite, section, -.6, rear, section.baseHeight - .14, section.baseHeight - .14, cap, `${section.id}: box floor`, 16, start, end);
    wall(suite, section, -.6, section.baseHeight + .15, section.baseHeight + 1.95, mats.glass, `${section.id}: front glazing`, start, end, 16);
    wall(suite, section, rear, section.baseHeight + .05, section.baseHeight + 1.7, mats.concreteDark, `${section.id}: rear wall`, start, end, 16);
    for (const angle of [start, end]) {
      const a = campNouPoint(section, angle, -.6, section.baseHeight + .1), b = campNouPoint(section, angle, rear, section.baseHeight + .1);
      const vertices = [];
      appendQuad(vertices, array(a), array(b), [b.x, b.y + 1.85, b.z], [a.x, a.y + 1.85, a.z]);
      const pane = new THREE.Mesh(geometryFrom(vertices), mats.glass); suite.add(pane);
    }
    const span = end - start, count = Math.max(2, Math.ceil(span * section.rx / 2.4));
    for (let i = 0; i <= count; i++) {
      const p = campNouPoint(section, start + span * i / count, -.62, section.baseHeight + .13);
      beam(suite, array(p), [p.x, p.y + 1.82, p.z], .022, mats.rail);
    }
    suite.userData.estimated = true;
  }
}
function buildDugouts(viewer, group, helpers) {
  const { box, beam, surfaceLabel } = helpers, mats = viewer.mats;
  for (const section of viewer.sections.filter(s => s.type === 'dugout')) {
    const p = viewer.position(section, 1, Math.ceil(section.seatsPerRow / 2));
    const width = section.end - section.start + .5, x = p.x - .8, z = (section.start + section.end) / 2;
    box(group, [2.8, .035, width], [x, 2.31, z], mats.glass, [0, 0, -.06]);
    box(group, [.025, 1.95, width], [x - 1.4, 1.18, z], mats.glass);
    for (const edge of [z - width / 2, z + width / 2]) {
      box(group, [2.8, 1.95, .035], [x, 1.18, edge], mats.glass);
      beam(group, [x - 1.4, .1, edge], [x - 1.4, 2.3, edge], .036, mats.rail);
      beam(group, [x - 1.4, 2.3, edge], [x + 1.4, 2.2, edge], .032, mats.rail);
    }
    const nameplate = surfaceLabel(group, 'FC BARCELONA', width, .25, [x + 1.42, 2.2, z], [0, Math.PI / 2, 0], { background: '#154079', color: '#edca45' });
    nameplate.material.side = THREE.FrontSide;
    box(group, [2.1, .025, width + 2], [p.x + 1.7, .043, z], mats.track);
  }
  box(group, [6.6, 1.75, 2.8], [-42.5, .55, 0], mats.concreteDark);
  helpers.surfaceLabel(group, 'FC BARCELONA', 2.5, .48, [-39.16, 1.35, 0], [0, Math.PI / 2, 0], { background: '#163b72', color: '#e3bc36' });
}
function buildAdvertising(viewer, group, helpers) {
  const { surfaceLabel } = helpers;
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const z = -45.5 + i * 13;
    if (side === -1 && Math.abs(z) < 19) continue;
    surfaceLabel(group, i % 2 ? 'FC BARCELONA' : 'MÉS QUE UN CLUB', 12.55, .65, [side * 35.6, .55, z], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { background: i % 2 ? '#143b75' : '#96273e', color: '#eddb85' });
  }
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) surfaceLabel(group, 'FC BARCELONA', 13.2, .65,
    [-28 + i * 14, .55, side * 55], [0, side > 0 ? Math.PI : 0, 0], { background: '#16396e', color: '#edd078' });
}

function buildExterior(viewer, group, helpers) {
  const { box, beam, material, surfaceLabel } = helpers, mats = viewer.mats;
  const roofMeshes = [], roofMaterials = [], landmarks = [];
  const concrete = material('#c1bcb0', { side: THREE.DoubleSide });
  const shadowConcrete = material('#9b9b93', { side: THREE.DoubleSide });
  const terrace = material('#a9aaa5', { side: THREE.DoubleSide });
  const outer = CAMP_NOU_TIERS[2], distance = (outer.rows - 1) * outer.rowDepth + 2.4;
  const top = theta => campNouRowHeight(outer, outer.rows, theta) + .5;
  // Exposed concrete, open concourses and repeated radial ribs distinguish the
  // classic building from the future fully roofed, glazed redevelopment.
  for (const profile of CAMP_NOU_TIERS) {
    const rear = (profile.rows - 1) * profile.rowDepth + .52;
    const frontLow = theta => campNouRowHeight(profile, 1, theta) - .9;
    const backLow = theta => campNouRowHeight(profile, profile.rows, theta) - .9;
    ring(group, profile, -.34, rear, frontLow, backLow, concrete, `Tier ${profile.tier}: continuous sloping underside`);
    ring(group, profile, rear, rear + 2.1, backLow, backLow, terrace, `Tier ${profile.tier}: exterior concourse`);
    wall(group, profile, rear + 2.1, theta => backLow(theta) - .9, backLow, concrete, `Tier ${profile.tier}: outer fascia`);
    wall(group, profile, -.42, theta => frontLow(theta) + .1, theta => frontLow(theta) + .74, concrete, `Tier ${profile.tier}: front fascia`);
    // Low continuous tier-front guard, placed below seated eye level.
    for (let i = 0; i < 144; i++) {
      const a = i * TAU / 144, b = (i + 1) * TAU / 144;
      const p1 = campNouPoint(profile, a, -.53, campNouRowHeight(profile, 1, a) + .34);
      const p2 = campNouPoint(profile, b, -.53, campNouRowHeight(profile, 1, b) + .34);
      beam(group, array(p1), array(p2), .027, mats.rail, 5);
    }
  }
  // The back of each block remains outside the selectable bowl; no solid slab
  // is allowed to occupy the seats or the field-facing central opening.
  wall(group, outer, distance, 0, 7.2, shadowConcrete, 'Classic outer ground-storey wall');
  for (const y of [8, 16, 25, 34]) {
    const h = theta => Math.min(y, top(theta) - 3.3);
    ring(group, outer, distance -.2, distance + 2.6, h, h, concrete, `Classic open gallery at ${y} m`);
    wall(group, outer, distance + 2.6, theta => h(theta) - .85, h, concrete, `Classic horizontal gallery fascia ${y}`);
  }
  const columnGeometry = new THREE.BoxGeometry(1, 1, 1), columns = new THREE.InstancedMesh(columnGeometry, concrete, 96);
  const object = new THREE.Object3D();
  for (let i = 0; i < 96; i++) {
    const theta = i * TAU / 96, p = campNouPoint(outer, theta, distance + .85), height = top(theta);
    object.position.set(p.x, height / 2, p.z); object.rotation.set(0, inwardYaw(p), 0); object.scale.set(1.05, height, 2.8); object.updateMatrix(); columns.setMatrixAt(i, object.matrix);
    if (i % 2 === 0) {
      const a = campNouPoint(outer, theta, distance - 3.5, 4), b = campNouPoint(outer, theta, distance + .8, height - 1.4);
      beam(group, array(a), array(b), .26, concrete, 6);
    }
  }
  columns.name = '96 classic exposed concrete exterior ribs'; columns.castShadow = true; columns.receiveShadow = true; columns.computeBoundingSphere(); group.add(columns);
  wall(group, outer, distance + .6, theta => top(theta) - 1.2, top, concrete, 'Classic asymmetric upper rim');

  const roofMat = material('#d3d4cf', { metalness: .2, roughness: .67, side: THREE.DoubleSide });
  const roofHeight = theta => campNouRowHeight(outer, outer.rows, theta) + 4.4;
  const roof = ring(group, outer, -28, distance + 1.5, roofHeight, theta => roofHeight(theta) + 2.6, roofMat,
    'Tribuna only: classic cantilever roof', 70, Math.PI * .75, Math.PI * 1.25);
  roof.userData.overviewRoof = true; roof.castShadow = true; roofMeshes.push(roof); roofMaterials.push(roofMat);
  for (let i = 0; i <= 22; i++) {
    const theta = Math.PI * .75 + Math.PI * .5 * i / 22;
    const a = campNouPoint(outer, theta, -28, roofHeight(theta) - .1), b = campNouPoint(outer, theta, distance + 1.5, roofHeight(theta) + 2.5);
    beam(group, array(a), array(b), .16, mats.roofEdge, 6);
    beam(group, [b.x, b.y - 2.7, b.z], array(a), .09, mats.roofEdge, 6);
  }
  // White luminaires follow the uncovered rim; their luminous appearance is
  // switched by the shared day/night API instead of adding dozens of lights.
  const lamp = material('#e9e7d8', { emissive: '#fff2d9', emissiveIntensity: .28 });
  for (let i = 0; i < 56; i++) {
    const theta = i * TAU / 56;
    if (theta > Math.PI * .75 && theta < Math.PI * 1.25) continue;
    const p = campNouPoint(outer, theta, distance - .4, top(theta) + 1.1);
    const mesh = box(group, [1.75, .62, .35], array(p), lamp, [0, inwardYaw(p), -.12]); mesh.userData.floodlight = true;
    beam(group, [p.x, p.y - 1.2, p.z], [p.x, p.y, p.z], .07, mats.rail);
  }
  // Screens are above the bowl, behind every seat rather than between an eye
  // position and the field.
  for (const theta of [Math.PI * .5, Math.PI * 1.5]) {
    const p = campNouPoint(outer, theta, distance + .9, top(theta) + 2.7);
    const screen = new THREE.Group(); screen.position.set(p.x, p.y, p.z); screen.rotation.y = inwardYaw(p); group.add(screen);
    box(screen, [14, 5, .4], [0, 0, 0], mats.black);
    surfaceLabel(screen, 'CAMP NOU · FC BARCELONA', 13.5, 4.5, [0, 0, .23], [0, 0, 0], { width: 1024, height: 360, background: '#0c1930', color: '#f2d06e' });
  }
  // Context is schematic pavement and low vegetation, never real 3D tiles.
  box(group, [1600, .08, 1600], [0, -.25, 0], material('#77816b'));
  ring(group, outer, distance + 3, distance + 24, .015, .015, material('#b8b6ae', { side: THREE.DoubleSide }), 'Schematic campus circulation apron');
  box(group, [16, .03, 380], [146, .04, 0], material('#5d6365'));
  for (const [id, label, theta] of [['tribuna-entry', 'Tribuna 入口 · 示意', Math.PI], ['lateral-entry', 'Lateral 入口 · 示意', 0], ['nord-entry', 'Gol Nord 入口 · 示意', Math.PI * 1.5], ['sud-entry', 'Gol Sud 入口 · 示意', Math.PI * .5]]) {
    const p = campNouPoint(outer, theta, distance + 5.2), entry = new THREE.Group();
    entry.name = label; entry.position.set(p.x, .05, p.z); entry.rotation.y = inwardYaw(p) + Math.PI; group.add(entry);
    const blue = material('#183b75'), iron = mats.black;
    for (const x of [-4.6, 4.6]) box(entry, [.65, 3.65, .85], [x, 1.83, 0], concrete);
    box(entry, [9.9, .75, .85], [0, 3.5, 0], blue);
    surfaceLabel(entry, label.split(' ·')[0].toUpperCase(), 8.7, .52, [0, 3.52, .45], [0, 0, 0], { background: '#183b75', color: '#efcf63' });
    for (let lane = -3; lane <= 3; lane += 2) {
      for (let level = .42; level < 2; level += .38) {
        beam(entry, [lane -.58, level, .15], [lane + .58, level, .15], .021, mats.rail, 5);
        beam(entry, [lane, level, -.45], [lane, level, .72], .021, mats.rail, 5);
      }
      beam(entry, [lane, .1, .1], [lane, 2.15, .1], .075, mats.rail);
      box(entry, [.35, .5, .2], [lane + .7, 1.05, .8], blue);
    }
    for (const direction of [-1, 1]) {
      box(entry, [12, .35, .45], [direction * 10.65, .2, 0], concrete);
      beam(entry, [direction * 4.7, 1.55, 0], [direction * 16.6, 1.55, 0], .035, iron);
      for (let x = 4.8; x < 16.6; x += .38) beam(entry, [direction * x, .4, 0], [direction * x, 1.6, 0], .018, iron, 5);
      for (let z = 1; z <= 4.6; z += 1.3) beam(entry, [direction * 3.65, .08, z], [direction * 3.65, 1.05, z], .027, mats.rail);
      beam(entry, [direction * 3.65, 1.05, 1], [direction * 3.65, 1.05, 4.6], .025, mats.rail);
    }
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    landmarks.push({ id, label, sitePosition: [p.x, .05, p.z], target: [p.x, 1.8, p.z], position: [p.x + out.x * 15, 4.6, p.z + out.z * 15] });
  }
  return { roofMeshes, roofMaterials, landmarks, outerProfile: outer, outerDistance: distance };
}

export function buildCampNou(viewer, group, helpers) {
  const { material, chairGeometry, seatLetterCanvas, random, box } = helpers;
  const campHelpers = { ...helpers, surfaceLabel(...args) {
    const sign = helpers.surfaceLabel(...args);
    sign.material.side = THREE.FrontSide; // Back sides cannot display mirrored lettering.
    return sign;
  } };
  group.name = 'Classic Camp Nou: continuous estimated three-tier bowl';
  const regular = viewer.sections.filter(s => s.type === 'seat'), records = [], crowd = [];
  const image = seatLetterCanvas('MÉS QUE UN CLUB'), mask = image.data;
  const matrices = new THREE.Object3D(); let letterSeats = 0;
  for (const tier of ['1', '2', '3']) {
    const treads = new THREE.Mesh(treadGeometry(regular.filter(s => s.tier === tier)), viewer.mats.concrete);
    treads.name = `Camp Nou tier ${tier}: stepped continuous bowl`; treads.receiveShadow = true; treads.castShadow = true; group.add(treads);
  }
  for (const section of viewer.sections) for (let row = 1; row <= section.rows; row++) for (let seat = 1; seat <= section.seatsPerRow; seat++) {
    const p = viewer.position(section, row, seat), n = records.length;
    if (section.type === 'accessible' && seat % 2 === 1) {
      box(group, [.85, .035, 1.18], [p.x, p.y, p.z], material('#366da3'), [0, inwardYaw(p), 0]); continue;
    }
    // Empty-ground photographs in FC Barcelona's 2014 hospitality catalogue:
    // red first/third tiers, blue second tier with permanent yellow lettering.
    let color = new THREE.Color(section.tier === '2' ? '#124887' : '#a52f43').multiplyScalar(.87 + random(n) * .23);
    if (section.type === 'dugout') color.set('#183d70');
    if (section.type === 'suite') color.set('#a13d50');
    if (section.stand === 'lateral' && section.tier === '2') {
      // Looking from the pitch towards +X, screen-right is +Z. Rear/high rows
      // are the top of the glyph, hence V decreases as the row number grows.
      const u = Math.floor((p.z / 125 + .5) * 800), v = 239 - Math.floor((row - 4) / 16 * 240);
      if (u >= 0 && u < 800 && v >= 0 && v < 240 && mask[(v * 800 + u) * 4] > 128) { color.set('#ecca35'); letterSeats++; }
    }
    const rotation = inwardYaw(p); records.push({ position: p, rotation, color, sectionId: section.id, row, seat });
    if (random(n + 179) > .14 && !['dugout', 'suite', 'accessible'].includes(section.type)) crowd.push({ position: p, rotation, seed: n, standing: false });
  }
  const chairs = new THREE.InstancedMesh(chairGeometry(), viewer.mats.red, records.length);
  records.forEach((record, i) => {
    matrices.position.set(record.position.x, record.position.y, record.position.z); matrices.rotation.set(0, record.rotation, 0); matrices.scale.set(1, 1, 1); matrices.updateMatrix();
    chairs.setMatrixAt(i, matrices.matrix); chairs.setColorAt(i, record.color);
  });
  chairs.name = 'Camp Nou estimated selectable red, blue and yellow seats'; chairs.receiveShadow = true; chairs.computeBoundingSphere(); group.add(chairs);
  viewer.buildCrowd(group, crowd); buildSuites(viewer, group, campHelpers); buildDugouts(viewer, group, campHelpers); buildAdvertising(viewer, group, campHelpers);
  const exterior = buildExterior(viewer, group, campHelpers);
  viewer.roofMeshes = exterior.roofMeshes; viewer.roofMaterials = exterior.roofMaterials; viewer.exteriorLandmarks = exterior.landmarks;
  viewer.campNouGeometry = { chairRecords: records, letterSeats, exterior, maskMapping: { screenRight: '+Z', textTop: 'rear/high rows', text: 'MÉS QUE UN CLUB' } };
  return viewer.campNouGeometry;
}

export function validateCampNouGeometry(viewer) {
  const data = viewer.campNouGeometry;
  if (!data) throw new Error('诺坎普几何尚未构建');
  let maxYawError = 0, roofBlocked = 0;
  for (const record of data.chairRecords) {
    const forward = new THREE.Vector3(Math.sin(record.rotation), 0, Math.cos(record.rotation));
    const inward = new THREE.Vector3(-record.position.x, 0, -record.position.z).normalize();
    maxYawError = Math.max(maxYawError, Math.abs(1 - forward.dot(inward)));
  }
  viewer.procedural?.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(), target = new THREE.Vector3(0, .7, 0);
  for (const section of viewer.sections) for (const row of [1, Math.ceil(section.rows / 2), section.rows]) {
    for (const seat of [1, Math.ceil(section.seatsPerRow / 2), section.seatsPerRow]) {
      const p = viewer.position(section, row, seat), eye = new THREE.Vector3(p.x, p.y + 1.15, p.z), direction = target.clone().sub(eye);
      ray.set(eye, direction.clone().normalize()); ray.far = direction.length();
      if (ray.intersectObjects(data.exterior.roofMeshes, false).length) roofBlocked++;
    }
  }
  return { chairs: data.chairRecords.length, maxYawError, roofBlocked, letterSeats: data.letterSeats, lettering: data.maskMapping,
    asymmetricTop: [campNouRowHeight(CAMP_NOU_TIERS[2], 27, Math.PI), campNouRowHeight(CAMP_NOU_TIERS[2], 27, 0)],
    pitch: [CAMP_NOU.pitchWidth, CAMP_NOU.pitchLength] };
}
