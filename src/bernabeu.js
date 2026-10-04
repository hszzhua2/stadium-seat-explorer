import * as THREE from 'three';
import { BERNABEU_DECKS, bernabeuPoint } from './bernabeu-data.js';

const TAU = Math.PI * 2;
const yawIn = p => Math.atan2(-p.x, -p.z);
const arr = p => [p.x, p.y, p.z];
function quad(vertices, a, b, c, d) { vertices.push(...a, ...b, ...d, ...b, ...c, ...d); }
function geometry(vertices) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2));
  result.computeVertexNormals(); return result;
}
function mesh(group, vertices, material, name) {
  const result = new THREE.Mesh(geometry(vertices), material); result.name = name;
  result.receiveShadow = true; group.add(result); return result;
}
function ring(group, profile, inner, outer, y1, y2, material, name, start = 0, end = TAU, slices = 192) {
  const vertices = [];
  for (let i = 0; i < slices; i++) {
    const a = start + (end - start) * i / slices, b = start + (end - start) * (i + 1) / slices;
    quad(vertices, arr(bernabeuPoint(profile, a, inner, y1)), arr(bernabeuPoint(profile, b, inner, y1)),
      arr(bernabeuPoint(profile, b, outer, y2)), arr(bernabeuPoint(profile, a, outer, y2)));
  }
  return mesh(group, vertices, material, name);
}
function wall(group, profile, distance, low, high, material, name, start = 0, end = TAU, slices = 192) {
  const vertices = [];
  for (let i = 0; i < slices; i++) {
    const a = start + (end - start) * i / slices, b = start + (end - start) * (i + 1) / slices;
    quad(vertices, arr(bernabeuPoint(profile, a, distance, low)), arr(bernabeuPoint(profile, b, distance, low)),
      arr(bernabeuPoint(profile, b, distance, high)), arr(bernabeuPoint(profile, a, distance, high)));
  }
  return mesh(group, vertices, material, name);
}
function steps(group, sections, material) {
  const vertices = [];
  for (const section of sections) for (let row = 1; row <= section.rows; row++) {
    const d = (row - 1) * section.rowDepth, y = section.baseHeight + (row - 1) * section.rowRise - .024;
    for (let i = 0; i < 7; i++) {
      const a = section.angleStart + (section.angleEnd - section.angleStart) * i / 7;
      const b = section.angleStart + (section.angleEnd - section.angleStart) * (i + 1) / 7;
      const p1 = arr(bernabeuPoint(section, a, d - .35, y)), p2 = arr(bernabeuPoint(section, b, d - .35, y));
      const p3 = arr(bernabeuPoint(section, b, d + section.rowDepth - .35, y)), p4 = arr(bernabeuPoint(section, a, d + section.rowDepth - .35, y));
      quad(vertices, p1, p2, p3, p4);
      quad(vertices, [p1[0], y - section.rowRise, p1[2]], [p2[0], y - section.rowRise, p2[2]], p2, p1);
    }
  }
  const result = mesh(group, vertices, material, 'Bernabeu stepped rounded rectangular bowl'); result.castShadow = true; return result;
}
function addBoxes(viewer, group, helpers) {
  const cap = helpers.material('#a7afb6', { side: THREE.DoubleSide }), mats = viewer.mats;
  for (const section of viewer.sections.filter(s => s.type === 'suite')) {
    const rear = (section.rows - 1) * section.rowDepth + .6, start = section.angleStart, end = section.angleEnd;
    const box = new THREE.Group(); box.name = `${section.id}: curved estimated hospitality box`; group.add(box);
    ring(box, section, -.52, rear, section.baseHeight + 2.16, section.baseHeight + 2.16, cap, `${section.id}: ceiling`, start, end, 16);
    ring(box, section, -.52, rear, section.baseHeight - .14, section.baseHeight - .14, cap, `${section.id}: floor`, start, end, 16);
    wall(box, section, -.52, section.baseHeight + .15, section.baseHeight + 2, mats.glass, `${section.id}: glazing`, start, end, 16);
    wall(box, section, rear, section.baseHeight + .1, section.baseHeight + 1.8, cap, `${section.id}: rear wall`, start, end, 16);
    for (const a of [start, end]) {
      const p = bernabeuPoint(section, a, -.52, section.baseHeight + .15), q = bernabeuPoint(section, a, rear, section.baseHeight + .15), vertices = [];
      quad(vertices, arr(p), arr(q), [q.x, q.y + 1.9, q.z], [p.x, p.y + 1.9, p.z]); mesh(box, vertices, mats.glass, 'Box side glass');
    }
    for (let i = 0; i <= 5; i++) {
      const p = bernabeuPoint(section, start + (end - start) * i / 5, -.54, section.baseHeight + .13);
      helpers.beam(box, arr(p), [p.x, p.y + 1.9, p.z], .021, mats.rail, 5);
    }
  }
}
function addDugouts(viewer, group, helpers) {
  const { box, beam, surfaceLabel } = helpers, mats = viewer.mats;
  for (const section of viewer.sections.filter(s => s.type === 'dugout')) {
    const z = (section.start + section.end) / 2, width = section.end - section.start + .6, x = section.frontDistance + .8;
    box(group, [2.8, .04, width], [x, 2.32, z], mats.glass);
    box(group, [.035, 2, width], [x + 1.4, 1.2, z], mats.glass);
    for (const edge of [z - width / 2, z + width / 2]) {
      box(group, [2.8, 2, .035], [x, 1.2, edge], mats.glass);
      beam(group, [x + 1.4, .1, edge], [x + 1.4, 2.35, edge], .035, mats.rail);
      beam(group, [x + 1.4, 2.35, edge], [x - 1.4, 2.35, edge], .026, mats.rail);
    }
    surfaceLabel(group, 'REAL MADRID', width, .25, [x - 1.43, 2.25, z], [0, -Math.PI / 2, 0], { background: '#f5f6f2', color: '#214474' });
  }
  box(group, [6, 1.7, 2.6], [41.7, .58, 0], mats.concreteDark);
}
function addPitchBoards(group, helpers) {
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const z = -45.5 + i * 13; if (side === 1 && Math.abs(z) < 19) continue;
    helpers.surfaceLabel(group, 'REAL MADRID', 12.5, .65, [side * 35.7, .56, z], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { background: '#edf1f3', color: '#244a7d' });
  }
  for (const sign of [-1, 1]) for (let i = 0; i < 5; i++) helpers.surfaceLabel(group, 'SANTIAGO BERNABÉU', 13.1, .65,
    [-28 + i * 14, .56, sign * 55.1], [0, sign > 0 ? Math.PI : 0, 0], { background: '#284c80', color: '#f0f2f5' });
}

