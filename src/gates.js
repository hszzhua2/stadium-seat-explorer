import * as THREE from 'three';

// Identifiable entrance features reconstructed from public photographs and LFC's
// 2025/26 visitor map. Dimensions, local placement and turnstile layout are estimates.
// These short railings do not imply a continuous boundary around the urban stadium.
const UP = new THREE.Vector3(0, 1, 0);
const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .65, ...options });

function box(group, size, at, material, name = '') {
  const geometry = new THREE.BoxGeometry(...size);
  if (material.userData.proceduralBrick) {
    const positions=geometry.attributes.position,normals=geometry.attributes.normal,uvs=geometry.attributes.uv;
    for(let i=0;i<positions.count;i++) uvs.setXY(i,(Math.abs(normals.getX(i))>.5?positions.getZ(i):positions.getX(i))/.88,positions.getY(i)/4.48);
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...at); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = name; group.add(mesh); return mesh;
}
function beam(group, start, end, radius, material) {
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), material);
  mesh.position.copy(a.add(b).multiplyScalar(.5)); mesh.quaternion.setFromUnitVectors(UP, direction.normalize()); mesh.castShadow = true; group.add(mesh); return mesh;
}
function ring(group, radius, tube, at, material, arc = Math.PI * 2, rotationZ = 0) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 5, Math.max(12, Math.round(32 * arc / (Math.PI * 2))), arc), material);
  mesh.position.set(...at); mesh.rotation.z = rotationZ; mesh.castShadow = true; group.add(mesh); return mesh;
}
function curve(group, points, radius, material) {
  const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(18, points.length * 4), radius, 5, false), material);
  mesh.castShadow = true; group.add(mesh); return mesh;
}
function text(group, words, size, at, color = '#d6ba78', background = null) {
  const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, 1536, 256); }
  else ctx.clearRect(0, 0, 1536, 256);
  ctx.font = '700 151px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(words, 768, 142, 1485);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), mat('#fff', { map: texture, transparent: !background, alphaTest: .05, depthWrite: Boolean(background), side: THREE.DoubleSide, roughness: .45 }));
  mesh.position.set(...at); group.add(mesh); return mesh;
}
function pickets(group, startX, endX, y, height, z, material, spacing = .18, radius = .018) {
  const count = Math.max(2, Math.floor((endX - startX) / spacing) + 1);
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 5);
  const mesh = new THREE.InstancedMesh(geometry, material, count), object = new THREE.Object3D();
  mesh.userData.gateBar={radius,height};
  for (let i = 0; i < count; i++) { object.position.set(THREE.MathUtils.lerp(startX, endX, i / (count - 1)), y + height / 2, z); object.updateMatrix(); mesh.setMatrixAt(i, object.matrix); }
  mesh.castShadow = true; mesh.computeBoundingSphere(); group.add(mesh); return mesh;
}
function fence(group, start, end, height, materials) {
  box(group,[end-start,.6,.5],[(start+end)/2,.24,0],materials.brick);
  box(group,[end-start+.1,.1,.62],[(start+end)/2,.59,0],materials.stone);
  pickets(group, start, end, .65, height-.48, 0, materials.iron, .17, .02);
  for (const y of [.73, height + .12]) beam(group, [start, y, 0], [end, y, 0], .035, materials.iron);
  for (let x = start; x <= end + .01; x += 2.7) {
    box(group, [.075, height + .25, .075], [x, height / 2 + .1, 0], materials.iron);
    const finial = new THREE.Mesh(new THREE.ConeGeometry(.065, .2, 5), materials.iron); finial.position.set(x, height + .32, 0); group.add(finial);
  }
}
function bird(group, at, color, scale = 1) {
  // A simplified metal Liver bird silhouette, not a copied bitmap of the club crest.
  const shape = new THREE.Shape();
  const points = [[-.06,-.45],[-.15,-.12],[-.39,.15],[-.57,.46],[-.18,.25],[.02,.41],[.04,.7],[.19,.78],[.42,.72],[.19,.64],[.18,.4],[.46,.2],[.53,-.06],[.29,.04],[.17,-.21],[.21,-.45],[.37,-.5],[.03,-.5],[-.01,-.2],[-.07,-.2],[-.09,-.5],[-.34,-.5]];
  points.forEach(([x,y],index) => index ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .07, bevelEnabled: true, bevelSize: .016, bevelThickness: .015, bevelSegments: 1, steps: 1 }), color);
  mesh.position.set(...at); mesh.scale.setScalar(scale); mesh.castShadow = true; group.add(mesh); return mesh;
}
function pillar(group, x, materials, paisley = false) {
  const height=paisley?3.68:4.28;
  box(group, [.88, height, .9], [x, height/2, 0], materials.brick);
  box(group, [1.05, .17, 1.06], [x, height+.04, 0], materials.stone);
  box(group, [1.02, .18, 1.02], [x, .04, 0], materials.stone);
  if (paisley) {
    box(group, [.61, .91, .075], [x, 1.84, .5], materials.bronze);
    text(group, x < 0 ? 'BOB PAISLEY' : 'LFC HONOURS', [.57,.15], [x, 1.95, .548], '#e0c098');
    text(group, x < 0 ? '1919 — 1996' : 'EUROPEAN CUPS', [.55,.11], [x, 1.73, .548], '#d3b891');
  }
}
function gateLeaves(group, width, materials, paisley = false) {
  for (const sign of [-1, 1]) {
    const pivot=sign*(width/2-.12),leaf=new THREE.Group(),content=new THREE.Group();content.position.x=-pivot;leaf.position.x=pivot;leaf.add(content);group.add(leaf);
    if(!paisley&&sign<0)leaf.rotation.y=-.42;
    const start = sign < 0 ? -width / 2 + .12 : .08, end = sign < 0 ? -.08 : width / 2 - .12;
    pickets(content, start, end, .17, 3.07, .06, materials.iron, .15, .019);
    for (const y of [.24, 1.05, 3.24]) beam(content, [start,y,.06], [end,y,.06], .043, materials.iron);
    for (const x of [start,end]) beam(content, [x,.2,.06], [x,3.3,.06], .048, materials.iron);
    if(!paisley)for(let y=.45;y<3.23;y+=.24)beam(content,[start,y,.06],[end,y,.06],.013,materials.iron);
    const center = (start + end) / 2;
    if (!paisley) {
      ring(content, .48, .023, [center,1.63,.09], materials.iron);
      for (const dy of [-.38,.38]) ring(content, .22, .021, [center + sign * .48,1.62 + dy,.09], materials.iron, Math.PI * 1.7, -Math.PI * .3);
      for (const dx of [-.4,.4]) curve(content, [[center + dx,2.74,.1],[center + dx * 1.7,2.38,.1],[center + dx * .8,2.12,.1],[center + dx * .3,2.42,.1]], .023, materials.iron);
    } else {
      for(let y=.35;y<3.16;y+=.27)for(const x of [start+.16,end-.16])ring(content,.11,.018,[x,y,.1],materials.iron);
    }
    for (const y of [.58,2.63]) box(content, [.17,.18,.16], [sign * (width / 2 - .03),y,.075], materials.bronze);
  }
  box(group, [.31,.12,.16], [0,1.34,.16], materials.iron);
  box(group, [.13,.17,.085], [0,1.18,.23], materials.bronze);
}
function cup(group, x, y, materials, scale = 1) {
  const profile = [[.16,0],[.13,.15],[.1,.22],[.16,.32],[.23,.5],[.27,.74]].map(([r,h]) => new THREE.Vector2(r,h));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 12), materials.silver); body.position.set(x,y,0); body.scale.setScalar(scale); body.castShadow = true; group.add(body);
  for (const sign of [-1,1]) {
    const handle = ring(group, .24 * scale, .037 * scale, [x + sign * .28 * scale,y + .47 * scale,0], materials.silver);
    handle.scale.x = .7;
  }
  beam(group, [x,y,0], [x,y - .18 * scale,0], .073 * scale, materials.silver);
  box(group, [.45 * scale,.07 * scale,.25 * scale], [x,y - .21 * scale,0], materials.silver);
}
function rose(group, x, y, materials) {
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(.105, 7, 5), materials.rose); petal.position.set(x + Math.cos(angle) * .09,y + Math.sin(angle) * .09,.02); petal.scale.z = .45; group.add(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(.062,7,5), materials.gold); center.position.set(x,y,.066); group.add(center);
}

