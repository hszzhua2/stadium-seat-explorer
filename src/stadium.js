import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SECTIONS, VENUE, getPosition, getRowSeatCount } from './seat-data.js';
import { buildAnfieldExterior } from './exterior.js';
import { buildCampNou } from './camp-nou.js';
import { buildBernabeu } from './bernabeu.js';
import { buildAllianz } from './allianz.js';
import { buildOldTrafford } from './old-trafford.js';

const UP = new THREE.Vector3(0, 1, 0);
const TARGET = new THREE.Vector3(0, 0.7, 0);
const clamp = THREE.MathUtils.clamp;
const sideRotation = { main: Math.PI / 2, kenny: -Math.PI / 2, kop: Math.PI, road: 0 };
const random = (n) => { const a = Math.sin(n * 127.1 + 311.7) * 43758.5453; return a - Math.floor(a); };
const vec = (a) => new THREE.Vector3(a[0], a[1], a[2]);

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...options });
}
function box(group, size, position, mat, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}
function beam(group, a, b, radius, mat, segments = 7) {
  const direction = vec(b).sub(vec(a));
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), mat);
  mesh.position.copy(vec(a).add(vec(b)).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
function labelTexture(text, { color = '#fff', background = '#9f1020', width = 1024, height = 128 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color; ctx.font = `700 ${Math.floor(height * 0.58)}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2, width * 0.91);
  return canvasTexture(canvas);
}
function surfaceLabel(group, text, width, height, position, rotation, options = {}) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({
    map: labelTexture(text, options), roughness: 0.65, side: THREE.DoubleSide,
    emissive: new THREE.Color(options.emissive || '#180204'), emissiveIntensity: 0.2,
  }));
  mesh.position.set(...position); mesh.rotation.set(...rotation); group.add(mesh);
  return mesh;
}
function disposeGroup(group) {
  if (!group) return;
  const materials = new Set(), geometries = new Set(), textures = new Set();
  group.traverse((child) => {
    if (child.geometry) geometries.add(child.geometry);
    for (const mat of Array.isArray(child.material) ? child.material : child.material ? [child.material] : []) {
      materials.add(mat);
      for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose()); textures.forEach((t) => t.dispose()); materials.forEach((m) => m.dispose());
}

// Collapse the static concrete/steel/aisle meshes into a few material batches.
// Seats and people are already instanced; transparent panes and switchable roofs remain separate.
function batchStaticGeometry(group) {
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse((mesh) => {
    if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material) || mesh.material.transparent || mesh.userData.floodlight || mesh.userData.overviewRoof) return;
    // Procedural surfaces and loaded primitives can have different attribute
    // layouts even when their material is shared. Never merge incompatible UVs.
    const schema = Object.keys(mesh.geometry.attributes).sort().map(name => {
      const attribute = mesh.geometry.attributes[name];
      return `${name}:${attribute.itemSize}:${attribute.array.constructor.name}:${attribute.normalized}`;
    }).join('|');
    const key = `${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${schema}`;
    const batch = batches.get(key) || { meshes: [], material: mesh.material, cast: mesh.castShadow, receive: mesh.receiveShadow };
    batch.meshes.push(mesh); batches.set(key, batch);
  });
  for (const batch of batches.values()) {
    if (batch.meshes.length < 3) continue;
    const mixedIndices = batch.meshes.some((mesh) => mesh.geometry.index) && batch.meshes.some((mesh) => !mesh.geometry.index);
    const copies = batch.meshes.map((mesh) => {
      const geometry = mixedIndices && mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(mesh.matrixWorld);
    });
    const geometry = mergeGeometries(copies);
    copies.forEach((copy) => copy.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, batch.material); mesh.castShadow = batch.cast; mesh.receiveShadow = batch.receive;
    const originals = new Set();
    for (const source of batch.meshes) { source.parent.remove(source); originals.add(source.geometry); }
    originals.forEach((original) => original.dispose()); group.add(mesh);
  }
}

function makeGrass() {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const index = (y * canvas.width + x) * 4;
    const stripe = Math.floor(y / (canvas.height / 18)) % 2;
    const fine = random(x * 0.373 + y * 2.312) * 12;
    const blade = random(Math.floor(x / 2) * 2.5 + y * 3.01) * 8;
    data.data[index] = 23 + stripe * 10 + fine;
    data.data[index + 1] = 84 + stripe * 17 + fine + blade;
    data.data[index + 2] = 34 + stripe * 5 + fine * 0.4;
    data.data[index + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return canvasTexture(canvas);
}

function addField(group, mats) {
  const width = VENUE.pitchWidth, length = VENUE.pitchLength;
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(width + 6, length + 7), material('#fff', { map: makeGrass(), roughness: 1 }));
  turf.rotation.x = -Math.PI / 2; turf.position.y = 0.005; turf.receiveShadow = true; group.add(turf);
  box(group, [width + 11, 0.06, length + 13], [0, -0.07, 0], mats.track);
  const white = material('#f2f2db', { roughness: 1 });
  const line = (x, z, w, d) => box(group, [w, 0.012, d], [x, 0.027, z], white);
  line(0, -length / 2, width, 0.1); line(0, length / 2, width, 0.1);
  line(-width / 2, 0, 0.1, length); line(width / 2, 0, 0.1, length); line(0, 0, width, 0.1);
  function circle(x, z, radius, start = 0, arc = Math.PI * 2) {
    const shape = new THREE.TorusGeometry(radius, 0.052, 3, Math.max(20, Math.ceil(96 * arc / (Math.PI * 2))), arc);
    const mesh = new THREE.Mesh(shape, white);
    mesh.rotation.set(-Math.PI / 2, 0, start); mesh.position.set(x, 0.035, z); group.add(mesh);
  }
  circle(0, 0, 9.15);
  function spot(x, z) {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), white);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 0.043, z); group.add(mesh);
  }
  spot(0, 0);
  for (const sign of [-1, 1]) {
    const edge = sign * length / 2;
    for (const [w, d] of [[40.32, 16.5], [18.32, 5.5]]) {
      line(0, edge - sign * d, w, 0.1);
      line(-w / 2, edge - sign * d / 2, 0.1, d); line(w / 2, edge - sign * d / 2, 0.1, d);
    }
    spot(0, edge - sign * 11);
    const zPenalty = edge - sign * 11;
    const arcAngle = Math.acos(5.5 / 9.15);
    circle(0, zPenalty, 9.15, sign > 0 ? Math.PI / 2 - arcAngle : -Math.PI / 2 - arcAngle, arcAngle * 2);
    for (const xsign of [-1, 1]) {
      const cornerX = xsign * width / 2;
      const start = sign > 0 ? (xsign > 0 ? Math.PI / 2 : 0) : (xsign > 0 ? Math.PI : -Math.PI / 2);
      circle(cornerX, edge, 1, start, Math.PI / 2);
      beam(group, [cornerX + xsign * 0.22, 0, edge + sign * 0.22], [cornerX + xsign * 0.22, 1.55, edge + sign * 0.22], 0.027, mats.white);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.29), material('#df1b38', { side: THREE.DoubleSide }));
      flag.position.set(cornerX + xsign * 0.42, 1.4, edge + sign * 0.22); group.add(flag);
    }
    addGoal(group, sign, mats);
  }
}

function addGoal(group, sign, mats) {
  const z = sign * (VENUE.pitchLength / 2 + .07), depth = sign * 2.1;
  for (const x of [-3.66, 3.66]) {
    beam(group, [x, 0.02, z], [x, 2.44, z], 0.061, mats.white, 12);
    beam(group, [x, 2.44, z], [x, 2.44, z + depth], 0.027, mats.white);
    beam(group, [x, 2.44, z + depth], [x, 0.04, z + depth], 0.026, mats.white);
  }
  beam(group, [-3.66, 2.44, z], [3.66, 2.44, z], 0.061, mats.white, 12);
  beam(group, [-3.66, 0.04, z + depth], [3.66, 0.04, z + depth], 0.027, mats.white);
  const positions = [];
  const add = (a, b) => positions.push(...a, ...b);
  for (let x = -3.66; x <= 3.67; x += 0.145) {
    add([x, 0.04, z + depth], [x, 2.44, z + depth]); add([x, 2.44, z], [x, 2.44, z + depth]);
  }
  for (let y = 0.08; y < 2.45; y += 0.145) {
    add([-3.66, y, z + depth], [3.66, y, z + depth]);
    for (const x of [-3.66, 3.66]) add([x, y, z], [x, y, z + depth]);
  }
  for (let dz = 0; dz <= 2.11; dz += 0.145) {
    add([-3.66, 2.44, z + sign * dz], [3.66, 2.44, z + sign * dz]);
    for (const x of [-3.66, 3.66]) add([x, 0.04, z + sign * dz], [x, 2.44, z + sign * dz]);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#d5d5cf', transparent: true, opacity: 0.62 })));
}

function chairGeometry() {
  const geometries = [];
  const seat = new THREE.BoxGeometry(0.43, 0.09, 0.42); seat.translate(0, 0.43, 0.025); geometries.push(seat);
  const back = new THREE.BoxGeometry(0.43, 0.43, 0.08); back.rotateX(-0.12); back.translate(0, 0.71, -0.18); geometries.push(back);
  const geometry = mergeGeometries(geometries); geometries.forEach((g) => g.dispose()); return geometry;
}

function seatLetterCanvas(text) {
  const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 240;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 240);
  ctx.fillStyle = '#fff'; ctx.font = '900 166px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 400, 124, 780);
  return ctx.getImageData(0, 0, 800, 240);
}

function addAdvertising(group, mats) {
  const labels = ['LIVERPOOL FC', 'YOU’LL NEVER WALK ALONE', 'ANFIELD', 'LIVERPOOL FC'];
  for (const side of [-1, 1]) for (let i = 0; i < 8; i++) {
    let start = -45.5 + i * 13 - 6.275, end = start + 12.55;
    // The Main Stand technical area and tunnel require an open sightline.
    if (side < 0) {
      if (start >= -16 && end <= 16) continue;
      if (start < -16 && end > -16) end = -16;
      if (start < 16 && end > 16) start = 16;
    }
    const mesh = surfaceLabel(group, labels[i % labels.length], end - start, 0.84, [side * 35.75, 0.68, (start + end) / 2], [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { background: i % 2 ? '#eef0ee' : '#a61026', color: i % 2 ? '#a51025' : '#fff' });
    mesh.castShadow = true;
  }
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const x = -29 + i * 14.5;
    surfaceLabel(group, labels[i % labels.length], 14.15, 0.84, [x, 0.68, side * 54.4], [0, side > 0 ? Math.PI : 0, 0]);
  }
  // Low pitch-perimeter railing and service walkway.
  for (const sign of [-1, 1]) {
    for (let z = -51; z <= 51; z += 4) beam(group, [sign * 38, 0, z], [sign * 38, 1.08, z], 0.026, mats.rail);
    beam(group, [sign * 38, 1.08, -52], [sign * 38, 1.08, 52], 0.033, mats.rail);
    for (let x = -36; x <= 36; x += 4) beam(group, [x, 0, sign * 57], [x, 1.08, sign * 57], 0.026, mats.rail);
    beam(group, [-36, 1.08, sign * 57], [36, 1.08, sign * 57], 0.033, mats.rail);
  }
}

function makePalettes() {
  return {
    concrete: material('#98978e'), concreteDark: material('#696d70'), track: material('#394043'),
    exterior: material('#717d71'), rail: material('#919d9f', { roughness: 0.45, metalness: 0.7 }),
    roof: material('#b7c2c2', { metalness: 0.4, roughness: 0.64, side: THREE.DoubleSide }),
    roofEdge: material('#56646b', { metalness: 0.55, roughness: 0.6 }),
    red: material('#ffffff', { roughness: 0.51, metalness: 0.05 }),
    white: material('#ededdd', { roughness: 0.55 }), glass: material('#c1dbe8', { roughness: 0.13, metalness: 0.05, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    black: material('#22292d'), brick: material('#81372d'), yellow: material('#dca33a'),
  };
}

export class StadiumViewer {
  constructor(container, { onReady = () => {}, onError = () => {}, onViewChange = () => {} } = {}) {
    this.container = container; this.onReady = onReady; this.onError = onError; this.onViewChange = onViewChange;
    this.sections = SECTIONS; this.overview = true; this.lighting = 'day'; this.crowdVisible = false;
    this.roofMeshes = []; this.roofMaterials = []; this.cutaway = false; this.disposed = false; this.fov = 68; this.yaw = 0; this.pitch = 0;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12; this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.domElement.className = 'stadium-canvas'; this.renderer.domElement.style.touchAction = 'none';
      this.renderer.domElement.setAttribute('aria-label', `${VENUE.nameZh}球场三维视图，拖动查看，滚轮调节视角`);
      container.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog('#b5c9cf', 160, 520);
      this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.055, 1500);
      this.camera.position.set(-180, 142, -190); this.camera.lookAt(TARGET);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.copy(TARGET); this.controls.enableDamping = true; this.controls.dampingFactor = 0.07;
      this.controls.minDistance = 55; this.controls.maxDistance = 420; this.controls.maxPolarAngle = Math.PI / 2.06;
      this.controls.addEventListener('end', () => this.reportView());
      this.setupEnvironment(); this.buildProcedural(); this.installEvents(); this.resize();
      const markerCanvas=document.createElement('canvas'); markerCanvas.width=128; markerCanvas.height=128;
      const markerContext=markerCanvas.getContext('2d');
      markerContext.fillStyle='#bd3440'; markerContext.strokeStyle='#fff'; markerContext.lineWidth=7;
      markerContext.beginPath(); markerContext.arc(64,51,34,0,Math.PI*2); markerContext.fill(); markerContext.stroke();
      markerContext.beginPath(); markerContext.moveTo(49,80); markerContext.lineTo(64,115); markerContext.lineTo(79,80); markerContext.fill();
      markerContext.beginPath(); markerContext.fillStyle='#fff'; markerContext.arc(64,51,10,0,Math.PI*2); markerContext.fill();
      this.positionMarker=new THREE.Sprite(new THREE.SpriteMaterial({map:canvasTexture(markerCanvas),depthTest:false,depthWrite:false}));
      this.positionMarker.scale.set(6,6,1); this.positionMarker.renderOrder=999; this.positionMarker.visible=false; this.scene.add(this.positionMarker);
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
      this.renderer.setAnimationLoop((time) => this.frame(time));
      queueMicrotask(() => { if (!this.disposed) this.onReady({ estimated: true, venue: VENUE }); });
    } catch (error) {
      this.onError(`无法启动三维画面：${error.message || '浏览器没有可用的 WebGL。请启用浏览器硬件加速。'}`);
    }
  }

  setupEnvironment() {
    this.hemisphere = new THREE.HemisphereLight('#d9eafa', '#757454', 2.35); this.scene.add(this.hemisphere);
    this.ambient = new THREE.AmbientLight('#ffffff', 0.34); this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight('#fff3dc', 4.5); this.sun.position.set(-65, 125, 68);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    const largeVenue = VENUE.id !== 'anfield';
    Object.assign(this.sun.shadow.camera, { left: largeVenue ? -130 : -105, right: largeVenue ? 130 : 105, top: largeVenue ? 150 : 120, bottom: largeVenue ? -150 : -120, near: 1, far: 380 });
    this.sun.shadow.bias = -0.00015; this.sun.shadow.normalBias = 0.08; this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#4e91c0') }, horizon: { value: new THREE.Color('#d5e2e6') }, night: { value: 0 } },
      vertexShader: 'varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `
        uniform vec3 top; uniform vec3 horizon; uniform float night; varying vec3 vWorld;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
        float clouds(vec2 p){float v=0.,a=.55;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.1+vec2(11.7,7.3);a*=.5;}return v;}
        void main(){
          vec3 d=normalize(vWorld); float h=clamp(d.y,0.,1.);
          vec3 sky=mix(horizon,top,pow(h,.48));
          float c=smoothstep(.53,.78,clouds(d.xz/max(h+.2,.24)*3.7));
          c*=smoothstep(.015,.15,h)*(1.-night)*.46;
          sky=mix(sky,vec3(.91,.94,.96),c);
          float sun=max(dot(d,normalize(vec3(-65.,125.,68.))),0.);
          sky+=vec3(1.,.78,.49)*(pow(sun,42.)*.15+smoothstep(.9992,.99975,sun)*2.)*(1.-night);
          gl_FragColor=vec4(sky,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(850, 28, 16), skyMaterial); this.scene.add(this.sky);
    this.floodLights = new THREE.Group(); this.scene.add(this.floodLights);
    for (const x of [-42, 42]) for (const z of [-40, 0, 40]) {
      const light = new THREE.SpotLight('#f5f2e7', 0, 220, Math.PI / 2.9, 0.6, 2);
      light.position.set(x, 37, z); light.target.position.set(0, 0, z * 0.35);
      this.scene.add(light.target); this.floodLights.add(light);
    }
  }

  buildProcedural() {
    const previous = this.procedural;
    const group = new THREE.Group(); group.name = `Public-reference procedural ${VENUE.name} reconstruction`;
    this.mats = makePalettes(); this.roofMeshes = []; this.roofMaterials = []; this.campNouGeometry = null; this.bernabeuGeometry = null; this.allianzGeometry = null; this.oldTraffordGeometry = null; this.allianzLightingMaterials = [];
    addField(group, this.mats);
    if (VENUE.id === 'camp-nou') {
      buildCampNou(this, group, { material, box, beam, surfaceLabel, chairGeometry, seatLetterCanvas, random });
    } else if (VENUE.id === 'bernabeu') {
      buildBernabeu(this, group, { material, box, beam, surfaceLabel, chairGeometry, seatLetterCanvas, random });
    } else if (VENUE.id === 'allianz-arena') {
      buildAllianz(this, group, { material, box, beam, surfaceLabel, chairGeometry, seatLetterCanvas, random });
    } else if (VENUE.id === 'old-trafford') {
      buildOldTrafford(this, group, { material, box, beam, surfaceLabel, chairGeometry, seatLetterCanvas, random });
    } else {
      addAdvertising(group, this.mats); this.buildSeating(group); this.buildArchitecture(group);
    }
    this.buildReferencePlayers(group);
    batchStaticGeometry(group);
    this.procedural = group; this.scene.add(group);
    if (previous) { this.scene.remove(previous); disposeGroup(previous); }
    group.visible = !this.importedModel;
    this.setOverview(this.overview, false); this.setLighting(this.lighting);
  }

  position(section, row, seat) {
    const p = getPosition(section, row, seat, 0);
    return p?.position || p;
  }

  buildSeating(group) {
    const chairRecords = [], steps = [], crowd = [];
    const matrices = new THREE.Object3D();
    const letterImages = { kop: seatLetterCanvas('L F C'), main: seatLetterCanvas('LIVERPOOL FC'), road: seatLetterCanvas('ANFIELD') };
    this.standBounds = {};
    for (const section of this.sections) {
      if (!section.side || !section.rows) continue;
      const bounds = this.standBounds[section.side] ||= { min: Infinity, max: -Infinity, near: Infinity, far: 0, high: 0, sections: [] };
      bounds.min = Math.min(bounds.min, section.start); bounds.max = Math.max(bounds.max, section.end); bounds.sections.push(section);
      const width = Math.abs(section.end - section.start);
      const longSide = section.side === 'main' || section.side === 'kenny';
      for (let row = 1; row <= section.rows; row++) {
        const count = getRowSeatCount(section, row);
        if (!count) continue;
        const first = this.position(section, row, 1), last = this.position(section, row, count);
        if (!first || !Number.isFinite(first.y)) continue;
        const center = { x: (first.x + last.x) / 2, y: first.y, z: (first.z + last.z) / 2 };
        const distance = Math.abs(longSide ? center.x : center.z);
        bounds.near = Math.min(bounds.near, distance); bounds.far = Math.max(bounds.far, distance + (section.rowDepth || 0.8)); bounds.high = Math.max(bounds.high, center.y);
        const depth = section.rowDepth || 0.8, rise = Math.max(section.rowRise || 0.12, 0.12);
        steps.push({ size: longSide ? [depth, rise, width] : [width, rise, depth], position: [center.x, center.y - rise / 2 - 0.025, center.z] });
        // Yellow aisle edges, and guard rails in designated safe-standing sections.
        if (row % 4 === 1 && section.type !== 'dugout' && section.type !== 'suite') {
          for (const along of [section.start + 0.1, section.end - 0.1]) {
            box(group, longSide ? [depth, 0.018, 0.085] : [0.085, 0.018, depth], longSide ? [center.x, center.y + 0.002, along] : [along, center.y + 0.002, center.z], this.mats.yellow);
          }
        }
        if (section.type === 'standing') {
          const a = longSide ? [center.x, center.y + 0.94, section.start + 0.3] : [section.start + 0.3, center.y + 0.94, center.z];
          const b = longSide ? [center.x, center.y + 0.94, section.end - 0.3] : [section.end - 0.3, center.y + 0.94, center.z];
          beam(group, a, b, 0.029, this.mats.rail);
          for (let along = section.start + 0.35; along < section.end; along += 2.4) {
            const p = longSide ? [center.x, center.y, along] : [along, center.y, center.z];
            beam(group, p, [p[0], p[1] + 0.94, p[2]], 0.021, this.mats.rail);
          }
        }
        for (let seat = 1; seat <= count; seat++) {
          const p = this.position(section, row, seat); if (!p) continue;
          const n = chairRecords.length;
          const isAccessible = section.type === 'accessible';
          if (isAccessible && seat % 2 === 1) {
            box(group, [0.72, 0.012, 0.9], [p.x, p.y + 0.018, p.z], material('#4b7292'));
            continue;
          }
          let color = new THREE.Color(section.type === 'dugout' ? '#80112a' : '#ae1027').multiplyScalar(0.85 + random(n) * 0.28);
          if (letterImages[section.side] && !['suite', 'dugout', 'accessible'].includes(section.type)) {
            const tier = String(section.tier).toLowerCase();
            const lettering = section.side === 'kop' || tier.includes('upper') || tier === '3' || tier === '2';
            if (lettering) {
              const extent = section.side === 'main' ? 86 : 58;
              const along = longSide ? p.z : p.x;
              // Read left to right from the pitch: Main faces +X, Kop faces -Z.
              const facingAlong = section.side === 'road' ? along : -along;
              const u = Math.floor((facingAlong / extent + 0.5) * 800);
              const letterStart = section.side === 'kop' ? 72.8 : section.side === 'main' ? 78 : 88;
              const letterDepth = section.side === 'kop' ? 16.2 : 11;
              // Canvas Y grows downward; the rear, higher rows form the top of each glyph.
              const v = 239 - Math.floor((distance - letterStart) / letterDepth * 240);
              const data = letterImages[section.side];
              if (u >= 0 && u < 800 && v >= 0 && v < 240 && data.data[(v * 800 + u) * 4] > 128) color.set('#e4e3d7');
            }
          }
          chairRecords.push({ position: p, rotation: sideRotation[section.side], color });
          if (random(n + 189) > 0.14 && !['dugout', 'suite'].includes(section.type)) crowd.push({ position: p, rotation: sideRotation[section.side], seed: n, standing: section.type === 'standing' });
        }
      }
      if (section.type === 'suite') this.buildSuite(group, section);
      if (section.type === 'dugout') this.buildDugout(group, section);
      if (section.type !== 'dugout') this.buildEntrance(group, section);
    }
    const chairs = new THREE.InstancedMesh(chairGeometry(), this.mats.red, chairRecords.length);
    chairs.name = 'Seats mapped from the same selectable section-row-seat coordinates';
    chairRecords.forEach((item, index) => {
      matrices.position.set(item.position.x, item.position.y, item.position.z); matrices.rotation.set(0, item.rotation, 0); matrices.scale.set(1, 1, 1); matrices.updateMatrix();
      chairs.setMatrixAt(index, matrices.matrix); chairs.setColorAt(index, item.color);
    });
    chairs.receiveShadow = true; chairs.computeBoundingSphere(); group.add(chairs);
    const stepMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mats.concrete, steps.length);
    steps.forEach((step, index) => {
      matrices.position.set(...step.position); matrices.rotation.set(0, 0, 0); matrices.scale.set(...step.size); matrices.updateMatrix(); stepMesh.setMatrixAt(index, matrices.matrix);
    });
    stepMesh.receiveShadow = true; stepMesh.castShadow = true; stepMesh.computeBoundingSphere(); group.add(stepMesh);
    this.buildCrowd(group, crowd);
  }

  buildCrowd(group, records) {
    this.crowd = new THREE.Group(); this.crowd.name = 'Optional estimated crowd';
    const torsoGeometry = new THREE.CylinderGeometry(0.13, 0.15, 0.48, 5);
    const headGeometry = new THREE.SphereGeometry(0.105, 6, 4);
    const torso = new THREE.InstancedMesh(torsoGeometry, material('#fff'), records.length);
    const heads = new THREE.InstancedMesh(headGeometry, material('#fff'), records.length);
    const object = new THREE.Object3D();
    const shirts = VENUE.id === 'camp-nou' ? ['#173c77', '#a22847', '#c99b37', '#dfcbb6', '#273550', '#a14455', '#344753'] : VENUE.id === 'bernabeu' ? ['#e5e8ef', '#b4bbca', '#374a72', '#dfcbb6', '#3a4d78', '#d6dbea', '#627ca8'] : VENUE.id === 'allianz-arena' ? ['#ca203a', '#a4152d', '#e0d9d3', '#c9b9af', '#314356', '#d42842', '#697585'] : ['#b71931', '#a71a2f', '#dfcbb6', '#dcd7c9', '#344753', '#263037', '#546377'];
    const skin = ['#c99673', '#bb8058', '#e7b593', '#86563e'];
    records.forEach((record, i) => {
      const p = record.position;
      object.position.set(p.x, p.y + (record.standing ? 1.21 : 0.94), p.z); object.rotation.set(0, record.rotation, 0); object.scale.set(1, record.standing ? 1.45 : 1, 1); object.updateMatrix();
      torso.setMatrixAt(i, object.matrix); torso.setColorAt(i, new THREE.Color(shirts[Math.floor(random(record.seed + 77) * shirts.length)]));
      object.position.y = p.y + (record.standing ? 1.65 : 1.29); object.scale.set(1, 1, 1); object.updateMatrix(); heads.setMatrixAt(i, object.matrix);
      heads.setColorAt(i, new THREE.Color(skin[Math.floor(random(record.seed + 144) * skin.length)]));
    });
    torso.computeBoundingSphere(); heads.computeBoundingSphere(); this.crowd.add(torso, heads); this.crowd.visible = this.crowdVisible; group.add(this.crowd);
    this.crowdRecords = records; this.crowdMeshes = { torso, heads }; this.crowdHidden = [];
    this.updateOwnOccupant();
  }

  updateOwnOccupant() {
    if (!this.crowdMeshes) return;
    const { torso, heads } = this.crowdMeshes, object = new THREE.Object3D();
    const change = (index, hidden) => {
      const record = this.crowdRecords[index], p = record.position;
      object.rotation.set(0, record.rotation, 0);
      object.position.set(p.x, p.y + (record.standing ? 1.21 : 0.94), p.z);
      object.scale.set(hidden ? 0 : 1, hidden ? 0 : record.standing ? 1.45 : 1, hidden ? 0 : 1); object.updateMatrix(); torso.setMatrixAt(index, object.matrix);
      object.position.y = p.y + (record.standing ? 1.65 : 1.29); object.scale.setScalar(hidden ? 0 : 1); object.updateMatrix(); heads.setMatrixAt(index, object.matrix);
    };
    for (const index of this.crowdHidden || []) change(index, false);
    this.crowdHidden = [];
    if (!this.overview && this.seatPosition) this.crowdRecords.forEach((record, index) => {
      const p = record.position;
      if (Math.hypot(p.x - this.seatPosition.x, p.z - this.seatPosition.z) < 0.34 && Math.abs(p.y - this.seatPosition.y) < 2) { change(index, true); this.crowdHidden.push(index); }
    });
    torso.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
  }

  buildSuite(group, section) {
    const middle = (section.start + section.end) / 2;
    const long = section.side === 'main' || section.side === 'kenny';
    const sign = ['main', 'road'].includes(section.side) ? -1 : 1;
    const p = this.position(section, 1, Math.ceil(getRowSeatCount(section, 1) / 2));
    if (!p) return;
    const width = Math.abs(section.end - section.start) - 0.3;
    const back = section.frontDistance + section.rows * section.rowDepth + 1.4;
    box(group, long ? [3.5, 0.25, width] : [width, 0.25, 3.5], long ? [sign * back, p.y + 3, middle] : [middle, p.y + 3, sign * back], this.mats.roofEdge);
    const glassPos = long ? [p.x - sign * 0.5, p.y + 1.5, middle] : [middle, p.y + 1.5, p.z - sign * 0.5];
    box(group, long ? [0.025, 2.4, width] : [width, 2.4, 0.025], glassPos, this.mats.glass);
    for (let along = section.start; along <= section.end; along += 3.5) {
      const point = long ? [glassPos[0], p.y + 0.3, along] : [along, p.y + 0.3, glassPos[2]];
      beam(group, point, [point[0], point[1] + 2.4, point[2]], 0.032, this.mats.roofEdge);
    }
  }

  buildDugout(group, section) {
    const p = this.position(section, 1, Math.ceil(getRowSeatCount(section, 1) / 2)); if (!p) return;
    const width = Math.abs(section.end - section.start) + 0.5;
    const depth = Math.max(section.rows * section.rowDepth + 0.8, 2.2);
    const centerX = p.x - depth * 0.3;
    box(group, [depth, 0.07, width], [centerX, p.y + 2.15, p.z], this.mats.glass, [0, 0, -0.1]);
    for (let z = p.z - width / 2; z <= p.z + width / 2; z += 2.6) beam(group, [centerX - depth / 2, p.y + 2.18, z], [centerX + depth / 2, p.y + 2.04, z], 0.026, this.mats.roofEdge);
    box(group, [0.035, 2, width], [centerX - depth / 2, p.y + 1.1, p.z], this.mats.glass);
    for (const z of [p.z - width / 2, p.z + width / 2]) {
      box(group, [depth, 2, 0.035], [centerX, p.y + 1.1, z], this.mats.glass);
      beam(group, [centerX - depth / 2, p.y, z], [centerX - depth / 2, p.y + 2.2, z], 0.05, this.mats.roofEdge);
    }
    surfaceLabel(group, section.label || 'DUGOUT', width, 0.32, [centerX + depth / 2 + 0.03, p.y + 2, p.z], [0, Math.PI / 2, 0], { background: '#941027' });
    box(group, [2.5, 0.025, width + 1.5], [p.x + 3.2, 0.06, p.z], this.mats.track);
  }

  buildEntrance(group, section) {
    if (section.type === 'suite' || section.type === 'accessible' || section.rows < 8) return;
    const p = this.position(section, Math.max(1, Math.floor(section.rows * 0.72)), 1); if (!p) return;
    const along = section.start + 0.6;
    const long = section.side === 'main' || section.side === 'kenny';
    const x = long ? p.x : along, z = long ? along : p.z;
    box(group, long ? [0.08, 1.8, 1.15] : [1.15, 1.8, 0.08], [x, p.y + 0.8, z], this.mats.black);
    const rotation = long ? [0, sideRotation[section.side], 0] : [0, section.side === 'kop' ? Math.PI : 0, 0];
    const offset = long ? [section.side === 'main' ? 0.055 : -0.055, 0, 0] : [0, 0, section.side === 'kop' ? -0.055 : 0.055];
    surfaceLabel(group, section.id, 1.04, 0.3, [x + offset[0], p.y + 1.87, z + offset[2]], rotation, { background: '#174731' });
  }

  buildArchitecture(group) {
    const exterior = buildAnfieldExterior(group, this.standBounds);
    this.roofMeshes = exterior.roofMeshes; this.roofMaterials = exterior.roofMaterials;
    this.exteriorLandmarks = exterior.landmarks;
    for (const [side, bounds] of Object.entries(this.standBounds)) {
      if (!Number.isFinite(bounds.near)) continue;
      const long = side === 'main' || side === 'kenny', sign = ['main', 'road'].includes(side) ? -1 : 1;
      for (const section of bounds.sections) {
        if (section.type === 'dugout' || section.type === 'suite') continue;
        const p = this.position(section, 1, Math.ceil(getRowSeatCount(section, 1) / 2)); if (!p || p.y < 5) continue;
        const width = Math.abs(section.end - section.start), along = (section.start + section.end) / 2;
        const front = long ? [p.x - sign * 0.36, p.y - 0.45, along] : [along, p.y - 0.45, p.z - sign * 0.36];
        box(group, long ? [0.2, 0.8, width] : [width, 0.8, 0.2], front, this.mats.concreteDark);
        const a = long ? [front[0], p.y + 0.54, section.start] : [section.start, p.y + 0.54, front[2]];
        const b = long ? [front[0], p.y + 0.54, section.end] : [section.end, p.y + 0.54, front[2]];
        beam(group, a, b, 0.024, this.mats.rail);
      }
    }
    // Two corner screens. Avoid invented numerical match data.
    for (const [x, z, yaw, stand] of [[36, -54, -Math.PI / 4, 'road'], [-36, 54, Math.PI * 0.75, 'kop']]) {
      const screen = new THREE.Group(); screen.position.set(x, (this.standBounds[stand]?.high || 24) + 2, z); screen.rotation.y = yaw;
      box(screen, [9.8, 4.7, 0.4], [0, 0, 0], this.mats.black);
      surfaceLabel(screen, 'ANFIELD · LIVERPOOL FC', 9.3, 4.1, [0, 0, 0.22], [0, 0, 0], { width: 1024, height: 448, background: '#101923', color: '#e6eee7', emissive: '#eeeeee' });
      group.add(screen);
    }
    surfaceLabel(group, 'THIS IS ANFIELD', 18, 1.2, [-39.05, 2.15, 0], [0, Math.PI / 2, 0]);
  }

  buildReferencePlayers(group) {
    const points = [[-15, 26], [10, 20], [-22, 0], [16, 1], [3, -26], [-2, 38], [0, -46]];
    points.forEach(([x, z], index) => {
      const player = new THREE.Group(); player.position.set(x, 0.03, z);
      const shirt = material(VENUE.id === 'bernabeu' ? index % 2 ? '#314c78' : '#e7ebf2' : index % 2 ? '#e7ded0' : VENUE.id === 'camp-nou' ? '#183e79' : '#b3172c');
      beam(player, [0, 0.69, 0], [0, 1.34, 0], 0.14, shirt, 7);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6), material('#c79370')); head.position.y = 1.52; player.add(head);
      for (const side of [-1, 1]) {
        beam(player, [side * 0.1, 0.73, 0], [side * 0.15, 0.08, 0], 0.065, shirt);
        beam(player, [side * 0.14, 1.25, 0], [side * 0.23, 0.89, 0], 0.057, material('#c79370'));
        box(player, [0.13, 0.09, 0.24], [side * 0.15, 0.06, 0.03], this.mats.black);
      }
      group.add(player);
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), this.mats.white); ball.position.set(0, 0.13, 0); ball.castShadow = true; group.add(ball);
  }

  installEvents() {
    const canvas = this.renderer.domElement;
    this.listeners = {
      pointerdown: (event) => {
        if (this.overview || event.button > 0) return;
        this.drag = { x: event.clientX, y: event.clientY, id: event.pointerId }; canvas.setPointerCapture(event.pointerId); canvas.style.cursor = 'grabbing';
      },
      pointermove: (event) => {
        if (!this.drag || this.overview) return;
        this.yaw -= (event.clientX - this.drag.x) * 0.004; this.pitch = clamp(this.pitch + (event.clientY - this.drag.y) * 0.004, -1.35, 1.3);
        this.drag.x = event.clientX; this.drag.y = event.clientY; this.applyLook();
      },
      pointerup: () => { this.drag = null; canvas.style.cursor = this.overview ? 'grab' : 'crosshair'; this.reportView(); },
      pointercancel: () => { this.drag = null; },
      wheel: (event) => { if (!this.overview) { event.preventDefault(); this.setFov(this.fov + event.deltaY * 0.035); } },
      webglcontextlost: (event) => { event.preventDefault(); this.onError('三维画面的 WebGL 连接中断，请刷新页面恢复。'); },
    };
    for (const [event, listener] of Object.entries(this.listeners)) canvas.addEventListener(event, listener, { passive: event !== 'wheel' });
  }

  applyLook() {
    const direction = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.lookAt(this.camera.position.clone().add(direction));
  }

  setPosition(position, { animate = true } = {}) {
    if (!this.camera || !position || ![position.x, position.y, position.z].every(Number.isFinite)) { this.onError('座位空间坐标无效。'); return; }
    const previousPosition = this.camera.position.clone();
    this.seatPosition = new THREE.Vector3(position.x, position.y, position.z);
    if(this.positionMarker)this.positionMarker.position.set(position.x,position.y+2.7,position.z);
    this.setOverview(false, false);
    const direction = TARGET.clone().sub(this.seatPosition).normalize();
    this.yaw = Math.atan2(direction.x, direction.z); this.pitch = Math.asin(clamp(direction.y, -1, 1));
    if (animate) { this.camera.position.copy(previousPosition); this.transition = { from: previousPosition, to: this.seatPosition.clone(), start: performance.now(), duration: 850 }; }
    else { this.transition = null; this.camera.position.copy(this.seatPosition); }
    this.applyLook(); this.reportView();
    this.updateOwnOccupant();
  }

  setOverview(value, report = true) {
    if (!this.camera) return;
    this.overview = Boolean(value); this.controls.enabled = this.overview;
    this.exteriorFocusId = null; this.controls.minDistance = 55; this.controls.maxDistance = 420;
    if (this.scene.fog) { this.scene.fog.near = this.overview ? 240 : 160; this.scene.fog.far = this.overview ? 900 : 520; }
    if(this.positionMarker)this.positionMarker.visible=this.overview;
    if (this.overview) {
      this.transition = null;
      if (VENUE.id === 'bernabeu') this.camera.position.set(-192, 169, 204);
      else if (VENUE.id === 'old-trafford') this.camera.position.set(172, 123, -191);
      else if (VENUE.id === 'allianz-arena') this.camera.position.set(179, 136, 185);
      else if (VENUE.id === 'camp-nou') this.camera.position.set(188, 157, 207);
      else this.camera.position.set(-180, 142, -190);
      this.controls.target.copy(TARGET); this.controls.update();
    } else if (this.seatPosition && !this.transition) { this.camera.position.copy(this.seatPosition); this.applyLook(); }
    this.applyCutaway();
    this.renderer.domElement.style.cursor = this.overview ? 'grab' : 'crosshair';
    this.updateOwnOccupant();
    if (report) this.reportView();
  }

  setCutaway(value) { this.cutaway = Boolean(value); this.applyCutaway(); this.reportView(); }
  getExteriorLandmarks() { return (this.exteriorLandmarks || []).map(item=>({...item,position:[...item.position],target:[...item.target],sitePosition:[...item.sitePosition]})); }
  focusExterior(id) {
    if (this.importedModel) return false;
    const destination = this.exteriorLandmarks?.find(item=>item.id===id);
    if (!destination || !this.camera) return false;
    this.overview = true; this.exteriorFocusId = id; this.transition = null; this.controls.enabled = true;
    this.controls.minDistance = 5; this.controls.maxDistance = 130;
    // Consume any pending damping before committing the new stable camera position.
    this.controls.enableDamping = false; this.controls.update();
    this.camera.position.fromArray(destination.position); this.controls.target.fromArray(destination.target); this.controls.update(); this.controls.enableDamping = true;
    if (this.positionMarker) this.positionMarker.visible = false;
    if (this.scene.fog) { this.scene.fog.near = 170; this.scene.fog.far = 650; }
    this.renderer.domElement.style.cursor = 'grab'; this.applyCutaway(); this.updateOwnOccupant(); this.reportView(); return true;
  }
  applyCutaway() {
    const open = this.overview && this.cutaway && !this.exteriorFocusId;
    for (const material of this.roofMaterials || []) {
      material.transparent = open; material.opacity = open ? .13 : 1; material.depthWrite = !open; material.needsUpdate = true;
    }
    for (const mesh of this.roofMeshes || []) mesh.castShadow = !open;
  }

  setLighting(mode) {
    if (!this.scene) return;
    this.lighting = mode === 'night' ? 'night' : 'day'; const night = this.lighting === 'night';
    this.sun.intensity = night ? 0.045 : 4.5; this.hemisphere.intensity = night ? 0.35 : 2.35;
    this.ambient.intensity = night ? 0.18 : 0.34; this.renderer.toneMappingExposure = night ? 1 : 1.12;
    this.sky.material.uniforms.top.value.set(night ? '#040c1d' : '#4e91c0');
    this.sky.material.uniforms.horizon.value.set(night ? '#25354f' : '#d5e2e6');
    this.sky.material.uniforms.night.value = night ? 1 : 0;
    this.scene.fog.color.set(night ? '#101b2d' : '#b5c9cf');
    this.floodLights.children.forEach((light) => { light.intensity = night ? 2500 : 0; });
    this.procedural?.traverse((mesh) => { if (mesh.userData.floodlight) mesh.material.emissiveIntensity = night ? 5 : 0.28; });
    for (const item of this.allianzLightingMaterials || []) {
      item.material.color.set(night ? item.nightColor : item.dayColor);
      item.material.emissive.set(night ? item.nightEmissive : '#000000');
      item.material.emissiveIntensity = night ? item.intensity : 0;
    }
  }

  setCrowd(value) { this.crowdVisible = Boolean(value); if (this.crowd) this.crowd.visible = this.crowdVisible; }
  setFov(value) { if (!this.camera) return; this.fov = clamp(Number(value) || 68, 30, 100); this.camera.fov = this.fov; this.camera.updateProjectionMatrix(); this.reportView(); }
  resetView() { this.setFov(68); if (!this.overview && this.seatPosition) this.setPosition(this.seatPosition, { animate: false }); else this.setOverview(true); }
  setGeometry(data) { this.sections = Array.isArray(data) ? data : data?.sections || SECTIONS; if (this.scene) this.buildProcedural(); }

  async loadModel(fileOrUrl) {
    if (!this.scene) throw new Error('三维画面尚未初始化。');
    try {
      let buffer;
      if (typeof fileOrUrl === 'string') {
        if (!/\.glb(?:[?#].*)?$/i.test(fileOrUrl) && !fileOrUrl.startsWith('blob:')) throw new Error('请选择自包含的 .glb 文件；不支持引用外部贴图的 .gltf。');
        const response = await fetch(fileOrUrl); if (!response.ok) throw new Error(`模型下载失败（HTTP ${response.status}）。`); buffer = await response.arrayBuffer();
      } else if (fileOrUrl?.arrayBuffer) { buffer = await fileOrUrl.arrayBuffer(); }
      else throw new Error('请选择 .glb 文件或提供可访问的 GLB 地址。');
      const view = new DataView(buffer);
      if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) throw new Error('文件不是有效的 GLB 模型。');
      const jsonLength = view.getUint32(12, true);
      if (jsonLength + 20 > buffer.byteLength) throw new Error('GLB 文件不完整。');
      const description = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).replace(/\u0000+$/, '').trim());
      if (description.extensionsUsed?.some((extension) => ['KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(extension))) throw new Error('当前预览器不支持 Draco / Meshopt 压缩，请解压并导出普通 GLB。');
      for (const resource of [...(description.buffers || []), ...(description.images || [])]) {
        if (resource.uri && !resource.uri.startsWith('data:')) throw new Error('GLB 引用了外部文件，请先在建模软件中嵌入全部贴图与缓冲区再导出。');
      }
      const gltf = await new GLTFLoader().parseAsync(buffer, '');
      const imported = gltf.scene; const bounds = new THREE.Box3().setFromObject(imported);
      if (bounds.isEmpty() || !Number.isFinite(bounds.max.y)) { disposeGroup(imported); throw new Error('模型没有可显示的三维几何。'); }
      imported.name = 'Imported self-contained GLB';
      imported.traverse((child) => { if (child.isMesh) { child.receiveShadow = true; child.castShadow = true; } });
      if (this.disposed) { disposeGroup(imported); return; }
      // Commit only after validation and loading have finished successfully.
      const previous = this.importedModel; this.scene.add(imported); this.importedModel = imported; this.procedural.visible = false;
      if (previous) { this.scene.remove(previous); disposeGroup(previous); }
      this.reportView();
      return { bounds: bounds.getSize(new THREE.Vector3()).toArray(), centered: bounds.getCenter(new THREE.Vector3()).toArray() };
    } catch (error) {
      const message = `模型未切换：${error.message || '无法解码模型。压缩 GLB 需要先解压导出，远程地址需允许跨域访问。'}`;
      this.onError(message); throw new Error(message);
    }
  }

  useProceduralModel() {
    if (!this.scene) return;
    if (this.importedModel) { this.scene.remove(this.importedModel); disposeGroup(this.importedModel); this.importedModel = null; }
    this.procedural.visible = true; this.reportView();
  }

  screenshot() { if (!this.renderer) return null; this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }
  resize() {
    if (!this.renderer) return;
    const width = Math.max(1, this.container.clientWidth), height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false);
  }
  reportView() { if (this.camera) this.onViewChange({ overview: this.overview, exteriorFocusId: this.exteriorFocusId || null, cutaway: this.cutaway, fov: this.fov, position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }, yaw: this.yaw, pitch: this.pitch, model: this.importedModel ? 'imported' : 'procedural' }); }
  frame(time) {
    if (this.disposed || !this.renderer) return;
    if (!this.container.clientWidth || !this.container.clientHeight) return;
    if (this.transition) {
      const progress = clamp((time - this.transition.start) / this.transition.duration, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      this.camera.position.lerpVectors(this.transition.from, this.transition.to, eased); this.applyLook();
      if (progress === 1) { this.transition = null; this.reportView(); }
    } else if (this.overview) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true; this.resizeObserver?.disconnect(); this.controls?.dispose();
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      for (const [event, listener] of Object.entries(this.listeners || {})) this.renderer.domElement.removeEventListener(event, listener);
      disposeGroup(this.scene); this.renderer.dispose(); this.renderer.domElement.remove();
    }
  }
}
