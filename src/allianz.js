import * as THREE from 'three';
import { ALLIANZ_TIERS, allianzPoint } from './allianz-data.js';

const TAU = Math.PI * 2;
const arr = p => [p.x, p.y, p.z];
const yawIn = p => Math.atan2(-p.x, -p.z);
function quad(vertices, a, b, c, d) { vertices.push(...a, ...b, ...d, ...b, ...c, ...d); }
function geometry(vertices) {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2));
  result.computeVertexNormals(); return result;
}
function mesh(group, vertices, material, name) {
  const result = new THREE.Mesh(geometry(vertices), material); result.name = name; result.receiveShadow = true; group.add(result); return result;
}
function ring(group, profile, inner, outer, y1, y2, material, name, start = 0, end = TAU, slices = 192) {
  const vertices = [];
  for (let i = 0; i < slices; i++) {
    const a = start + (end - start) * i / slices, b = start + (end - start) * (i + 1) / slices;
    quad(vertices, arr(allianzPoint(profile, a, inner, y1)), arr(allianzPoint(profile, b, inner, y1)),
      arr(allianzPoint(profile, b, outer, y2)), arr(allianzPoint(profile, a, outer, y2)));
  }
  return mesh(group, vertices, material, name);
}
function wall(group, profile, distance, low, high, material, name, start = 0, end = TAU, slices = 192) {
  const vertices = [];
  for (let i = 0; i < slices; i++) {
    const a = start + (end - start) * i / slices, b = start + (end - start) * (i + 1) / slices;
    quad(vertices, arr(allianzPoint(profile, a, distance, low)), arr(allianzPoint(profile, b, distance, low)),
      arr(allianzPoint(profile, b, distance, high)), arr(allianzPoint(profile, a, distance, high)));
  }
  return mesh(group, vertices, material, name);
}
function addTreads(viewer, group) {
  const vertices = [];
  for (const section of viewer.sections.filter(s => ['seat', 'standing'].includes(s.type))) for (let row = 1; row <= section.rows; row++) {
    const d = (row - 1) * section.rowDepth, y = section.baseHeight + (row - 1) * section.rowRise - .025;
    for (let i = 0; i < 7; i++) {
      const a = section.angleStart + (section.angleEnd - section.angleStart) * i / 7;
      const b = section.angleStart + (section.angleEnd - section.angleStart) * (i + 1) / 7;
      const p1 = arr(allianzPoint(section, a, d - .35, y)), p2 = arr(allianzPoint(section, b, d - .35, y));
      const p3 = arr(allianzPoint(section, b, d + section.rowDepth - .35, y)), p4 = arr(allianzPoint(section, a, d + section.rowDepth - .35, y));
      quad(vertices, p1, p2, p3, p4);
      quad(vertices, [p1[0], y - section.rowRise, p1[2]], [p2[0], y - section.rowRise, p2[2]], p2, p1);
    }
  }
  const treads = mesh(group, vertices, viewer.mats.concrete, 'Allianz three-tier stepped bowl'); treads.castShadow = true;
}
function addBoxes(viewer, group, helpers) {
  const cap = helpers.material('#adb4bd', { side: THREE.DoubleSide });
  for (const s of viewer.sections.filter(s => s.type === 'suite')) {
    const rear = (s.rows - 1) * s.rowDepth + .6, box = new THREE.Group(); box.name = `${s.id}: estimated curved glazed box`; group.add(box);
    ring(box, s, -.5, rear, s.baseHeight + 2.14, s.baseHeight + 2.14, cap, `${s.id}: ceiling`, s.angleStart, s.angleEnd, 16);
    ring(box, s, -.5, rear, s.baseHeight - .14, s.baseHeight - .14, cap, `${s.id}: floor`, s.angleStart, s.angleEnd, 16);
    wall(box, s, -.5, s.baseHeight + .15, s.baseHeight + 1.98, viewer.mats.glass, `${s.id}: front glazing`, s.angleStart, s.angleEnd, 16);
    wall(box, s, rear, s.baseHeight + .1, s.baseHeight + 1.78, cap, `${s.id}: rear wall`, s.angleStart, s.angleEnd, 16);
    for (const angle of [s.angleStart, s.angleEnd]) {
      const a = allianzPoint(s, angle, -.5, s.baseHeight + .15), b = allianzPoint(s, angle, rear, s.baseHeight + .15), vertices = [];
      quad(vertices, arr(a), arr(b), [b.x, b.y + 1.85, b.z], [a.x, a.y + 1.85, a.z]); mesh(box, vertices, viewer.mats.glass, 'Box side glass');
    }
    for (let i = 0; i <= 5; i++) {
      const p = allianzPoint(s, s.angleStart + (s.angleEnd - s.angleStart) * i / 5, -.52, s.baseHeight + .13);
      helpers.beam(box, arr(p), [p.x, p.y + 1.84, p.z], .021, viewer.mats.rail, 5);
    }
  }
}
function addStandingRails(viewer, group, helpers) {
  for (const s of viewer.sections.filter(s => s.type === 'standing')) for (let row = 1; row <= s.rows; row++) {
    const y = s.baseHeight + (row - 1) * s.rowRise, d = (row - 1) * s.rowDepth - .34;
    for (let segment = 0; segment < 7; segment++) {
      const a = allianzPoint(s, s.angleStart + (s.angleEnd - s.angleStart) * segment / 7, d, y + .93);
      const b = allianzPoint(s, s.angleStart + (s.angleEnd - s.angleStart) * (segment + 1) / 7, d, y + .93);
      helpers.beam(group, arr(a), arr(b), .024, viewer.mats.rail, 5);
      if (segment % 2 === 0) helpers.beam(group, [a.x, y, a.z], arr(a), .019, viewer.mats.rail, 5);
    }
  }
}
function addDugouts(viewer, group, helpers) {
  const { box, beam, surfaceLabel } = helpers, mats = viewer.mats;
  for (const s of viewer.sections.filter(s => s.type === 'dugout')) {
    const sign = s.side === 'east' ? 1 : -1, x = sign * (s.frontDistance + .8), z = (s.start + s.end) / 2, width = s.end - s.start + .6;
    box(group, [2.8, .04, width], [x, 2.35, z], mats.glass);
    box(group, [.035, 2, width], [x + sign * 1.4, 1.2, z], mats.glass);
    for (const edge of [z - width / 2, z + width / 2]) {
      box(group, [2.8, 2, .035], [x, 1.2, edge], mats.glass);
      beam(group, [x + sign * 1.4, .1, edge], [x + sign * 1.4, 2.35, edge], .035, mats.rail);
      beam(group, [x + sign * 1.4, 2.35, edge], [x - sign * 1.4, 2.35, edge], .03, mats.rail);
    }
    surfaceLabel(group, 'FC BAYERN MÜNCHEN', width, .25, [x - sign * 1.43, 2.27, z], [0, -sign * Math.PI / 2, 0], { background: '#b41932', color: '#fff' });
  }
  const side = viewer.sections.find(s => s.type === 'dugout')?.side === 'east' ? 1 : -1;
  box(group, [6.2, 1.6, 2.8], [side * 41.6, .5, 0], mats.concreteDark);
}
function addBoards(viewer, group, helpers) {
  const dugSide = viewer.sections.find(s => s.type === 'dugout')?.side === 'east' ? 1 : -1;
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const z = -45.5 + i * 13; if (side === dugSide && Math.abs(z) < 19) continue;
    helpers.surfaceLabel(group, 'FC BAYERN MÜNCHEN', 12.5, .65, [side * 35.7, .56, z], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { background: '#bb1633', color: '#f6f1ee' });
  }
  for (const sign of [-1, 1]) for (let i = 0; i < 5; i++) helpers.surfaceLabel(group, 'ALLIANZ ARENA', 13.1, .65,
    [-28 + i * 14, .56, sign * 55.1], [0, sign > 0 ? Math.PI : 0, 0], { background: '#f0f2f4', color: '#285789' });
}