function shankly(group, materials) {
  const width = 7.6;
  pillar(group,-width/2-.55,materials); pillar(group,width/2+.55,materials);
  gateLeaves(group,width,materials);
  beam(group,[-width/2,3.76,0],[width/2,3.76,0],.055,materials.iron);
  beam(group,[-width/2,4.28,0],[width/2,4.28,0],.055,materials.iron);
  for (let x = -3.4; x <= 3.4; x += .58) {
    const y = 4.36 + .27 * Math.sin((x+width/2) / width * Math.PI);
    ring(group,.22,.021,[x,y,0],materials.iron);
    ring(group,.15,.018,[x+.14,y+.26,0],materials.gold,Math.PI*1.65,.35);
  }
  text(group,'YOU’LL NEVER WALK ALONE',[7.35,.4],[0,4.03,.11]);
  bird(group,[0,5.02,-.035],materials.gold,.62);
  ring(group,.35,.025,[0,4.95,-.015],materials.gold);
  fence(group,-11.3,-4.9,2.06,materials); fence(group,4.9,11.3,2.06,materials);
  box(group,[23,.12,3.4],[0,-.065,0],materials.paving);
}
function paisley(group, materials) {
  const width = 5.4;
  pillar(group,-width/2-.5,materials,true); pillar(group,width/2+.5,materials,true);
  gateLeaves(group,width,materials,true);
  const points = [];
  for (let i=0;i<=24;i++) points.push([-width/2 + i*width/24,3.54 + .53*Math.sin(i*Math.PI/24),0]);
  curve(group,points,.064,materials.iron);
  curve(group,points.map(([x,y,z])=>[x,y-.49,z]),.04,materials.iron);
  text(group,'PAISLEY',[2.27,.32],[-1.38,3.67,.1],'#d2b267');
  text(group,'GATEWAY',[2.32,.32],[1.38,3.67,.1],'#d2b267');
  for (const x of [-3.2,0,3.2]) {
    const y=x===0?4.22:3.96;cup(group,x,y,materials,.72);
    for(const dx of [-.49,.49])beam(group,[x+dx,y-.22,0],[x+dx,y+.77,0],.037,materials.iron);
    for(const dy of [-.22,.77])beam(group,[x-.49,y+dy,0],[x+.49,y+dy,0],.037,materials.iron);
  }
  for (const x of [-2.4,-1.93,1.93,2.4]) rose(group,x,4.05,materials);
  // Colour cues documented in the historic gateway description.
  const shield = new THREE.Shape(); shield.moveTo(-.44,.49); shield.lineTo(.44,.49); shield.lineTo(.38,-.23); shield.lineTo(0,-.55); shield.lineTo(-.38,-.23); shield.closePath();
  const geometry=new THREE.ExtrudeGeometry(shield,{depth:.055,bevelEnabled:false});
  const emblem = new THREE.Mesh(geometry,materials.hettonBlue); emblem.position.set(-1.35,1.69,.12); group.add(emblem);
  const whiteShield=new THREE.Mesh(geometry.clone(),materials.ivory);whiteShield.position.set(1.35,1.69,.12);group.add(whiteShield);
  text(group,'HETTON',[.69,.14],[-1.35,1.82,.19],'#dce4dd');
  text(group,'LE HOLE',[.58,.105],[-1.35,1.49,.19],'#dce4dd');
  bird(group,[1.35,1.7,.19],materials.rose,.58);
  for(const x of [-1.35,1.35])for(const [dx,dy]of [[-.58,0],[.58,0],[0,.65],[0,-.65]]){const ball=new THREE.Mesh(new THREE.SphereGeometry(.075,7,5),materials.silver);ball.position.set(x+dx,1.69+dy,.15);group.add(ball);}
  fence(group,-8.4,-3.8,1.78,materials); fence(group,3.8,8.4,1.78,materials);
  box(group,[17.2,.12,3.4],[0,-.065,0],materials.paving);
}