function addRoofAndExterior(viewer, group, helpers) {
  const { material, box, beam, surfaceLabel } = helpers, mats = viewer.mats;
  const concrete = material('#aab1b7', { side: THREE.DoubleSide });
  const steel = material('#bbc6cf', { metalness: .76, roughness: .42, side: THREE.DoubleSide });
  const darkSteel = material('#5c6976', { metalness: .7, roughness: .53, side: THREE.DoubleSide });
  const roofs = [], roofMaterials = [], landmarks = [];
  for (const deck of BERNABEU_DECKS) {
    const rear = (deck.rows - 1) * deck.rowDepth + .5, top = deck.baseHeight + (deck.rows - 1) * deck.rowRise;
    ring(group, deck, -.35, rear, deck.baseHeight - .82, top - .82, concrete, `${deck.deck}: sloping deck underside`);
    ring(group, deck, rear, rear + 1.8, top - .82, top - .82, concrete, `${deck.deck}: rear circulation floor`);
    wall(group, deck, -.4, deck.baseHeight - .6, deck.baseHeight - .12, concrete, `${deck.deck}: front fascia`);
    wall(group, deck, rear + 1.8, top - 1.8, top - .75, concrete, `${deck.deck}: rear fascia`);
    for (let i = 0; i < 144; i++) {
      const a = bernabeuPoint(deck, i * TAU / 144, -.45, deck.baseHeight + .3), b = bernabeuPoint(deck, (i + 1) * TAU / 144, -.45, deck.baseHeight + .3);
      beam(group, arr(a), arr(b), .024, mats.rail, 5);
    }
  }
  const enclosure = { rx: 117, rz: 142, exponent: 3.6 };
  wall(group, enclosure, -4, 0, 7.2, darkSteel, 'Ground storey behind silver facade');
  // gmp describes continuous stainless-steel louvers. Each band has an outer
  // face and a real projecting underside, with open gaps rather than a flat
  // grey wall or a copied concrete Camp Nou exterior.
  const skin = [];
  for (let band = 0; band < 66; band++) {
    const y = 7.6 + band * .83, h = .59, bulge = .2 + 3.1 * Math.sin((y - 7.5) / 55 * Math.PI);
    for (let i = 0; i < 192; i++) {
      const a = i * TAU / 192, b = (i + 1) * TAU / 192;
      const pa = bernabeuPoint(enclosure, a, bulge, y), pb = bernabeuPoint(enclosure, b, bulge, y);
      const qa = bernabeuPoint(enclosure, a, bulge + .35, y + h), qb = bernabeuPoint(enclosure, b, bulge + .35, y + h);
      quad(skin, arr(pa), arr(pb), arr(qb), arr(qa));
      const ia = bernabeuPoint(enclosure, a, bulge - .38, y), ib = bernabeuPoint(enclosure, b, bulge - .38, y);
      quad(skin, arr(pa), arr(ia), arr(ib), arr(pb));
    }
  }
  const shell = mesh(group, skin, steel, 'Continuous projecting silver stainless-steel facade louvers');
  shell.castShadow = true; shell.receiveShadow = false;
  // An opaque backing prevents louver gaps from revealing high-frequency
  // seats, treads and shadow patterns in exterior aerial views. Its convex
  // footprint lies outside every seat and stops above the entrance portals.
  const lining = wall(group, enclosure, -1, 7.3, 64,
    material('#78858f', { metalness: .42, roughness: .82, side: THREE.DoubleSide }),
    'Uniform opaque silver lining behind facade louvers');
  lining.receiveShadow = false; lining.castShadow = true;
  const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material('#a8b1ba', { metalness: .52, roughness: .6 }), 96), transform = new THREE.Object3D();
  for (let i = 0; i < 96; i++) {
    const p = bernabeuPoint(enclosure, i * TAU / 96, -4.1);
    transform.position.set(p.x, 30, p.z); transform.rotation.set(0, yawIn(p), 0); transform.scale.set(.7, 60, 1.1); transform.updateMatrix(); ribs.setMatrixAt(i, transform.matrix);
  }
  ribs.name = 'Exterior columns wholly outside the seating footprint'; ribs.computeBoundingSphere(); group.add(ribs);

  // Four fixed roof sides surround a rounded rectangular opening. The centre
  // retractable panels are absent in this explicitly open-roof representation.
  const opening = { rx: 40.5, rz: 62.1, exponent: 5 };
  for (let side = 0; side < 4; side++) {
    const vertices = [], start = Math.PI * .25 + side * Math.PI * .5;
    for (let i = 0; i < 56; i++) {
      const a = start + i * Math.PI * .5 / 56, b = start + (i + 1) * Math.PI * .5 / 56;
      quad(vertices, arr(bernabeuPoint(opening, a, 0, 63.8)), arr(bernabeuPoint(opening, b, 0, 63.8)),
        arr(bernabeuPoint(enclosure, b, .3, 64.9)), arr(bernabeuPoint(enclosure, a, .3, 64.9)));
    }
    const mat = material('#bac4ce', { roughness: .55, metalness: .65, side: THREE.DoubleSide });
    const roof = mesh(group, vertices, mat, `Renovated fixed roof side ${side + 1}`);
    roof.userData.overviewRoof = true; roof.castShadow = true; roof.receiveShadow = false;
    roofs.push(roof); roofMaterials.push(mat);
  }
  for (let i = 0; i < 48; i++) {
    const theta = i * TAU / 48, a = bernabeuPoint(opening, theta, 0, 62.9), b = bernabeuPoint(enclosure, theta, -1, 63.9);
    beam(group, arr(a), arr(b), .18, darkSteel, 6);
    beam(group, [a.x, a.y - 1.8, a.z], arr(b), .1, darkSteel, 6);
  }
  // Continuous suspended screen below the roof, not a low obstruction between
  // an eye position and the pitch. Official side/goal heights are 6.5/11 m;
  // installation elevation and contour below are estimated. Faces incline 8°.
  const screenProfile = { rx: 43.5, rz: 65.4, exponent: 5 }, screenMat = new THREE.MeshStandardMaterial({ color: '#0b1630', emissive: '#284572', emissiveIntensity: .46, roughness: .6, side: THREE.DoubleSide });
  const screenVertices = [];
  for (let i = 0; i < 192; i++) {
    const a = i * TAU / 192, b = (i + 1) * TAU / 192, mid = (a + b) / 2;
    const end = Math.abs(Math.sin(mid)) > .78, height = end ? 11 : 6.5, low = 63.5 - height;
    const shift = height * Math.tan(8 * Math.PI / 180);
    quad(screenVertices, arr(bernabeuPoint(screenProfile, a, -shift, low)), arr(bernabeuPoint(screenProfile, b, -shift, low)),
      arr(bernabeuPoint(screenProfile, b, 0, 63.5)), arr(bernabeuPoint(screenProfile, a, 0, 63.5)));
  }
  const screen = mesh(group, screenVertices, screenMat, '360 degree suspended inclined video ribbon');
  for (const [x, z, yaw, width] of [[42.3, 0, -Math.PI / 2, 68], [-42.3, 0, Math.PI / 2, 68], [0, -63.8, 0, 52], [0, 63.8, Math.PI, 52]]) {
    surfaceLabel(group, 'REAL MADRID · SANTIAGO BERNABÉU', width, 3.2, [x, 59, z], [0, yaw, 0], { width: 1536, height: 128, background: '#10254a', color: '#f2f5fa', emissive: '#9cc0ff' });
  }
  // Ten rear-facing panels are described in the official screen announcement.
  // Their cadence, content and mounting coordinates are schematic here.
  for (let i = 0; i < 10; i++) {
    const p = bernabeuPoint(screenProfile, i * TAU / 10 + .16, 1.8, 59.7);
    surfaceLabel(group, 'REAL MADRID', 10.5, 2.6, arr(p), [0, yawIn(p) + Math.PI, 0], { width: 768, height: 192,
      background: '#14376a', color: '#f0f3f9', emissive: '#9cc0ff' });
  }
  const lamps = material('#f7f8fa', { emissive: '#eef4ff', emissiveIntensity: .28 });
  for (let i = 0; i < 40; i++) {
    const p = bernabeuPoint(screenProfile, i * TAU / 40, 3, 63);
    const light = box(group, [1.45, .45, .55], arr(p), lamps, [0, yawIn(p), 0]); light.userData.floodlight = true;
  }
  // Approximate campus circulation and four framed entrances; no invented
  // official gate numbers or historic monuments are assigned.
  box(group, [1600, .08, 1600], [0, -.25, 0], material('#7f8679'));
  ring(group, enclosure, 1, 23, .025, .025, material('#b6b9bb', { side: THREE.DoubleSide }), 'Schematic urban circulation apron');
  box(group, [18, .04, 400], [-145, .07, 0], material('#616972'));
  for (const [id, label, theta] of [['west-entry', '西侧入口 · 示意', Math.PI], ['east-entry', '东侧入口 · 示意', 0], ['north-entry', '北侧入口 · 示意', Math.PI * 1.5], ['south-entry', '南侧入口 · 示意', Math.PI * .5]]) {
    const p = bernabeuPoint(enclosure, theta, 7), entry = new THREE.Group(); entry.position.set(p.x, .03, p.z); entry.rotation.y = yawIn(p) + Math.PI; entry.name = label; group.add(entry);
    for (const x of [-5.2, 5.2]) box(entry, [.65, 4.1, 1], [x, 2.05, 0], steel);
    box(entry, [11.1, .85, 1.05], [0, 3.8, 0], darkSteel);
    surfaceLabel(entry, 'SANTIAGO BERNABÉU', 9.8, .5, [0, 3.8, .54], [0, 0, 0], { background: '#465262', color: '#f1f4f7' });
    for (const x of [-3.4, -1.1, 1.1, 3.4]) {
      beam(entry, [x, .1, 0], [x, 2.2, 0], .072, mats.rail);
      for (let y = .5; y < 2; y += .37) { beam(entry, [x -.63, y, 0], [x + .63, y, 0], .023, mats.rail, 5); beam(entry, [x, y, -.6], [x, y, .6], .023, mats.rail, 5); }
    }
    for (const sign of [-1, 1]) {
      beam(entry, [sign * 5.3, 1.45, 0], [sign * 16.3, 1.45, 0], .035, mats.rail);
      for (let x = 5.35; x < 16.3; x += .43) beam(entry, [sign * x, .1, 0], [sign * x, 1.5, 0], .022, mats.rail, 5);
      beam(entry, [sign * 4.5, 1, 1], [sign * 4.5, 1, 5.1], .035, mats.rail);
      for (let z = 1; z < 5.1; z += 1.2) beam(entry, [sign * 4.5, .1, z], [sign * 4.5, 1, z], .028, mats.rail, 5);
    }
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    landmarks.push({ id, label, sitePosition: [p.x, .03, p.z], target: [p.x, 1.9, p.z], position: [p.x + out.x * 16, 5.1, p.z + out.z * 16] });
  }
  return { roofMeshes: roofs, roofMaterials, landmarks, screen };
}