// Build many smooth inflated diamond patches into one indexed buffer per
// material. Vertices share normals within a cushion, never across its joints.
function cushions(group, surface, columns, rows, materials, name, bulge, direction = 'radial') {
  const batches = materials.map(() => ({ positions: [], indices: [] }));
  const slices = 4;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const batch = batches[(column + row * 2) % batches.length], base = batch.positions.length / 3;
    for (let v = 0; v <= slices; v++) for (let u = 0; u <= slices; u++) {
      const a = u / slices * 2 - 1, b = v / slices * 2 - 1;
      const theta = (column + (row % 2) * .5) * TAU / columns + (a + b) / 2 * TAU / columns * .489;
      const t = THREE.MathUtils.clamp((row + .5) / rows + (b - a) / 2 / rows * .98, 0, 1);
      const p = surface(theta, t), inflation = bulge * (1 - a * a) * (1 - b * b);
      if (direction === 'radial') { const normal = new THREE.Vector3(p.x, 0, p.z).normalize(); p.x += normal.x * inflation; p.z += normal.z * inflation; }
      else p.y += inflation;
      batch.positions.push(p.x, p.y, p.z);
    }
    for (let v = 0; v < slices; v++) for (let u = 0; u < slices; u++) {
      const a = base + v * (slices + 1) + u, b = a + 1, c = a + slices + 2, d = c - 1;
      batch.indices.push(a, d, b, b, d, c);
    }
  }
  return batches.map((batch, index) => {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(batch.positions.length / 3 * 2), 2)); geo.setIndex(batch.indices); geo.computeVertexNormals();
    const result = new THREE.Mesh(geo, materials[index]); result.name = `${name} batch ${index + 1}`;
    result.receiveShadow = false; result.castShadow = true; group.add(result); return result;
  });
}
function addShell(viewer, group, helpers) {
  const { material, box, beam, surfaceLabel } = helpers, concrete = material('#aeb4b6', { side: THREE.DoubleSide });
  const roofMeshes = [], roofMaterials = [], landmarks = [], lightingMaterials = [];
  for (const tier of ALLIANZ_TIERS) {
    const rear = (tier.rows - 1) * tier.rowDepth + .5, y = tier.baseHeight + (tier.rows - 1) * tier.rowRise;
    ring(group, tier, -.35, rear, tier.baseHeight - .8, y - .8, concrete, `Allianz tier ${tier.tier}: sloping underside`);
    ring(group, tier, rear, rear + 1.65, y - .8, y - .8, concrete, `Allianz tier ${tier.tier}: concourse floor`);
    wall(group, tier, -.4, tier.baseHeight - .5, tier.baseHeight - .08, concrete, `Allianz tier ${tier.tier}: front fascia`);
    for (let i = 0; i < 144; i++) {
      const a = allianzPoint(tier, i * TAU / 144, -.45, tier.baseHeight + .28), b = allianzPoint(tier, (i + 1) * TAU / 144, -.45, tier.baseHeight + .28);
      beam(group, arr(a), arr(b), .024, viewer.mats.rail, 5);
    }
  }
  // Rounded capsule membrane, maximum dimensions approximately 227 x 258 m.
  const shellSurface = (theta, t) => {
    const curve = Math.sin(Math.PI * t), p = allianzPoint({ rx: 103 + 10.1 * curve, rz: 118 + 10.6 * curve, exponent: 3.15 }, theta);
    p.y = 3 + 49 * t; return p;
  };
  const skinMaterials = ['#c6cfd4', '#c0c9ce', '#ccd4d8'].map(color => {
    const mat = material(color, { roughness: .67, metalness: .12, side: THREE.DoubleSide, emissive: '#b80d21', emissiveIntensity: 0 });
    lightingMaterials.push({ material: mat, dayColor: color, nightColor: '#e31c33', nightEmissive: '#e90824', intensity: 1.15 }); return mat;
  });
  const shellMeshes = cushions(group, shellSurface, 96, 19, skinMaterials, 'Inflated ETFE diamond facade', .32);
  // Opaque backing keeps small cushion joints from exposing high-frequency
  // interior geometry. It follows the entire bulging capsule, not a flat wall.
  const backVertices = [];
  for (let r = 0; r < 24; r++) for (let c = 0; c < 192; c++) {
    const a = c * TAU / 192, b = (c + 1) * TAU / 192, t1 = r / 24, t2 = (r + 1) / 24;
    const point = (theta, t) => { const p = shellSurface(theta, t), n = new THREE.Vector3(p.x, 0, p.z).normalize(); p.x -= n.x * .25; p.z -= n.z * .25; return arr(p); };
    quad(backVertices, point(a, t1), point(b, t1), point(b, t2), point(a, t2));
  }
  const backingMaterial = material('#929ea5', { roughness: .85, side: THREE.DoubleSide });
  lightingMaterials.push({ material: backingMaterial, dayColor: '#929ea5', nightColor: '#7e1121', nightEmissive: '#a90920', intensity: .48 });
  const backing = mesh(group, backVertices, backingMaterial, 'Opaque membrane backing behind diamond joints'); backing.receiveShadow = false;

  const opening = { rx: 41.5, rz: 61, exponent: 4.4 }, outer = { rx: 103, rz: 118, exponent: 3.15 };
  const roofSurface = (theta, t) => {
    const a = allianzPoint(opening, theta), b = allianzPoint(outer, theta);
    return { x: a.x + (b.x - a.x) * t, y: 47.2 + t * 4.5, z: a.z + (b.z - a.z) * t };
  };
  const roofMat = material('#c7d1d6', { side: THREE.DoubleSide, roughness: .72, metalness: .1 });
  roofMaterials.push(roofMat);
  const panels = cushions(group, roofSurface, 96, 8, [roofMat], 'Fixed ETFE perimeter roof; central opening', .18, 'up');
  for (const roof of panels) { roof.userData.overviewRoof = true; roofMeshes.push(roof); }
  // Cushion diamonds meet a continuous structural membrane at both perimeter
  // edges; their half-cell boundaries must not expose triangular roof holes.
  const roofBackVertices = [];
  for (let i = 0; i < 192; i++) {
    const a = i * TAU / 192, b = (i + 1) * TAU / 192;
    const point = (theta, t) => { const p = roofSurface(theta, t); p.y -= .12; return arr(p); };
    quad(roofBackVertices, point(a, 0), point(b, 0), point(b, 1), point(a, 1));
  }
  const roofBackMaterial = material('#8395a3', { side: THREE.DoubleSide, roughness: .82 });
  const roofBack = mesh(group, roofBackVertices, roofBackMaterial, 'Continuous fixed roof membrane behind diamond cushions');
  roofBack.receiveShadow = false; roofBack.castShadow = true; roofBack.userData.overviewRoof = true;
  roofMeshes.push(roofBack); roofMaterials.push(roofBackMaterial);
  for (let i = 0; i < 40; i++) {
    const a = roofSurface(i * TAU / 40, 0), b = roofSurface(i * TAU / 40, 1);
    beam(group, [a.x, a.y - .3, a.z], [b.x, b.y - .3, b.z], .14, viewer.mats.roofEdge, 6);
    beam(group, [a.x, a.y - 1.8, a.z], [b.x, b.y - .3, b.z], .075, viewer.mats.rail, 6);
  }
  const lamps = material('#f3f3ea', { emissive: '#fff5e3', emissiveIntensity: .28 });
  for (let i = 0; i < 36; i++) {
    const p = roofSurface(i * TAU / 36, .15);
    const lamp = box(group, [1.55, .42, .58], [p.x, p.y - .6, p.z], lamps, [0, yawIn(p), 0]); lamp.userData.floodlight = true;
  }
  // Two high goal-end screens, approximately 200 m² each. No Bernabeu ribbon.
  for (const sign of [-1, 1]) {
    const p = [0, 42.5, sign * 91], screen = new THREE.Group(); screen.position.set(...p); screen.rotation.y = sign > 0 ? Math.PI : 0; group.add(screen);
    box(screen, [20, 10, .4], [0, 0, 0], viewer.mats.black);
    surfaceLabel(screen, 'FC BAYERN · ALLIANZ ARENA', 19.4, 9.4, [0, 0, .23], [0, 0, 0], { width: 1024, height: 512, background: '#14223b', color: '#f4f0ef', emissive: '#eeeeee' });
  }
  const base = { rx: 103, rz: 118, exponent: 3.15 };
  box(group, [1600, .08, 1600], [0, -.25, 0], material('#78866f'));
  ring(group, base, 0, 27, .02, .02, material('#bcbfb9', { side: THREE.DoubleSide }), 'Schematic Allianz circulation apron');
  box(group, [58, .03, 100], [-8, .08, 170], material('#bcbfb9'));
  for (const [id, label, theta] of [['west-entry', '西侧入口 · 示意', Math.PI], ['east-entry', '东侧入口 · 示意', 0], ['north-entry', '北侧入口 · 示意', Math.PI * 1.5], ['south-entry', '南侧入口 · 示意', Math.PI * .5]]) {
    const p = allianzPoint(base, theta, 14), gate = new THREE.Group(); gate.position.set(p.x, .03, p.z); gate.rotation.y = yawIn(p) + Math.PI; gate.name = label; group.add(gate);
    for (const x of [-5.2, 5.2]) box(gate, [.55, 3.8, 1], [x, 1.9, 0], viewer.mats.rail);
    box(gate, [11, .7, 1], [0, 3.55, 0], concrete);
    surfaceLabel(gate, 'ALLIANZ ARENA', 9.8, .45, [0, 3.55, .51], [0, 0, 0], { background: '#d6dcdf', color: '#1c487a' });
    for (const x of [-3.3, -1.1, 1.1, 3.3]) {
      beam(gate, [x, .1, 0], [x, 2.15, 0], .07, viewer.mats.rail);
      for (let y = .45; y < 2; y += .38) { beam(gate, [x -.6, y, 0], [x + .6, y, 0], .022, viewer.mats.rail, 5); beam(gate, [x, y, -.6], [x, y, .6], .022, viewer.mats.rail, 5); }
    }
    for (const sign of [-1, 1]) {
      beam(gate, [sign * 5.3, 1.5, 0], [sign * 16.3, 1.5, 0], .033, viewer.mats.rail);
      for (let x = 5.3; x < 16.3; x += .42) beam(gate, [sign * x, .1, 0], [sign * x, 1.55, 0], .021, viewer.mats.rail, 5);
      beam(gate, [sign * 4.4, 1, 1], [sign * 4.4, 1, 5], .032, viewer.mats.rail);
    }
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    landmarks.push({ id, label, sitePosition: [p.x, .03, p.z], target: [p.x, 1.8, p.z], position: [p.x + out.x * 16, 4.8, p.z + out.z * 16] });
  }
  return { roofMeshes, roofMaterials, landmarks, shellMeshes, backing, lightingMaterials };
}