function turnstile(group, x, materials) {
  // A full-height cage has visible depth and a central, three-armed rotor.
  const cage = new THREE.Group(); cage.position.set(x,0,.52);
  const count = 14, radius = .59;
  const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(.019,.019,2.13,5),materials.steel,count);
  bars.userData.gateBar={radius:.019,height:2.13};
  const object = new THREE.Object3D();
  for(let i=0;i<count;i++){const angle=.55+i*(Math.PI*2-1.1)/(count-1);object.position.set(Math.sin(angle)*radius,1.16,Math.cos(angle)*radius);object.updateMatrix();bars.setMatrixAt(i,object.matrix);}
  bars.castShadow=true;bars.computeBoundingSphere();cage.add(bars);
  for (const y of [.25,1.3,2.23]) { const band=ring(cage,.59,.031,[0,y,0],materials.steel,Math.PI*2-1.1,.55);band.rotation.x=Math.PI/2; }
  beam(cage,[0,.11,0],[0,2.29,0],.06,materials.steel);
  for (let level=0;level<4;level++)for(let i=0;i<3;i++){const angle=i*Math.PI*2/3;beam(cage,[0,.44+level*.44,0],[Math.sin(angle)*.5,.44+level*.44,Math.cos(angle)*.5],.027,materials.steel);}
  box(cage,[.16,.32,.26],[.8,1.15,.44],materials.reader);
  const redOval=new THREE.Mesh(new THREE.SphereGeometry(.08,8,6),materials.rose);redOval.position.set(.8,1.11,.58);redOval.scale.set(.74,1.14,.07);cage.add(redOval);
  const led=box(cage,[.075,.08,.015],[.8,1.26,.58],materials.greenLed);led.castShadow=false;
  group.add(cage);
}
function queueRail(group, x, fromZ, toZ, materials) {
  for(const z of [fromZ,(fromZ+toZ)/2,toZ]) beam(group,[x,.04,z],[x,1.03,z],.036,materials.steel);
  beam(group,[x,1.03,fromZ],[x,1.03,toZ],.034,materials.steel);
  beam(group,[x,.43,fromZ],[x,.43,toZ],.024,materials.steel);
}
function ticketBank(parent, at, yaw, standName, letters, materials) {
  const group = new THREE.Group(); group.name = `${standName}-ticket-entry`; group.position.set(...at); group.rotation.y = yaw;
  box(group,[10.8,.15,7.4],[0,-.05,2.6],materials.paving);
  box(group,[9.8,2.94,.09],[0,1.47,-.76],materials.recess,'Doorway recess');
  for(const x of [-4.7,-1.55,1.55,4.7]) box(group,[.17,3.23,.44],[x,1.58,-.49],materials.doorFrame);
  box(group,[9.6,.22,.76],[0,3.22,-.33],materials.doorFrame);
  text(group,standName.toUpperCase(),[8.8,.45],[0,3.68,-.1],'#e9e4d6','#79332b');
  for (let i=0;i<3;i++) {
    const x=(i-1)*3.1; turnstile(group,x,materials);
    text(group,letters[i] || letters[letters.length-1],[.58,.52],[x,2.89,-.15],'#eee9dc','#172a2e');
    queueRail(group,x-.75,1.75,5.3,materials); queueRail(group,x+.75,1.75,5.3,materials);
    // Hinged, framed side leaf with hinges and a latch, rather than a flat black square.
    box(group,[.055,2.15,.09],[x+1.28,1.13,.05],materials.iron);
    pickets(group,x+.87,x+1.39,.17,1.99,.06,materials.iron,.13,.014);
    for(const y of [.23,1.06,2.19]) beam(group,[x+.87,y,.06],[x+1.39,y,.06],.025,materials.iron);
    box(group,[.12,.13,.13],[x+.9,1.08,.14],materials.bronze);
  }
  parent.add(group); return group;
}
function landmark(id,label,group,height=2.8,distance=18) {
  group.updateMatrixWorld(true);
  return { id,label,position:group.localToWorld(new THREE.Vector3(2.2,3.7,distance)).toArray(),target:group.localToWorld(new THREE.Vector3(0,height,.15)).toArray(),sitePosition:group.position.toArray() };
}

