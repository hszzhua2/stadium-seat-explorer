import * as THREE from 'three';
import { OLD_TRAFFORD_LAYOUT, OLD_TRAFFORD_CORNERS, oldTraffordRowSeatCount } from './old-trafford-data.js';

const TAU = Math.PI * 2, arr = p => [p.x, p.y, p.z];
const yawIn = p => Math.atan2(-p.x, -p.z);
function quad(vertices, a, b, c, d) { vertices.push(...a, ...b, ...d, ...b, ...c, ...d); }
function geometry(vertices) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2)); g.computeVertexNormals(); return g;
}
function mesh(group, vertices, material, name) {
  const m = new THREE.Mesh(geometry(vertices), material); m.name = name; m.receiveShadow = true; group.add(m); return m;
}
function sidePoint(side, distance, y, along) {
  const layout = OLD_TRAFFORD_LAYOUT[side];
  return layout.long ? [layout.sign * distance, y, along] : [along, y, layout.sign * distance];
}
function cornerPoint(s, theta, distance, y) { return [s.centerX + (s.rx + distance) * Math.cos(theta), y, s.centerZ + (s.rz + distance) * Math.sin(theta)]; }
function cornerStrip(group, s, inner, outer, y1, y2, material, name, slices = 24) {
  const v = [];
  for (let i = 0; i < slices; i++) {
    const a = s.angleStart + (s.angleEnd - s.angleStart) * i / slices, b = s.angleStart + (s.angleEnd - s.angleStart) * (i + 1) / slices;
    quad(v, cornerPoint(s, a, inner, y1), cornerPoint(s, b, inner, y1), cornerPoint(s, b, outer, y2), cornerPoint(s, a, outer, y2));
  }
  return mesh(group, v, material, name);
}
function addSteps(viewer, group, helpers) {
  const normal = [], curved = [];
  for (const s of viewer.sections.filter(s => ['seat', 'standing'].includes(s.type))) for (let row = 1; row <= s.rows; row++) {
    const y = s.baseHeight + (row - 1) * s.rowRise - .025, d = (row - 1) * s.rowDepth;
    const point = (theta, offset, height) => s.layout === 'corner' ? cornerPoint(s, theta, d + offset, height)
      : sidePoint(s.side, s.frontDistance + d + offset, height, theta);
    const slices = s.layout === 'corner' ? 8 : 1, list = s.layout === 'corner' ? curved : normal;
    for (let i = 0; i < slices; i++) {
      const a = s.start + (s.end - s.start) * i / slices, b = s.start + (s.end - s.start) * (i + 1) / slices;
      const p1 = point(a, -.35, y), p2 = point(b, -.35, y), p3 = point(b, s.rowDepth - .35, y), p4 = point(a, s.rowDepth - .35, y);
      // Ensure every top face points upwards regardless of side/arc ordering.
      const cross = new THREE.Vector3(...p2).sub(new THREE.Vector3(...p1)).cross(new THREE.Vector3(...p4).sub(new THREE.Vector3(...p1)));
      if (cross.y > 0) quad(list, p1, p2, p3, p4); else quad(list, p1, p4, p3, p2);
      const low1 = [...p1], low2 = [...p2]; low1[1] -= s.rowRise; low2[1] -= s.rowRise;
      quad(list, low1, low2, p2, p1);
    }
  }
  for (const [vertices, name] of [[normal, 'Old Trafford straight stepped tiers'], [curved, 'Old Trafford corner stepped tiers']]) {
    const m = mesh(group, vertices, viewer.mats.concrete, name); m.castShadow = true;
  }
  for (const s of viewer.sections.filter(s => s.type === 'standing')) for (let row = 1; row <= s.rows; row++) {
    const y = s.baseHeight + (row - 1) * s.rowRise, d = (row - 1) * s.rowDepth - .34;
    const point = (along, height) => s.layout === 'corner' ? cornerPoint(s, along, d, height) : sidePoint(s.side, s.frontDistance + d, height, along);
    const slices = s.layout === 'corner' ? 6 : 5;
    for (let i = 0; i < slices; i++) {
      const along = s.start + (s.end - s.start) * i / slices, end = s.start + (s.end - s.start) * (i + 1) / slices;
      helpers.beam(group, point(along, y + .92), point(end, y + .92), .024, viewer.mats.rail, 5);
      if (i % 2 === 0) helpers.beam(group, point(along, y), point(along, y + .92), .019, viewer.mats.rail, 5);
    }
  }
}
function addSuites(viewer, group, helpers) {
  const { box, beam } = helpers, mats = viewer.mats;
  for (const s of viewer.sections.filter(s => s.type === 'suite')) {
    const layout = OLD_TRAFFORD_LAYOUT[s.side], middle = (s.start + s.end) / 2, p = sidePoint(s.side, s.frontDistance, s.baseHeight, middle);
    const room = new THREE.Group(); room.name = `${s.id}: estimated glazed hospitality box`; room.position.set(...p); room.rotation.y = layout.long ? -layout.sign * Math.PI / 2 : layout.sign > 0 ? Math.PI : 0; group.add(room);
    const width = s.end - s.start, depth = s.rowDepth * (s.rows - 1) + 1.15;
    box(room, [width, .12, depth], [0, 2.16, -.36], mats.concreteDark);
    box(room, [width, .12, depth], [0, -.13, -.36], mats.concrete);
    box(room, [width, 1.83, .025], [0, 1.05, .5], mats.glass);
    box(room, [width, 1.7, .08], [0, .91, -depth / 2 - .36], mats.concreteDark);
    for (const x of [-width / 2, width / 2]) box(room, [.035, 2.02, depth], [x, 1.05, -.36], mats.glass);
    for (let x = -width / 2; x <= width / 2; x += 2.2) beam(room, [x, .15, .52], [x, 2.01, .52], .022, mats.rail, 5);
  }
}
function addDugouts(viewer, group, helpers) {
  const { box, beam, surfaceLabel } = helpers, mats = viewer.mats;
  for (const s of viewer.sections.filter(s => s.type === 'dugout')) {
    const width = s.end - s.start + .7, z = (s.start + s.end) / 2, depth = s.rows * s.rowDepth + .4;
    // 2026 three-row open dugouts, recessed against the single-tier south
    // stand. There is deliberately no copied transparent canopy over them.
    box(group, [depth, .16, width], [s.frontDistance + .75, s.baseHeight - .15, z], mats.concreteDark);
    for (const edge of [z - width / 2, z + width / 2]) {
      box(group, [depth, .85, .11], [s.frontDistance + .75, .29, edge], mats.concrete);
      beam(group, [s.frontDistance - .45, .78, edge], [s.frontDistance + depth - .6, .78, edge], .028, mats.rail);
    }
    for (let row = 1; row <= s.rows; row++) box(group, [.85, .16, width - .15],
      [s.frontDistance + (row - 1) * s.rowDepth, s.baseHeight + (row - 1) * s.rowRise - .12, z], mats.concreteDark);
    surfaceLabel(group, 'MANCHESTER UNITED', width, .24, [s.frontDistance -.44, .32, z], [0, -Math.PI / 2, 0], { background: '#a5152d', color: '#f2eeee' });
  }
  // Current player entrance at the south-west corner. The south centre is
  // the historic Munich tunnel, not the modern matchday player exit.
  box(group, [5.5, 2.1, 3.2], [40.6, .78, 49.1], mats.concreteDark);
  surfaceLabel(group, 'PLAYER ENTRANCE', 2.8, .36, [37.81, 1.75, 49.1], [0, -Math.PI / 2, 0], { background: '#252a30' });
  surfaceLabel(group, 'MUNICH TUNNEL', 3.2, .35, [40.15, 1.2, 0], [0, -Math.PI / 2, 0], { background: '#322b27', color: '#e8dfd2' });
}
function addPitchBoards(group, helpers) {
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    const z = -45.5 + i * 13; if (side === 1 && (Math.abs(z) < 15 || z > 40)) continue;
    helpers.surfaceLabel(group, 'MANCHESTER UNITED', 12.5, .65, [side * 35.7, .56, z], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { background: '#b2122d', color: '#f3efef' });
  }
  for (const sign of [-1, 1]) for (let i = 0; i < 5; i++) helpers.surfaceLabel(group, 'OLD TRAFFORD', 13.1, .65,
    [-28 + i * 14, .56, sign * 55.1], [0, sign > 0 ? Math.PI : 0, 0], { background: '#e8ecee', color: '#ad1730' });
}
function brickMaterial(material) {
  const mat = material('#ffffff', { roughness: .92, side: THREE.DoubleSide });
  mat.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vOldBrick;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvOldBrick=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader = 'varying vec3 vOldBrick;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float along=(abs(vOldBrick.x)>67. && abs(vOldBrick.z)<55.)?vOldBrick.z:vOldBrick.x;
      float row=floor(vOldBrick.y/.24);vec2 tile=vec2((along+mod(row,2.)*.26)/.52,vOldBrick.y/.24);
      vec2 f=fract(tile);float joint=smoothstep(.015,.045,min(f.x,1.-f.x))*smoothstep(.025,.065,min(f.y,1.-f.y));
      float h=fract(sin(dot(floor(tile),vec2(12.9898,78.233)))*43758.5453);
      diffuseColor.rgb*=mix(vec3(.53,.51,.47),vec3(.45,.18,.13)*(.86+h*.23),joint);`);
  };
  mat.customProgramCacheKey = () => 'old-trafford-procedural-brick-v1'; return mat;
}

function addArchitecture(viewer, group, helpers) {
  const { material, box, beam, surfaceLabel } = helpers, mats = viewer.mats;
  const roofMeshes = [], roofMaterials = [], landmarks = [], bounds = {};
  const concrete = material('#aeb4b6', { side: THREE.DoubleSide }), brick = brickMaterial(material);
  const whiteSteel = material('#dce1df', { metalness: .3, roughness: .62 }), redSteel = material('#963744', { roughness: .64, metalness: .35 });
  for (const s of viewer.sections.filter(s => s.layout !== 'corner' && ['seat', 'standing'].includes(s.type))) {
    const b = bounds[s.side] ??= { near: Infinity, far: 0, high: 0, start: Infinity, end: -Infinity, tiers: [] };
    b.near = Math.min(b.near, s.frontDistance); b.far = Math.max(b.far, s.frontDistance + (s.rows - 1) * s.rowDepth);
    b.high = Math.max(b.high, s.baseHeight + (s.rows - 1) * s.rowRise); b.start = Math.min(b.start, s.start); b.end = Math.max(b.end, s.end);
    const vertices = [];
    quad(vertices, sidePoint(s.side, s.frontDistance - .34, s.baseHeight - .8, s.start), sidePoint(s.side, s.frontDistance - .34, s.baseHeight - .8, s.end),
      sidePoint(s.side, s.frontDistance + (s.rows - 1) * s.rowDepth + .42, s.baseHeight + (s.rows - 1) * s.rowRise - .8, s.end),
      sidePoint(s.side, s.frontDistance + (s.rows - 1) * s.rowDepth + .42, s.baseHeight + (s.rows - 1) * s.rowRise - .8, s.start));
    mesh(group, vertices, concrete, `${s.id}: sloping under-deck structure`);
  }
  for (const s of viewer.sections.filter(s => s.layout === 'corner' && ['seat', 'standing'].includes(s.type))) {
    cornerStrip(group, s, -.34, (s.rows - 1) * s.rowDepth + .42, s.baseHeight - .8,
      s.baseHeight + (s.rows - 1) * s.rowRise - .8, concrete, `${s.id}: corner under-deck structure`);
  }
  for (const [side, b] of Object.entries(bounds)) {
    const layout = OLD_TRAFFORD_LAYOUT[side], length = b.end - b.start + 1.5, middle = (b.start + b.end) / 2;
    b.inner = b.near - 3.4; b.outer = b.far + 4.1;
    b.innerRoof = side === 'north' ? 49.7 : side === 'south' ? 20.5 : 36.6;
    b.outerRoof = side === 'north' ? 57.5 : side === 'south' ? 24.4 : 40.5;
    // The middle of the constrained South roof remains low; its ends rise to
    // the taller adjoining quadrants. This estimated transition avoids putting
    // the single-tier roof through the upper corner seats' pitch sightlines.
    const southCornerBack = Math.max(...viewer.sections.filter(s => s.layout === 'corner' && s.stand === 'south' && ['seat', 'standing'].includes(s.type)).map(s => 35 + s.rx + (s.rows - 1) * s.rowDepth + 4.1));
    const wingWeight = along => Math.pow(THREE.MathUtils.clamp((Math.abs(along) - 12) / (b.end + .7 - 12), 0, 1), 2);
    b.roofOuter = along => side === 'south' ? THREE.MathUtils.lerp(b.outer, Math.max(b.outer, southCornerBack), wingWeight(along)) : b.outer;
    b.roofHeight = (distance, along) => {
      const t = (distance - b.inner) / (b.roofOuter(along) - b.inner), y = b.innerRoof + (b.outerRoof - b.innerRoof) * t;
      if (side !== 'south') return y;
      return THREE.MathUtils.lerp(y, 36.6 + 3.9 * t, wingWeight(along));
    };
    const height = b.outerRoof -.15, distance = b.outer -.24, outerWall = [], innerWall = [];
    const wallSlices = side === 'south' ? 32 : 1;
    for (let i = 0; i < wallSlices; i++) {
      const a = b.start -.75 + length * i / wallSlices, c = b.start -.75 + length * (i + 1) / wallSlices;
      for (const [offset, vertices] of [[-.24, outerWall], [-.39, innerWall]]) quad(vertices,
        sidePoint(side, b.roofOuter(a) + offset, 0, a), sidePoint(side, b.roofOuter(c) + offset, 0, c),
        sidePoint(side, b.roofOuter(c) + offset, b.roofHeight(b.roofOuter(c), c) -.15, c), sidePoint(side, b.roofOuter(a) + offset, b.roofHeight(b.roofOuter(a), a) -.15, a));
    }
    mesh(group, outerWall, side === 'east' ? concrete : brick, `${side}: enclosing exterior to roof eave`);
    mesh(group, innerWall, concrete, `${side}: grey interior rear wall to roof eave`);
    // Blue-green glazed East facade and white mullions reference the actual
    // front of the stadium; North has red columns and pale concrete bands.
    const facadeGlass = material('#557d89', { roughness: .3, metalness: .3 });
    if (side === 'east') {
      box(group, [length - 2, 17, .09], sidePoint(side, distance + .28, 16, middle), facadeGlass);
      for (let along = b.start; along < b.end; along += 4) box(group, [.11, 17.1, .18], sidePoint(side, distance + .37, 16, along), whiteSteel);
      for (const y of [8, 13, 19, 24]) box(group, [length, .12, .18], sidePoint(side, distance + .37, y, middle), whiteSteel);
      surfaceLabel(group, 'MANCHESTER UNITED', 53, 2.4, sidePoint(side, distance + .5, 28, middle), [0, Math.PI, 0], { background: '#dadfdc', color: '#b5172d' });
    } else {
      for (const y of side === 'north' ? [8.5, 18, 29, 40] : [8, 15]) {
        if (y > height - 2) continue;
        box(group, layout.long ? [.08, 2.5, length - 1] : [length - 1, 2.5, .08], sidePoint(side, distance + .3, y, middle), facadeGlass);
        box(group, layout.long ? [.13, .45, length] : [length, .45, .13], sidePoint(side, distance + .4, y - 1.7, middle), concrete);
      }
      for (let along = b.start; along <= b.end; along += 7) box(group, layout.long ? [.7, height + .4, .65] : [.65, height + .4, .7], sidePoint(side, distance + .4, height / 2, along), side === 'north' ? redSteel : concrete);
    }
    const roofMat = material('#c8ceca', { metalness: .24, roughness: .67, side: THREE.DoubleSide }), rv = [];
    const roofSlices = side === 'south' ? 32 : 1;
    for (let i = 0; i < roofSlices; i++) {
      const a = b.start -.7 + (b.end - b.start + 1.4) * i / roofSlices, c = b.start -.7 + (b.end - b.start + 1.4) * (i + 1) / roofSlices;
      quad(rv, sidePoint(side, b.inner, b.roofHeight(b.inner, a), a), sidePoint(side, b.inner, b.roofHeight(b.inner, c), c),
        sidePoint(side, b.roofOuter(c), b.roofHeight(b.roofOuter(c), c), c), sidePoint(side, b.roofOuter(a), b.roofHeight(b.roofOuter(a), a), a));
    }
    const roof = mesh(group, rv, roofMat, `${side}: separate fixed roof`); roof.userData.overviewRoof = true; roof.receiveShadow = false; roof.castShadow = true; roofMeshes.push(roof); roofMaterials.push(roofMat);
    // Exposed white triangulated cantilever steel, particularly dense on the
    // three-tier North stand, rather than a smooth membrane or silver shell.
    const count = side === 'north' ? 32 : layout.long ? 18 : 16;
    for (let i = 0; i <= count; i++) {
      const along = b.start + (b.end - b.start) * i / count, outer = b.roofOuter(along), a = sidePoint(side, b.inner, b.roofHeight(b.inner, along) + .12, along), c = sidePoint(side, outer, b.roofHeight(outer, along) + .12, along);
      const ridge = sidePoint(side, outer - 6, b.roofHeight(outer, along) + (side === 'north' ? 3.2 : 1.7), along);
      beam(group, a, ridge, .12, whiteSteel, 6); beam(group, ridge, c, .12, whiteSteel, 6); beam(group, a, c, .09, whiteSteel, 6);
      for (let j = 1; j <= 5; j++) {
        const t = j / 6, d = b.inner + (outer - b.inner) * t, y = b.roofHeight(d, along);
        const p = sidePoint(side, d, y + .12, along), q = sidePoint(side, d, y + .12 + Math.sin(t * Math.PI) * (side === 'north' ? 3 : 1.5), along);
        beam(group, p, q, .045, whiteSteel, 5);
        if (i < count) { const next = along + (b.end - b.start) / count, nextD = b.inner + (b.roofOuter(next) - b.inner) * t; beam(group, q, sidePoint(side, nextD, b.roofHeight(nextD, next) + .12, next), .043, whiteSteel, 5); }
      }
    }
    for (const along of [b.start - .7, b.end + .7]) {
      const v = [];
      const outer = b.roofOuter(along);
      quad(v, sidePoint(side, b.inner, b.roofHeight(b.inner, along) - .55, along), sidePoint(side, outer, b.roofHeight(outer, along) - .55, along),
        sidePoint(side, outer, b.roofHeight(outer, along) + .25, along), sidePoint(side, b.inner, b.roofHeight(b.inner, along) + .25, along));
      mesh(group, v, concrete, `${side}: narrow roof fascia`);
    }
  }
  // Four curved roof connectors are distinct pieces linking the unequal
  // stands. South corners retain a taller end-stand roof beside the low South.
  for (const c of OLD_TRAFFORD_CORNERS) {
    const longSide = c.stand, endSide = c.centerZ > 0 ? 'west' : 'east', a = bounds[longSide], b = bounds[endSide];
    const cornerRows = viewer.sections.filter(s => s.corner === c.corner && ['seat', 'standing'].includes(s.type));
    const maxLong = Math.max(a.roofOuter(c.centerZ) - 35, ...cornerRows.map(s => s.rx + (s.rows - 1) * s.rowDepth + 4.1));
    const maxEnd = Math.max(b.outer - 53, ...cornerRows.map(s => s.rz + (s.rows - 1) * s.rowDepth + 4.1)), v = [];
    const profile = { ...c, rx: 3.6, rz: 3.6 };
    for (let i = 0; i < 32; i++) {
      const t1 = i / 32, t2 = (i + 1) / 32, th1 = c.angleStart + (c.angleEnd - c.angleStart) * t1, th2 = c.angleStart + (c.angleEnd - c.angleStart) * t2;
      const roofY = theta => {
        const longWeight = Math.abs(Math.cos(theta));
        return c.stand === 'south' ? [b.innerRoof, b.outerRoof] : [b.innerRoof * (1 - longWeight) + a.innerRoof * longWeight, b.outerRoof * (1 - longWeight) + a.outerRoof * longWeight];
      };
      const y1 = roofY(th1), y2 = roofY(th2);
      const p = (theta, x, z, y) => [c.centerX + x * Math.cos(theta), y, c.centerZ + z * Math.sin(theta)];
      quad(v, p(th1, 3.6, 3.6, y1[0]), p(th2, 3.6, 3.6, y2[0]), p(th2, maxLong, maxEnd, y2[1]), p(th1, maxLong, maxEnd, y1[1]));
    }
    const mat = material('#bbc3c1', { side: THREE.DoubleSide, roughness: .73, metalness: .16 });
    const roof = mesh(group, v, mat, `${c.corner}: curved fixed roof connector`); roof.userData.overviewRoof = true; roof.receiveShadow = false; roof.castShadow = true; roofMeshes.push(roof); roofMaterials.push(mat);
    const rear = { ...c, rx: maxLong -.24, rz: maxEnd -.24 }, wallVertices = [], innerVertices = [];
    for (let i = 0; i < 24; i++) {
      const t1 = c.angleStart + (c.angleEnd - c.angleStart) * i / 24, t2 = c.angleStart + (c.angleEnd - c.angleStart) * (i + 1) / 24;
      const y = theta => c.stand === 'south' ? b.outerRoof : THREE.MathUtils.lerp(b.outerRoof, a.outerRoof, Math.abs(Math.cos(theta)));
      for (const [offset, vertices] of [[0, wallVertices], [-.15, innerVertices]]) quad(vertices,
        cornerPoint(rear, t1, offset, 0), cornerPoint(rear, t2, offset, 0), cornerPoint(rear, t2, offset, y(t2) -.15), cornerPoint(rear, t1, offset, y(t1) -.15));
    }
    mesh(group, wallVertices, brick, `${c.corner}: connected curved exterior body`);
    mesh(group, innerVertices, concrete, `${c.corner}: grey interior rear wall to roof eave`);
  }
  // Roof-mounted light arrays, no invented central scoreboard blocking a seat.
  const lampMaterial = material('#eef0e8', { emissive: '#fff3df', emissiveIntensity: .28 });
  for (const [side, b] of Object.entries(bounds)) for (let i = 0; i < 12; i++) {
    const along = b.start + (b.end - b.start) * (i + .5) / 12, p = sidePoint(side, b.inner + 1.4, b.roofHeight(b.inner + 1.4, along) -.45, along);
    const lamp = box(group, OLD_TRAFFORD_LAYOUT[side].long ? [.55, .42, 1.8] : [1.8, .42, .55], p, lampMaterial); lamp.userData.floodlight = true;
  }
  // Schematic forecourt and railway strip behind the constrained South side.
  box(group, [1600, .08, 1600], [0, -.26, 0], material('#78826f'));
  box(group, [230, .025, 260], [0, -.17, 0], material('#b6b8b2'));
  for (const x of [80, 83]) { box(group, [.12, .07, 220], [x, .015, 0], mats.rail); }
  for (let z = -110; z < 110; z += 1.3) box(group, [5.5, .06, .2], [81.5, -.03, z], mats.concreteDark);
  for (const [side, b] of Object.entries(bounds)) {
    const p = sidePoint(side, b.outer + 6, .03, 0), entry = new THREE.Group(); entry.position.set(...p); entry.rotation.y = yawIn({ x: p[0], z: p[2] }) + Math.PI; entry.name = `${side}: entrance precinct`; group.add(entry);
    for (const x of [-5, 5]) box(entry, [.65, 3.9, 1], [x, 1.95, 0], brick);
    box(entry, [10.7, .72, 1.05], [0, 3.6, 0], concrete);
    surfaceLabel(entry, 'OLD TRAFFORD', 9.4, .5, [0, 3.6, .54], [0, 0, 0], { background: '#a1122a', color: '#f0eeee' });
    for (const x of [-3.2, -1, 1, 3.2]) {
      helpers.beam(entry, [x, .1, 0], [x, 2.15, 0], .07, mats.rail);
      for (let y = .45; y < 2; y += .37) helpers.beam(entry, [x -.6, y, 0], [x + .6, y, 0], .024, mats.rail, 5);
    }
    for (const sign of [-1, 1]) {
      beam(entry, [sign * 5.1, 1.5, 0], [sign * 15.3, 1.5, 0], .034, mats.rail);
      for (let x = 5.2; x < 15.3; x += .4) beam(entry, [sign * x, .1, 0], [sign * x, 1.55, 0], .021, mats.rail, 5);
      beam(entry, [sign * 4.4, 1, 1], [sign * 4.4, 1, 5], .033, mats.rail);
    }
    const out = new THREE.Vector3(p[0], 0, p[2]).normalize(), labels = { north: '北看台入口', south: '南看台入口', east: '东看台入口', west: 'Stretford 入口' };
    landmarks.push({ id: `${side}-entry`, label: `${labels[side]} · 示意`, sitePosition: p, target: [p[0], 1.8, p[2]], position: [p[0] + out.x * 16, 4.9, p[2] + out.z * 16] });
  }
  return { roofMeshes, roofMaterials, landmarks, bounds };
}

export function buildOldTrafford(viewer, group, originalHelpers) {
  const helpers = { ...originalHelpers, surfaceLabel(...args) { const sign = originalHelpers.surfaceLabel(...args); sign.material.side = THREE.FrontSide; return sign; } };
  const { chairGeometry, seatLetterCanvas, material, box, random } = helpers;
  group.name = 'Existing Old Trafford: asymmetric four stands and connecting quadrants'; viewer.mats.glass.forceSinglePass = true;
  addSteps(viewer, group, helpers);
  const records = [], crowd = [], object = new THREE.Object3D();
  const masks = { north: seatLetterCanvas('MANCHESTER UNITED'), west: seatLetterCanvas('STRETFORD END') }; let letterSeats = 0;
  for (const s of viewer.sections) for (let row = 1; row <= s.rows; row++) for (let seat = 1; seat <= oldTraffordRowSeatCount(s, row); seat++) {
    const p = viewer.position(s, row, seat), seed = records.length;
    if (s.type === 'accessible' && seat % 2 === 1) { box(group, [.8, .035, 1.15], [p.x, p.y, p.z], material('#577f9f'), [0, yawIn(p), 0]); continue; }
    const color = new THREE.Color(s.type === 'dugout' ? '#7c172a' : '#b51932').multiplyScalar(.87 + random(seed) * .24);
    if (s.layout !== 'corner' && ['seat', 'standing'].includes(s.type) && masks[s.stand] && s.tier === '2') {
      const along = s.stand === 'north' ? -p.z : -p.x, extent = s.stand === 'north' ? 101 : 66;
      const u = Math.floor((along / extent + .5) * 800), v = 239 - Math.floor((row - 3) / (s.rows - 6) * 240), mask = masks[s.stand];
      if (u >= 0 && u < 800 && v >= 0 && v < 240 && mask.data[(v * 800 + u) * 4] > 128) { color.set('#eeeae3'); letterSeats++; }
    }
    const rotation = yawIn(p); records.push({ position: p, rotation, color, sectionId: s.id, row, seat });
    if (random(seed + 187) > .14 && !['suite', 'dugout', 'accessible'].includes(s.type)) crowd.push({ position: p, rotation, seed, standing: s.type === 'standing' });
  }
  const chairs = new THREE.InstancedMesh(chairGeometry(), viewer.mats.red, records.length);
  records.forEach((r, i) => { object.position.set(r.position.x, r.position.y, r.position.z); object.rotation.set(0, r.rotation, 0); object.scale.set(1, 1, 1); object.updateMatrix(); chairs.setMatrixAt(i, object.matrix); chairs.setColorAt(i, r.color); });
  chairs.name = 'Estimated selectable Old Trafford red seats and upright white lettering'; chairs.receiveShadow = true; chairs.computeBoundingSphere(); group.add(chairs);
  viewer.buildCrowd(group, crowd); addSuites(viewer, group, helpers); addDugouts(viewer, group, helpers); addPitchBoards(group, helpers);
  const exterior = addArchitecture(viewer, group, helpers);
  viewer.roofMeshes = exterior.roofMeshes; viewer.roofMaterials = exterior.roofMaterials; viewer.exteriorLandmarks = exterior.landmarks;
  viewer.oldTraffordGeometry = { chairRecords: records, letterSeats, exterior, lettering: { north: 'MANCHESTER UNITED', west: 'STRETFORD END', screenRightNorth: '-Z', screenRightWest: '-X', estimatedGlyphPositions: true } };
  return viewer.oldTraffordGeometry;
}
export function validateOldTraffordGeometry(viewer) {
  const data = viewer.oldTraffordGeometry; if (!data) throw new Error('老特拉福德几何尚未构建'); viewer.procedural?.updateMatrixWorld(true);
  let maxYawError = 0, roofBlocked = 0, rays = 0;
  for (const r of data.chairRecords) maxYawError = Math.max(maxYawError, Math.abs(1 - new THREE.Vector3(Math.sin(r.rotation), 0, Math.cos(r.rotation)).dot(new THREE.Vector3(-r.position.x, 0, -r.position.z).normalize())));
  const ray = new THREE.Raycaster(), target = new THREE.Vector3(0, .7, 0);
  for (const s of viewer.sections) for (const row of new Set([1, Math.ceil(s.rows / 2), s.rows])) for (const seat of new Set([1, Math.ceil(oldTraffordRowSeatCount(s, row) / 2), oldTraffordRowSeatCount(s, row)])) {
    const p = viewer.position(s, row, seat), eye = new THREE.Vector3(p.x, p.y + (s.type === 'standing' ? 1.68 : 1.15), p.z), direction = target.clone().sub(eye); rays++;
    ray.set(eye, direction.clone().normalize()); ray.far = direction.length(); ray.near = .04;
    if (ray.intersectObjects(data.exterior.roofMeshes, false).length) roofBlocked++;
  }
  return { chairs: data.chairRecords.length, maxYawError, roofBlocked, rays, letterSeats: data.letterSeats, lettering: data.lettering,
    roofPieces: data.exterior.roofMeshes.length, coachRows: [6, 7, 8], stadium: 'existing' };
}
