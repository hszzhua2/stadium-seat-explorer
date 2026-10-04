import * as THREE from 'three';
import { buildGatesAndFences } from './gates.js';

// Architectural interpretation of LFC's October 2024 aerial photograph, not a surveyed model.
// Streets and terrace houses provide schematic context; they are not photogrammetric map tiles.
// Reference: https://www.liverpoolfc.com/news/anfield-crowned-uks-best-landmark-remarkable-venue-awards-2024
const up = new THREE.Vector3(0, 1, 0);
const rng = (n) => { const x = Math.sin(n * 18.331 + 7.54) * 43542.1; return x - Math.floor(x); };
const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });

function brickMap() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#a8917b'; ctx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 12; row++) for (let column = -1; column < 5; column++) {
    const x = column * 64 + (row % 2) * 32, y = row * 22;
    const shade = Math.floor(rng(row * 10 + column) * 24);
    ctx.fillStyle = `rgb(${143 + shade},${66 + shade * .7},${43 + shade * .5})`;
    ctx.fillRect(x + 1, y + 1, 62, 20);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(16, 8); texture.anisotropy = 8;
  return texture;
}
function meshBox(group, dimensions, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
}
function beam(group, from, to, radius, material) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 6), material);
  mesh.position.copy(a.add(b).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(up, d.normalize()); mesh.castShadow = true; group.add(mesh); return mesh;
}
function polygon(group, points, material, { roof = false } = {}) {
  const p = [], uvs = [];
  for (let i = 1; i < points.length - 1; i++) for (const point of [points[0], points[i], points[i + 1]]) { p.push(...point); uvs.push(point[0] / 4, point[2] / 4); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true;
  if (roof) mesh.userData.overviewRoof = true; group.add(mesh); return mesh;
}
function textPanel(group, text, dimensions, position, yaw, background = '#f0eee5', color = '#912a22') {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, 1024, 256);
  ctx.font = '700 116px Arial'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 135, 975);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...dimensions), mat('#fff', { map: texture, side: THREE.DoubleSide }));
  mesh.position.set(...position); mesh.rotation.y = yaw; group.add(mesh); return mesh;
}

