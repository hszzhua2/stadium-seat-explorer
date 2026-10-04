import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleOverview } from '../src/google-overview.js';
import { GEO_REFERENCE, CAMP_NOU_GEO_REFERENCE, BERNABEU_GEO_REFERENCE, ALLIANZ_GEO_REFERENCE, OLD_TRAFFORD_GEO_REFERENCE, localToGeographic } from '../src/georeference.js';

// Deliberately offline SDK/DOM doubles: never request Google or use a real key.
function fixture(configuration = {}) {
  const timers = new Map();
  const scripts = [];
  const maps = [];
  const markers = [];
  let nextTimer = 0;
  const scope = {
    setTimeout(callback, milliseconds) { const id = ++nextTimer; timers.set(id, { callback, milliseconds }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = { defaultView: scope };
  class Element extends EventTarget {
    constructor() { super(); this.ownerDocument = document; this.style = {}; this.children = []; this.parent = null; }
    appendChild(child) { this.children.push(child); child.parent = this; return child; }
    remove() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
  }
  document.createElement = tag => { assert.equal(tag, 'script'); const script = new Element(); scripts.push(script); return script; };
  document.head = new Element();
  class Map3DElement extends Element {
    constructor(options) { super(); this.options = options; this.flights = []; maps.push(this); }
    flyCameraTo(options) { this.flights.push(options); }
  }
  class Marker3DElement extends Element {
    constructor(options) { super(); Object.assign(this, options); markers.push(this); }
  }
  const library = { Map3DElement, Marker3DElement };
  const status = [], failures = [];
  const container = new Element();
  const view = new GoogleOverview(container, { ...configuration, onStatus: message => status.push(message), onError: message => failures.push(message) });
  async function initialize(importer = async name => { assert.equal(name, 'maps3d'); return library; }) {
    scope.google = { maps: { importLibrary: importer } };
    const callback = new URL(scripts.at(-1).src).searchParams.get('callback');
    await scope[callback]();
  }
  function expireTimers() { for (const [id, timer] of [...timers]) { timers.delete(id); timer.callback(); } }
  return { view, scope, document, container, scripts, maps, markers, status, failures, timers, library, initialize, expireTimers };
}

test('a missing key or an unopened component cannot contact Google', async () => {
  const f = fixture();
  assert.equal(f.scripts.length, 0);
  f.view.setPosition({ lat: 53.43, lng: -2.96, altitude: 15 }, 'L5');
  for (const key of [undefined, '', '   ', 'contains whitespace']) await assert.rejects(f.view.load(key), /请输入/);
  assert.equal(f.scripts.length, 0);
  assert.equal(f.timers.size, 0);
  f.view.dispose();
});

test('one SDK/map serves repeat activation and many seats without another billed map construction', async () => {
  const f = fixture();
  f.view.setPosition({ lat: 53.431, lng: -2.9604, altitude: 15.5 }, 'L5 / 2 / 8');
  const pending = f.view.load('OFFLINE_TEST_KEY');
  const concurrent = f.view.load('OFFLINE_TEST_KEY');
  assert.equal(f.scripts.length, 1);
  const url = new URL(f.scripts[0].src);
  assert.equal(url.origin + url.pathname, 'https://maps.googleapis.com/maps/api/js');
  assert.equal(url.searchParams.get('v'), 'weekly');
  assert.equal(url.searchParams.get('loading'), 'async');
  assert.equal(url.searchParams.get('libraries'), 'maps3d');
  await f.initialize();
  const map = await pending;
  assert.equal(await concurrent, map);
  assert.equal(await f.view.load('OFFLINE_TEST_KEY'), map);
  for (let index = 0; index < 40; index += 1) f.view.setPosition({ lat: 53.4308 + index * .000001, lng: -2.9608, altitude: index }, `座位 ${index}`);
  assert.equal(f.maps.length, 1);
  assert.equal(f.markers.length, 1);
  assert.match(f.markers[0].label, /估算位置/);
  assert.equal(f.markers[0].altitudeMode, 'RELATIVE_TO_GROUND');
  assert.equal(f.markers[0].position.altitude, 39);
  assert.equal(map.options.mode, 'SATELLITE');
  assert.deepEqual(map.options.center, { lat: GEO_REFERENCE.lat, lng: GEO_REFERENCE.lng, altitude: 0 });
  assert.equal(map.options.range, 650);
  assert.equal(map.options.heading, 315);
  assert.equal(map.options.defaultUIHidden, undefined, 'Google UI and attribution are not hidden');
  assert.equal(map.flights[0].endCamera.altitudeMode, 'CLAMP_TO_GROUND');
  assert.equal(map.flights[0].endCamera.center.altitude, 0);
  assert.deepEqual(map.flights[0].endCamera.center, map.options.center);
  assert.equal(map.flights[0].durationMillis, 0);
  assert.match(f.status.at(-1), /组件已初始化/);
  assert.doesNotMatch(f.status.at(-1), /实景已验证|瓦片已验证/);
  f.view.setVisible(false); assert.equal(map.style.display, 'none');
  f.view.setVisible(true); assert.equal(map.style.display, 'block');
  await assert.rejects(f.view.load('OTHER_OFFLINE_KEY'), /刷新/);
  assert.equal(f.scripts.length, 1);
  const steady = new Event('gmp-steadychange'); steady.isSteady = true; map.dispatchEvent(steady);
  assert.equal(f.timers.size, 0);
  const priorFailures = f.failures.length;
  f.view.dispose();
  map.dispatchEvent(new Event('gmp-error'));
  assert.equal(f.failures.length, priorFailures, 'disposed listeners do not report errors');
  assert.equal(f.container.children.length, 0);
  assert.equal(f.scope.gm_authFailure, undefined);
  assert.ok(f.scope.google.maps, 'dispose leaves the shared SDK intact');
});

test('an SDK network failure clears callbacks and can retry a fresh key', async () => {
  const f = fixture();
  const pending = f.view.load('FIRST_OFFLINE_KEY');
  const callback = new URL(f.scripts[0].src).searchParams.get('callback');
  f.scripts[0].onerror(new Error('secret raw URL')); // Never emitted to caller.
  await assert.rejects(pending, /无法加载/);
  assert.equal(f.document.head.children.length, 0);
  assert.equal(f.scope[callback], undefined);
  assert.equal(f.scope.gm_authFailure, undefined);
  assert.equal(f.timers.size, 0);
  const retry = f.view.load('SECOND_OFFLINE_KEY');
  await f.initialize();
  await retry;
  assert.equal(f.scripts.length, 2);
  assert.equal(f.maps.length, 1);
  assert.ok(f.failures.every(message => !message.includes('OFFLINE_KEY') && !message.includes('secret raw URL')));
  f.view.dispose();
});

test('SDK load timeout releases a clean failed request; imagery timeout stays readable', async () => {
  const f = fixture();
  const pending = f.view.load('OFFLINE_TEST_KEY');
  assert.equal([...f.timers.values()][0].milliseconds, 30_000);
  f.expireTimers();
  await assert.rejects(pending, /30 秒/);
  assert.equal(f.document.head.children.length, 0);
  const retry = f.view.load('OFFLINE_TEST_KEY');
  await f.initialize(); await retry;
  f.expireTimers();
  assert.match(f.failures.at(-1), /影像 30 秒/);
  assert.equal(f.maps.length, 1);
  f.view.dispose();
});

test('partial SDK failures, auth and map errors never expose a key or silently switch projects', async () => {
  const f = fixture();
  let originalAuthCalled = 0;
  const originalAuth = () => { originalAuthCalled += 1; };
  f.scope.gm_authFailure = originalAuth;
  const pending = f.view.load('PRIVATE_OFFLINE_KEY');
  await f.initialize(async () => { throw new Error('https://maps.googleapis.com?key=PRIVATE_OFFLINE_KEY'); });
  await assert.rejects(pending, error => !error.message.includes('PRIVATE_OFFLINE_KEY'));
  assert.equal(f.scope.gm_authFailure, originalAuth);
  await assert.rejects(f.view.load('CHANGED_OFFLINE_KEY'), /刷新/);
  assert.equal(f.scripts.length, 1);
  f.view.dispose();

  const g = fixture();
  g.scope.gm_authFailure = originalAuth;
  const ready = g.view.load('PRIVATE_OFFLINE_KEY');
  await g.initialize(); await ready;
  g.scope.gm_authFailure();
  assert.equal(originalAuthCalled, 1);
  assert.match(g.failures.at(-1), /授权失败/);
  await assert.rejects(g.view.load('PRIVATE_OFFLINE_KEY'), /授权失败/);
  assert.equal(g.maps.length, 1);
  g.view.dispose();
  assert.equal(g.scope.gm_authFailure, originalAuth);

  const early = fixture();
  const earlyPending = early.view.load('PRIVATE_OFFLINE_KEY');
  early.scope.gm_authFailure();
  await assert.rejects(earlyPending, /授权失败/);
  assert.equal(early.maps.length, 0);
  assert.equal(early.document.head.children.length, 0);
  assert.equal(early.scope.gm_authFailure, undefined);
  assert.equal(early.timers.size, 0);
  early.view.dispose();

  const h = fixture();
  const mapReady = h.view.load('PRIVATE_OFFLINE_KEY');
  await h.initialize(); await mapReady;
  h.maps[0].dispatchEvent(new Event('gmp-error'));
  assert.match(h.failures.at(-1), /初始化失败/);
  assert.equal(h.timers.size, 0);
  h.view.dispose();
});

test('disposing during SDK load never constructs a late map; invalid markers preserve the old point', async () => {
  const f = fixture();
  const pending = f.view.load('OFFLINE_TEST_KEY');
  f.view.dispose();
  await f.initialize();
  await assert.rejects(pending, /已关闭/);
  assert.equal(f.maps.length, 0);
  assert.equal(f.scope.gm_authFailure, undefined);
  assert.equal(f.timers.size, 0);
  const g = fixture();
  const ready = g.view.load('OFFLINE_TEST_KEY');
  await g.initialize(); await ready;
  const old = g.markers[0].position;
  for (const point of [{ lat: NaN, lng: 0 }, { lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: 0, lng: 0, altitude: Infinity }]) assert.throws(() => g.view.setPosition(point, 'bad'), /有效经纬度/);
  assert.deepEqual(g.markers[0].position, old);
  g.view.dispose();
});

test('a configured Camp Nou overview keeps its own centre, marker name and reset view after seat changes', async () => {
  const center = { lat: CAMP_NOU_GEO_REFERENCE.lat, lng: CAMP_NOU_GEO_REFERENCE.lng, altitude: 0 };
  const venue = { name: '诺坎普球场', center: { ...center }, heading: 225, range: 750, tilt: 59 };
  const f = fixture({ venue });
  assert.equal(f.scripts.length, 0, 'venue configuration alone does not request Google');
  // Copy the supplied configuration: later changes cannot make initialisation
  // and reset point at different stadiums.
  venue.name = 'changed'; venue.center.lat = GEO_REFERENCE.lat; venue.range = 999;
  const pending = f.view.load('OFFLINE_CAMP_KEY');
  await f.initialize();
  const map = await pending;
  assert.deepEqual(map.options.center, center);
  assert.equal(map.options.heading, 225);
  assert.equal(map.options.range, 750);
  assert.equal(map.options.tilt, 59);
  assert.equal(f.markers[0].label, '诺坎普球场 · 估算位置');
  assert.deepEqual(f.markers[0].position, center);
  assert.ok(f.status.every(message => message.includes('诺坎普球场') && !message.includes('安菲尔德')));

  const seat = localToGeographic({ x: -40, y: 18.5, z: 12 }, CAMP_NOU_GEO_REFERENCE);
  f.view.setPosition(seat, 'Tribuna / 12 / 8');
  assert.deepEqual(f.markers[0].position, seat);
  assert.equal(f.markers[0].label, 'Tribuna / 12 / 8 · 估算位置');
  f.view.resetView();
  assert.deepEqual(map.flights.at(-1), {
    endCamera: { center, altitudeMode: 'CLAMP_TO_GROUND', heading: 225, tilt: 59, range: 750 },
    durationMillis: 0,
  });
  assert.deepEqual(f.markers[0].position, seat, 'reset changes only the camera, retaining the selected seat');
  f.view.setPosition();
  assert.deepEqual(f.markers[0].position, center, 'an omitted point returns the venue marker');
  assert.equal(f.markers[0].label, '诺坎普球场 · 估算位置');
  assert.equal(await f.view.load('OFFLINE_CAMP_KEY'), map);
  assert.equal(f.maps.length, 1);
  assert.equal(f.markers.length, 1);
  assert.equal(f.scripts.length, 1);
  f.view.dispose();
});

test('configured centre altitude is relative marker height while reset clamps the overview focus to ground', async () => {
  const f = fixture({ venue: { name: '测试球场', center: { lat: 41.38, lng: 2.12, altitude: 30 }, heading: -45 } });
  const pending = f.view.load('OFFLINE_TEST_KEY');
  await f.initialize(); const map = await pending;
  assert.equal(map.options.heading, 315);
  assert.equal(f.markers[0].position.altitude, 30);
  assert.equal(f.markers[0].altitudeMode, 'RELATIVE_TO_GROUND');
  assert.equal(map.flights[0].endCamera.center.altitude, 0);
  assert.equal(map.flights[0].endCamera.altitudeMode, 'CLAMP_TO_GROUND');
  assert.equal(map.flights[0].endCamera.range, 650, 'partial camera settings retain defaults');
  f.view.dispose();
});

test('invalid venue configuration is rejected before any Google request', () => {
  const f = fixture();
  const valid = { name: '诺坎普球场', center: { lat: 41.38, lng: 2.12 } };
  for (const venue of [null, {}, { ...valid, name: '' }, { ...valid, center: { lat: 91, lng: 2.12 } }, { ...valid, heading: NaN }, { ...valid, range: 0 }, { ...valid, range: Infinity }, { ...valid, tilt: 91 }]) {
    assert.throws(() => new GoogleOverview(f.container, { venue }), error => error.code === 'INVALID_VENUE');
  }
  assert.equal(f.scripts.length, 0);
  assert.equal(f.timers.size, 0);
  f.view.dispose();
});

test('each of five stadium pages uses its own Google centre and resets to that venue after seat changes', async () => {
  for(const [name,reference,range] of [['安菲尔德',GEO_REFERENCE,650],['诺坎普',CAMP_NOU_GEO_REFERENCE,750],['伯纳乌',BERNABEU_GEO_REFERENCE,750],['安联球场',ALLIANZ_GEO_REFERENCE,750],['老特拉福德',OLD_TRAFFORD_GEO_REFERENCE,750]]){
    const center={lat:reference.lat,lng:reference.lng,altitude:0};
    const f=fixture({venue:{name,center,heading:315,tilt:62,range}});
    assert.equal(f.scripts.length,0,'a venue change and configuration alone cannot contact Google');
    const ready=f.view.load('OFFLINE_MULTI_VENUE_KEY');await f.initialize();const map=await ready;
    assert.deepEqual(map.options.center,center);assert.equal(map.options.range,range);
    assert.equal(f.markers[0].label,name+' · 估算位置');
    assert.ok(f.status.every(message=>message.includes(name)));
    const seat=localToGeographic({x:-40,y:26.15,z:14},reference);
    f.view.setPosition(seat,name+' / 2 / 4');f.view.resetView();
    assert.deepEqual(f.markers[0].position,seat,'reset preserves the selected relative-ground eye position');
    assert.deepEqual(map.flights.at(-1).endCamera,{center,altitudeMode:'CLAMP_TO_GROUND',heading:315,tilt:62,range});
    assert.equal(await f.view.load('OFFLINE_MULTI_VENUE_KEY'),map);
    assert.equal(f.maps.length,1);assert.equal(f.markers.length,1);assert.equal(f.scripts.length,1);
    f.view.setPosition();assert.deepEqual(f.markers[0].position,center);assert.equal(f.markers[0].label,name+' · 估算位置');
    f.view.dispose();assert.equal(f.container.children.length,0);assert.equal(f.scope.gm_authFailure,undefined);
  }
});