export function buildAllianz(viewer, group, originalHelpers) {
  const helpers = { ...originalHelpers, surfaceLabel(...args) { const label = originalHelpers.surfaceLabel(...args); label.material.side = THREE.FrontSide; return label; } };
  const { box, material, chairGeometry, seatLetterCanvas, random } = helpers;
  group.name = 'Allianz Arena estimated three-tier red bowl with inflated ETFE diamond envelope';
  viewer.mats.glass.forceSinglePass = true; addTreads(viewer, group);
  const images = { east1: seatLetterCanvas('MÜNCHEN'), east2: seatLetterCanvas('BAYERN'), east3: seatLetterCanvas('FC'), west1: seatLetterCanvas('Mia san Mia') };
  const records = [], crowd = [], object = new THREE.Object3D(); let letterSeats = 0;
  for (const section of viewer.sections) for (let row = 1; row <= section.rows; row++) for (let seat = 1; seat <= section.seatsPerRow; seat++) {
    const p = viewer.position(section, row, seat), seed = records.length;
    if (section.type === 'accessible' && seat % 2 === 1) { box(group, [.8, .035, 1.15], [p.x, p.y, p.z], material('#527ca3'), [0, yawIn(p), 0]); continue; }
    let color = new THREE.Color(section.type === 'dugout' ? '#8b1530' : '#bd1935').multiplyScalar(.88 + random(seed) * .2);
    const image = images[`${section.stand}${section.tier}`];
    if (image && ['seat', 'standing'].includes(section.type)) {
      const screenAlong = section.stand === 'west' ? -p.z : p.z, extent = section.tier === '3' ? 56 : 110;
      const u = Math.floor((screenAlong / extent + .5) * 800), v = 239 - Math.floor((row - 4) / (section.rows - 8) * 240);
      if (u >= 0 && u < 800 && v >= 0 && v < 240 && image.data[(v * 800 + u) * 4] > 128) { color.set('#eeefec'); letterSeats++; }
    }
    if (section.stand === 'north' && section.tier === '2' && section.type === 'seat') {
      // Schematic seat-colour rendition of the officially documented north
      // stand club badge, not a pixel-perfect or surveyed logo placement.
      const nx = p.x / 18, ny = (p.y - 17.7) / 3.3, r = Math.hypot(nx, ny);
      if (r < 1) {
        if (r > .72) color.set('#f2f1eb');
        else color.set((Math.floor((nx + ny) * 5) + Math.floor((nx - ny) * 5)) % 2 ? '#e9efef' : '#2469ad');
      }
    }
    const rotation = yawIn(p); records.push({ position: p, rotation, color, sectionId: section.id, row, seat });
    if (random(seed + 173) > .14 && !['suite', 'dugout', 'accessible'].includes(section.type)) crowd.push({ position: p, rotation, seed, standing: section.type === 'standing' });
  }
  const chairs = new THREE.InstancedMesh(chairGeometry(), viewer.mats.red, records.length);
  records.forEach((record, i) => { object.position.set(record.position.x, record.position.y, record.position.z); object.rotation.set(0, record.rotation, 0); object.scale.set(1, 1, 1); object.updateMatrix(); chairs.setMatrixAt(i, object.matrix); chairs.setColorAt(i, record.color); });
  chairs.name = 'Selectable Allianz red seats and upright white club lettering'; chairs.receiveShadow = true; chairs.computeBoundingSphere(); group.add(chairs);
  viewer.buildCrowd(group, crowd); addStandingRails(viewer, group, helpers); addBoxes(viewer, group, helpers); addDugouts(viewer, group, helpers); addBoards(viewer, group, helpers);
  const exterior = addShell(viewer, group, helpers);
  viewer.roofMeshes = exterior.roofMeshes; viewer.roofMaterials = exterior.roofMaterials; viewer.exteriorLandmarks = exterior.landmarks;
  viewer.allianzLightingMaterials = exterior.lightingMaterials;
  viewer.allianzGeometry = { chairRecords: records, letterSeats, exterior, lettering: { east: 'FC / BAYERN / MÜNCHEN', west: 'Mia san Mia', screenRightEast: '+Z', screenRightWest: '-Z', textTop: 'rear/high rows', estimatedLocations: true } };
  return viewer.allianzGeometry;
}
export function validateAllianzGeometry(viewer) {
  const data = viewer.allianzGeometry; if (!data) throw new Error('安联几何尚未构建'); viewer.procedural?.updateMatrixWorld(true);
  let maxYawError = 0, roofBlocked = 0, rays = 0;
  for (const record of data.chairRecords) maxYawError = Math.max(maxYawError, Math.abs(1 - new THREE.Vector3(Math.sin(record.rotation), 0, Math.cos(record.rotation)).dot(new THREE.Vector3(-record.position.x, 0, -record.position.z).normalize())));
  const ray = new THREE.Raycaster(), target = new THREE.Vector3(0, .7, 0);
  for (const section of viewer.sections) for (const row of new Set([1, Math.ceil(section.rows / 2), section.rows])) for (const seat of new Set([1, Math.ceil(section.seatsPerRow / 2), section.seatsPerRow])) {
    const p = viewer.position(section, row, seat), eye = new THREE.Vector3(p.x, p.y + 1.15, p.z), direction = target.clone().sub(eye); rays++;
    ray.set(eye, direction.clone().normalize()); ray.far = direction.length(); ray.near = .04;
    if (ray.intersectObjects(data.exterior.roofMeshes, false).length) roofBlocked++;
  }
  return { chairs: data.chairRecords.length, maxYawError, roofBlocked, rays, letterSeats: data.letterSeats, lettering: data.lettering, membraneMaterialBatches: data.exterior.shellMeshes.length };
}