function standEnvelope(group, side, b, materials, roofMeshes, roofMaterials) {
  const long = side === 'main' || side === 'kenny', sign = side === 'main' || side === 'road' ? -1 : 1;
  const sections = b.sections.filter(s => !['dugout', 'suite', 'accessible'].includes(s.type));
  const near = Math.min(...sections.map(s => s.frontDistance)) - (long ? 1.2 : 1.5);
  const far = b.far + 4.5;
  const half = Math.max(Math.abs(b.min), Math.abs(b.max)) + (long ? 9 : 7.5);
  const point = (distance, height, along) => long ? [sign * distance, height, along] : [along, height, sign * distance];
  const innerY = b.high + (side === 'main' ? 3.4 : 3.1);
  const outerY = b.high + (side === 'main' ? 6.6 : side === 'road' ? 5.6 : 4.5);
  const middle = near + (far - near) * .64;
  const middleY = THREE.MathUtils.lerp(innerY, outerY, .64) + .25;
  const roofMaterial = mat(side === 'main' ? '#bcc3c5' : side === 'road' ? '#c5cbd0' : '#b4bdc0', { metalness: .32, roughness: .67, side: THREE.DoubleSide });
  roofMaterials.push(roofMaterial);
  for (const [a, yA, c, yC] of [[near, innerY, middle, middleY], [middle, middleY, far, outerY]]) {
    roofMeshes.push(polygon(group, [point(a, yA, -half), point(c, yC, -half), point(c, yC, half), point(a, yA, half)], roofMaterial, { roof: true }));
  }
  // Deeper metal parapet and numerous standing seams give the roof a substantial edge.
  for (let along = -half; along <= half; along += 2) {
    const a = point(near, innerY + .03, along), c = point(far, outerY + .03, along);
    beam(group, a, c, .026, materials.seam);
  }
  for (const distance of [near, far]) {
    const height = distance === near ? innerY : outerY;
    beam(group, point(distance, height, -half), point(distance, height, half), .17, materials.trim);
    beam(group, point(distance, height - .85, -half), point(distance, height - .85, half), .11, materials.trim);
  }
  // White side enclosure follows the actual sloping roof, with brick below it.
  const brickTop = side === 'main' ? 31 : side === 'road' ? 21.5 : 10.5;
  const rearPanelDepth = side === 'main' ? 12 : side === 'road' ? 7 : side === 'kenny' ? 7 : 6;
  const frontBrick = Math.min(...sections.map(s => s.baseHeight));
  for (const along of [-half, half]) {
    // Cantilever enclosure tapers to a thin pitch-facing nose. It is not a tall,
    // rectangular end wall: the white rear wedge narrows along the roof's depth.
    polygon(group, [point(near, innerY - 1.6, along), point(near, innerY, along), point(far, outerY, along), point(far, outerY - rearPanelDepth, along)], materials.cladding);
    polygon(group, [point(near, -.25, along), point(near, frontBrick, along), point(far, brickTop, along), point(far, -.25, along)], materials.brick);
  }

  // A closed, ground-connected stand body follows the LOWEST deck at each depth.
  // This prevents the upper concourse mass from filling/obstructing lower-tier seats.
  // Sample the continuous floor lines instead of combining discrete row points:
  // tiers with offset row centers would otherwise introduce narrow upward spikes.
  const top = []; let lastHeight = Math.max(.2, frontBrick - .6);
  for (let d = near; d <= far + .01; d += .2) {
    const covering = sections.filter(s => d >= s.frontDistance - .1 && d <= s.frontDistance + (s.rows - .5) * s.rowDepth);
    if (covering.length) lastHeight = Math.max(.2, Math.min(...covering.map(s => s.baseHeight + Math.max(0, (d - s.frontDistance) / s.rowDepth) * s.rowRise - .65)));
    top.push([d, lastHeight]);
  }
  const shape = new THREE.Shape(); const radialSign = side === 'main' ? -1 : 1;
  shape.moveTo(radialSign * near, -.3); shape.lineTo(radialSign * far, -.3);
  shape.lineTo(radialSign * far, b.high - .42);
  for (let i = top.length - 1; i >= 0; i--) shape.lineTo(radialSign * top[i][0], Math.max(.2, top[i][1]));
  shape.lineTo(radialSign * near, Math.max(.2, top[0]?.[1] || 1)); shape.closePath();
  const foundation = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: half * 2 - .8, bevelEnabled: false, steps: 1 }), materials.structure);
  foundation.name = `${side}-continuous-lower-deck-foundation`;
  if (long) foundation.position.z = -half + .4;
  else if (side === 'road') { foundation.rotation.y = Math.PI / 2; foundation.position.x = -half + .4; }
  else { foundation.rotation.y = -Math.PI / 2; foundation.position.x = half - .4; }
  foundation.receiveShadow = true; foundation.castShadow = true; group.add(foundation);

  const outer = far + .55;
  const facade = long ? [2.4, outerY - 1.3, half * 2] : [half * 2, outerY - 1.3, 2.4];
  meshBox(group, facade, point(outer, (outerY - 1.3) / 2 - .15, 0), materials.backCladding);
  meshBox(group, long ? [2.5, brickTop, half * 2] : [half * 2, brickTop, 2.5], point(outer + .09, brickTop / 2 - .15, 0), materials.brick);
  // Multi-floor external glazing, concrete bands, and the projecting brick piers seen in the aerial.
  const floorHeights = side === 'main' ? [4.2, 11.4, 18.6, 25.8] : side === 'road' ? [4.3, 11.3, 18.3] : [3.8, 8];
  for (const y of floorHeights) {
    for (let along = -half + 4; along < half - 2; along += 7.8) {
      meshBox(group, long ? [.08, 4.35, 6.15] : [6.15, 4.35, .08], point(outer + 1.4, y, along), materials.window);
      for (let offset = -2.7; offset < 3; offset += 1.35) meshBox(group, long ? [.13, 4.45, .075] : [.075, 4.45, .13], point(outer + 1.48, y, along + offset), materials.frame);
    }
    meshBox(group, long ? [.3, .27, half * 2] : [half * 2, .27, .3], point(outer + 1.5, y - 2.28, 0), materials.trim);
  }
  for (let along = -half + 1; along < half; along += 7.8) {
    meshBox(group, long ? [1.1, brickTop + .7, 1.3] : [1.3, brickTop + .7, 1.1], point(outer + 1.55, brickTop / 2, along), materials.brick);
  }
  if (side === 'main' || side === 'road') {
    const bannerY = side === 'main' ? 36.5 : 27;
    textPanel(group, 'LIVERPOOL FOOTBALL CLUB', [side === 'main' ? 43 : 38, 3.4], point(outer + 1.85, bannerY, 0), long ? -Math.PI / 2 : Math.PI);
  }

  // High principal trusses are a defining part of the real aerial silhouette.
  if (side === 'main' || side === 'road') {
    const trussDepth = side === 'main' ? 8.3 : 3.5;
    const distance = side === 'main' ? far - 4.2 : far - 2.6;
    const bottom = outerY - .65;
    const steel = side === 'main' ? materials.principalSteel : materials.darkSteel;
    const crown = (along) => bottom + (side === 'main' ? 3.8 + Math.sin(THREE.MathUtils.clamp((along + half + 2) / (half * 2 + 4), 0, 1) * Math.PI) * (trussDepth - 3.8) : trussDepth);
    for (const offset of [-.65, .65]) {
      beam(group, point(distance + offset, bottom, -half - 2), point(distance + offset, bottom, half + 2), side === 'main' ? .3 : .2, steel);
      for (let along = -half - 2, index = 0; along < half + 2; along += 6.8, index++) {
        const next = Math.min(along + 6.8, half + 2);
        beam(group, point(distance + offset, crown(along), along), point(distance + offset, crown(next), next), side === 'main' ? .32 : .22, steel);
        beam(group, point(distance + offset, index % 2 ? crown(along) : bottom, along), point(distance + offset, index % 2 ? bottom : crown(next), next), side === 'main' ? .15 : .105, steel);
        if (index % 2 === 0) beam(group, point(distance + offset, bottom, along), point(distance + offset, crown(along), along), .1, steel);
      }
    }
  }
  // Under-roof cantilever trusses and the strip of daylight glazing on Kenny.
  for (let along = -half + 3; along < half; along += side === 'kenny' ? 5 : 8) {
    beam(group, point(near, innerY - .6, along), point(far, outerY - .65, along), .1, materials.steel);
    beam(group, point(near, innerY - 2.4, along), point(far, outerY - 2.4, along), .075, materials.steel);
    for (let d = near; d < far; d += 4.5) {
      const h = THREE.MathUtils.lerp(innerY, outerY, (d - near) / (far - near));
      beam(group, point(d, h - .6, along), point(Math.min(d + 4.5, far), h - 2.25, along), .044, materials.steel);
    }
    const lamp = meshBox(group, long ? [.5, .15, 1.8] : [1.8, .15, .5], point(near + .3, innerY - 2.7, along), materials.lamp);
    lamp.userData.floodlight = true;
    if (side === 'kenny') {
      const d1 = near + 3, d2 = near + 8;
      const y1 = THREE.MathUtils.lerp(innerY, outerY, (d1 - near) / (far - near)) + .035;
      const y2 = THREE.MathUtils.lerp(innerY, outerY, (d2 - near) / (far - near)) + .035;
      polygon(group, [point(d1, y1, along - 1.7), point(d2, y2, along - 1.7), point(d2, y2, along + 1.7), point(d1, y1, along + 1.7)], materials.skylight);
    }
  }
  return { side, near, far, half, innerY, outerY, point };
}