function batchGateBars(parent) {
  // Only this module's explicitly marked bars are collected: never seats, trees or crowd.
  parent.updateMatrixWorld(true);const toParent=parent.matrixWorld.clone().invert(),sets=new Map(),sources=[];
  parent.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.userData.gateBar)sources.push(mesh);});
  const instance=new THREE.Matrix4(),matrix=new THREE.Matrix4(),scale=new THREE.Matrix4();
  for(const source of sources){
    const records=sets.get(source.material)||[];
    const {radius,height}=source.userData.gateBar;scale.makeScale(radius,height,radius);
    for(let i=0;i<source.count;i++){source.getMatrixAt(i,instance);matrix.copy(toParent).multiply(source.matrixWorld).multiply(instance).multiply(scale);records.push(matrix.clone());}
    sets.set(source.material,records);
  }
  for(const [material,records]of sets){
    const combined=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,5),material,records.length);
    combined.name='Batched gate and fence pickets';combined.userData.gateBarAggregated=true;
    records.forEach((matrix,index)=>combined.setMatrixAt(index,matrix));combined.castShadow=true;combined.computeBoundingSphere();parent.add(combined);
  }
  for(const source of sources){source.parent.remove(source);source.geometry.dispose();source.dispose();}
}

function brickMaterial() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#66534a';ctx.fillRect(0,0,256,256);
  for(let row=0;row<64;row++)for(let col=-1;col<5;col++){const t=(Math.sin(row*23.1+col*5.71)+1)*8;ctx.fillStyle=`rgb(${143+t},${67+t*.7},${45+t*.5})`;ctx.fillRect(col*64+(row%2)*32+.5,row*4+.35,63,3.3);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;
  const material=mat('#fff',{map:texture,bumpMap:texture,bumpScale:.013,roughness:.91});material.userData.proceduralBrick=true;return material;
}