export function buildBernabeu(viewer, group, originalHelpers) {
  const helpers = { ...originalHelpers, surfaceLabel(...args) { const sign = originalHelpers.surfaceLabel(...args); sign.material.side = THREE.FrontSide; return sign; } };
  const { box, material, chairGeometry, seatLetterCanvas, random } = helpers;
  group.name = 'Renovated Bernabeu estimated stadium with silver louver shell and open roof';
  viewer.mats.glass.forceSinglePass = true;
  steps(group, viewer.sections.filter(s => s.type === 'seat'), viewer.mats.concrete);
  const records = [], crowd = [], letters = seatLetterCanvas('REAL MADRID C.F.'), object = new THREE.Object3D(); let letterSeats = 0;
  for (const section of viewer.sections) for (let row = 1; row <= section.rows; row++) for (let seat = 1; seat <= section.seatsPerRow; seat++) {
    const p = viewer.position(section, row, seat), seed = records.length;
    if (section.type === 'accessible' && seat % 2 === 1) { box(group, [.8, .035, 1.15], [p.x, p.y, p.z], material('#6483a9'), [0, yawIn(p), 0]); continue; }
    let color = new THREE.Color(section.type === 'dugout' ? '#354b6a' : '#245393').multiplyScalar(.86 + random(seed) * .25);
    if (section.stand === 'west' && section.deck === 'lower' && section.type === 'seat') {
      // From the pitch looking west (-X), screen-right is -Z.
      const u = Math.floor((-p.z / 110 + .5) * 800), v = 239 - Math.floor((p.y - 4) / 7.5 * 240);
      if (u >= 0 && u < 800 && v >= 0 && v < 240 && letters.data[(v * 800 + u) * 4] > 128) { color.set('#e8edf3'); letterSeats++; }
    }
    const rotation = yawIn(p); records.push({ position: p, rotation, color, sectionId: section.id, row, seat });
    if (random(seed + 125) > .14 && !['suite', 'dugout', 'accessible'].includes(section.type)) crowd.push({ position: p, rotation, seed, standing: false });
  }
  const chairs = new THREE.InstancedMesh(chairGeometry(), viewer.mats.red, records.length);
  records.forEach((record, i) => {
    object.position.set(record.position.x, record.position.y, record.position.z); object.rotation.set(0, record.rotation, 0); object.scale.set(1, 1, 1); object.updateMatrix();
    chairs.setMatrixAt(i, object.matrix); chairs.setColorAt(i, record.color);
  });
  chairs.name = 'Selectable blue Bernabeu seats and upright REAL MADRID lettering'; chairs.receiveShadow = true; chairs.computeBoundingSphere(); group.add(chairs);
  viewer.buildCrowd(group, crowd); addBoxes(viewer, group, helpers); addDugouts(viewer, group, helpers); addPitchBoards(group, helpers);
  const exterior = addRoofAndExterior(viewer, group, helpers);
  viewer.roofMeshes = exterior.roofMeshes; viewer.roofMaterials = exterior.roofMaterials; viewer.exteriorLandmarks = exterior.landmarks;
  viewer.bernabeuGeometry = { chairRecords: records, letterSeats, exterior, lettering: { text: 'REAL MADRID C.F.', screenRight: '-Z', textTop: 'rear/high rows', estimatedLocation: 'west lower deck' } };
  return viewer.bernabeuGeometry;
}
export function validateBernabeuGeometry(viewer) {
  const data = viewer.bernabeuGeometry; if (!data) throw new Error('伯纳乌几何尚未构建');
  viewer.procedural?.updateMatrixWorld(true);
  let maxYawError = 0, roofBlocked = 0, screenBlocked = 0, rays = 0;
  for (const record of data.chairRecords) {
    const forward = new THREE.Vector3(Math.sin(record.rotation), 0, Math.cos(record.rotation));
    maxYawError = Math.max(maxYawError, Math.abs(1 - forward.dot(new THREE.Vector3(-record.position.x, 0, -record.position.z).normalize())));
  }
  const ray = new THREE.Raycaster(), target = new THREE.Vector3(0, .7, 0);
  for (const section of viewer.sections) for (const row of new Set([1, Math.ceil(section.rows / 2), section.rows])) for (const seat of new Set([1, Math.ceil(section.seatsPerRow / 2), section.seatsPerRow])) {
    const p = viewer.position(section, row, seat), eye = new THREE.Vector3(p.x, p.y + 1.15, p.z), direction = target.clone().sub(eye);
    ray.set(eye, direction.clone().normalize()); ray.far = direction.length(); ray.near = .04; rays++;
    if (ray.intersectObjects(data.exterior.roofMeshes, false).length) roofBlocked++;
    if (ray.intersectObject(data.exterior.screen, false).length) screenBlocked++;
  }
  return { chairs: data.chairRecords.length, maxYawError, roofBlocked, screenBlocked, rays, letterSeats: data.letterSeats, lettering: data.lettering };
}