function context(group, envelopes, materials) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), materials.ground); ground.rotation.x = -Math.PI / 2; ground.position.y = -.38; ground.receiveShadow = true; group.add(ground);
  const mainFar = envelopes.main?.far || 96, kennyFar = envelopes.kenny?.far || 85;
  const kopFar = envelopes.kop?.far || 103, roadFar = envelopes.road?.far || 103;
  // Distances, building footprints and landscaping below are schematic.
  meshBox(group, [mainFar + kennyFar + 26, .12, kopFar + roadFar + 26], [(kennyFar - mainFar) / 2, -.31, (kopFar - roadFar) / 2], materials.paving);
  meshBox(group, [37, .14, 143], [-mainFar - 22, -.22, 0], materials.plaza);
  for (let z = -65; z < 66; z += 7) meshBox(group, [35, .012, .055], [-mainFar - 22, -.14, z], materials.pavingLine);
  for (let x = -mainFar - 39; x < -mainFar - 4; x += 7) meshBox(group, [.06, .012, 142], [x, -.14, 0], materials.pavingLine);
  const road = (size, position, alongX = true) => {
    meshBox(group, size, position, materials.asphalt);
    const length = alongX ? size[0] : size[2];
    for (let d = -length / 2 + 3; d < length / 2 - 3; d += 8) meshBox(group, alongX ? [3.6, .015, .1] : [.1, .015, 3.6], [position[0] + (alongX ? d : 0), position[1] + .09, position[2] + (alongX ? 0 : d)], materials.roadLine);
  };
  road([530, .16, 12], [30, -.13, kopFar + 15]); // Walton Breck Road, behind Kop.
  road([325, .16, 10.5], [3, -.13, -roadFar - 17]); // Anfield Road, behind expanded Road Stand.
  road([10, .16, 260], [kennyFar + 18, -.13, 10], false); // Residential edge behind Kenny.
  road([10, .16, 270], [-mainFar - 53, -.13, 13], false);
  // Repeated two-storey terraces convey the urban setting without claiming exact addresses.
  function terrace(centerX, centerZ, count, yaw = 0, seed = 0) {
    const row = new THREE.Group(); row.position.set(centerX, 0, centerZ); row.rotation.y = yaw;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 5.25, height = 6.3 + rng(seed + Math.floor(i / 5)) * .7;
      meshBox(row, [5.18, height, 10.3], [x, height / 2 - .2, 0], i % 5 ? materials.houseBrick : materials.houseBrickLight);
      const roofMat = materials.houseRoof;
      polygon(row, [[x - 2.66, height, -5.5], [x + 2.66, height, -5.5], [x + 2.66, height + 2.1, 0], [x - 2.66, height + 2.1, 0]], roofMat);
      polygon(row, [[x - 2.66, height + 2.1, 0], [x + 2.66, height + 2.1, 0], [x + 2.66, height, 5.5], [x - 2.66, height, 5.5]], roofMat);
      for (const z of [-5.17, 5.17]) for (const y of [1.5, 4.6]) for (const dx of [-1.25, 1.25]) meshBox(row, [1.1, 1.4, .07], [x + dx, y, z], materials.houseWindow);
      meshBox(row, [.9, 2.1, .12], [x + .1, .9, 5.2], materials.door);
      if (i % 2 === 0) meshBox(row, [.65, 1.8, .85], [x + 2.3, height + 2.25, .6], materials.houseBrick);
    }
    group.add(row);
  }
  for (let i = 0; i < 4; i++) terrace(kennyFar + 42 + i * 29, 0, 32, Math.PI / 2, i * 100);
  for (let i = 0; i < 4; i++) terrace(20, kopFar + 44 + i * 29, 42, 0, i * 130 + 7);
  terrace(-mainFar - 90, 12, 31, Math.PI / 2, 311);
  // Stanley Park lies beyond the Anfield Road side; only schematic green space and trees.
  meshBox(group, [390, .055, 310], [0, -.24, -roadFar - 210], materials.park);
  const treeTrunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.25, .4, 4, 5), materials.trunk, 180);
  const foliage = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), materials.foliage, 180);
  const object = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    const x = (rng(i + 2) - .5) * 355, z = -roadFar - 62 - rng(i + 201) * 270;
    const size = 3.3 + rng(i + 309) * 3;
    object.position.set(x, 1.8, z); object.scale.set(1, 1, 1); object.updateMatrix(); treeTrunks.setMatrixAt(i, object.matrix);
    object.position.y = 5 + size * .45; object.scale.set(size, size * .8, size); object.updateMatrix(); foliage.setMatrixAt(i, object.matrix);
    foliage.setColorAt(i, new THREE.Color('#fff').multiplyScalar(.7 + rng(i + 881) * .3));
  }
  treeTrunks.computeBoundingSphere(); foliage.computeBoundingSphere(); foliage.castShadow = true; group.add(treeTrunks, foliage);
}