export function buildGatesAndFences(parent,envelopes) {
  const materials={
    iron:mat('#20272b',{metalness:.73,roughness:.48}),steel:mat('#849496',{metalness:.77,roughness:.38}),
    gold:mat('#bb984b',{metalness:.8,roughness:.38}),silver:mat('#c4cdcc',{metalness:.85,roughness:.26}),bronze:mat('#98754a',{metalness:.75,roughness:.55}),
    brick:brickMaterial(),stone:mat('#c6bb9e'),rose:mat('#a92235',{roughness:.57}),hettonBlue:mat('#264b85',{metalness:.25}),ivory:mat('#e6e7d9'),
    paving:mat('#999a91'),recess:mat('#101a20'),doorFrame:mat('#a52331',{metalness:.35}),reader:mat('#a8acad',{metalness:.5}),greenLed:mat('#65aa86',{emissive:'#479e73',emissiveIntensity:.55}),
  };
  const landmarks=[];
  const kenny=envelopes.kenny,kop=envelopes.kop;
  if(kenny&&kop){
    const gate=new THREE.Group();gate.name='Shankly Gates · estimated position';
    // Approximate placement at the Road/Kenny corner, outside both seating footprints.
    gate.position.set(kenny.far-2.5,0,-kenny.half-15);gate.rotation.y=Math.PI;shankly(gate,materials);parent.add(gate);
    landmarks.push(landmark('shankly','Shankly Gates · 香克利大门',gate,2.65,11));
    const gateway=new THREE.Group();gateway.name='Paisley Gateway · estimated position';gateway.position.set(8.6,0,kop.far+9.2);paisley(gateway,materials);parent.add(gateway);
    landmarks.push(landmark('paisley','Paisley Gateway · 派斯利大门',gateway,2.5,9));
  }
  const configs=[
    ['main','主看台检票口','MAIN STAND',-Math.PI/2,[[-28,['S','T','T']],[28,['V','V','W']]]],
    ['kenny','肯尼看台检票口','SIR KENNY DALGLISH STAND',Math.PI/2,[[-26,['K','J','J']],[28,['H','G','G']]]],
    ['kop','Kop 看台检票口','THE KOP',0,[[-25,['C','C','C']],[26,['D','D','D']]]],
    ['road','安菲尔德路看台检票口','ANFIELD ROAD STAND',Math.PI,[[-17,['Q','P','O']],[22,['N','N','M']]]],
  ];
  for(const [side,label,english,yaw,banks]of configs){
    const env=envelopes[side];if(!env)continue;
    banks.forEach(([along,letters],index)=>{
      const group=ticketBank(parent,env.point(env.far+3.15,0,along),yaw,english,letters,materials);
      if(index===0)landmarks.push(landmark(`${side}-entry`,label,group,1.8,13));
    });
  }
  batchGateBars(parent);
  return {landmarks};
}