export function buildAnfieldExterior(group, bounds) {
  const materials = {
    brick: mat('#fff', { map: brickMap() }), cladding: mat('#c9cdd0', { metalness: .23, side: THREE.DoubleSide }), backCladding: mat('#7e8a91', { metalness: .25 }),
    structure: mat('#707274', { side: THREE.DoubleSide }), trim: mat('#bac2c5', { metalness: .5 }), seam: mat('#899396', { metalness: .5 }),
    steel: mat('#d7ddde', { metalness: .5 }), principalSteel: mat('#a5b0b5', { metalness: .5 }), darkSteel: mat('#555e63', { metalness: .6 }), window: mat('#34464d', { roughness: .2, metalness: .5 }), frame: mat('#868f93', { metalness: .6 }),
    skylight: mat('#9bb5bb', { roughness: .25, metalness: .35, side: THREE.DoubleSide }), lamp: mat('#fffde1', { emissive: '#ffffdd', emissiveIntensity: .28 }),
    ground: mat('#6c7767'), paving: mat('#888984'), plaza: mat('#a7a59c'), pavingLine: mat('#c3c0b6'), asphalt: mat('#505659'), roadLine: mat('#c8c7b8'),
    houseBrick: mat('#865643'), houseBrickLight: mat('#a27052'), houseRoof: mat('#555354', { side: THREE.DoubleSide }), houseWindow: mat('#bbc8ca', { roughness: .4 }), door: mat('#3b4a49'),
    park: mat('#697d58'), foliage: mat('#526f3d'), trunk: mat('#5f5140'),
  };
  const roofMeshes = [], roofMaterials = [], envelopes = {};
  for (const [side, b] of Object.entries(bounds)) if (Number.isFinite(b.near)) envelopes[side] = standEnvelope(group, side, b, materials, roofMeshes, roofMaterials);
  // The longer side roofs overlap the end roofs at the corners. Narrow lower bridges and
  // white stair cores close the architectural junction without inventing extra seat blocks.
  for (const longSide of ['main', 'kenny']) for (const endSide of ['kop', 'road']) {
    const a = envelopes[longSide], b = envelopes[endSide]; if (!a || !b) continue;
    const sx = longSide === 'main' ? -1 : 1, sz = endSide === 'kop' ? 1 : -1;
    // Keep the stair cores outside both selectable stand footprints.
    const x = sx * Math.max(b.half + 5, a.near + 7), z = sz * Math.max(a.half + 5, b.near + 7);
    meshBox(group, [8.5, 11, 8.5], [x, 5.2, z], materials.brick);
    meshBox(group, [8.7, 1.2, 8.7], [x, 11.1, z], materials.cladding);
    meshBox(group, [5.5, .6, 12], [x, 12.7, z - sz * 4], materials.trim);
  }
  context(group, envelopes, materials);
  const { landmarks } = buildGatesAndFences(group, envelopes);
  return { roofMeshes, roofMaterials, envelopes, landmarks };
}
