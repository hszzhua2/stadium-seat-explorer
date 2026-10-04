import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createAppServer } from '../server.mjs';
import { VENUE, VENUES, SECTIONS, SECTION_BY_ID, setActiveVenue, getPosition } from '../src/seat-data.js';
import { VENUE_UI } from '../src/venue-ui.js';

const [html, appSource] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
]);
const importMap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { agent: false }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function mountSite(t, prefix) {
  const app = createAppServer();
  // A Pages project exposes only its own folder. Requests escaping it return
  // 404, so an accidental root-relative resource cannot pass this fixture.
  const server = http.createServer((req, res) => {
    if (!req.url.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
    req.url = '/' + req.url.slice(prefix.length);
    app.emit('request', req, res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return new URL(`http://127.0.0.1:${server.address().port}${prefix}`);
}

function localUrl(value, page, base) {
  const result = new URL(value, page);
  assert.equal(result.origin, base.origin, value);
  assert.ok(result.pathname.startsWith(base.pathname), `${value} escapes ${base.pathname}`);
  return result;
}

function resolveImport(specifier, module, page, base) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return localUrl(specifier, module, base);
  const key = Object.keys(importMap).sort((a, b) => b.length - a.length).find(key => specifier === key || key.endsWith('/') && specifier.startsWith(key));
  assert.ok(key, `unmapped module ${specifier}`);
  return localUrl(importMap[key] + specifier.slice(key.length), page, base);
}

function functionSource(name) {
  const start = appSource.indexOf(`function ${name}(`);
  const lineEnd = appSource.indexOf('\n', start);
  if (start >= 0 && appSource.slice(start, lineEnd).trimEnd().endsWith('}')) return appSource.slice(start, lineEnd);
  const end = appSource.indexOf('\n}', start) + 2;
  assert.ok(start >= 0 && end > start, `missing app handler ${name}`);
  return appSource.slice(start, end);
}

function documentFixture(page) {
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) {
      const element = { dataset: {}, setAttribute() {}, querySelector: selector => node(key + selector) };
      let href;
      Object.defineProperty(element, 'href', { set(value) { href = new URL(value, page).href; }, get() { return href; } });
      nodes.set(key, element);
    }
    return nodes.get(key);
  };
  node('coordinate-sample').href = html.match(/id="coordinate-sample" href="([^"]+)"/)[1];
  return { node, document: { body: { dataset: {} }, querySelector: node, querySelectorAll: () => [] } };
}

for (const prefix of ['/', '/stadium-seat-explorer/']) {
  test(`static assets, five venue links and deep links stay inside ${prefix}`, async t => {
    const base = await mountSite(t, prefix);
    t.after(() => setActiveVenue('anfield'));
    for (const entry of ['', 'index.html?venue=old-trafford&section=OT-DUG-A&row=3&seat=8']) {
      const page = new URL(entry, base), response = await request(page);
      assert.equal(response.status, 200); assert.match(response.type, /^text\/html/);
      for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
        if (/^(?:https?:|data:|#)/.test(match[1])) continue;
        const resource = localUrl(match[1], page, base);
        assert.equal((await request(resource)).status, 200, resource.href);
      }
      const queue = [localUrl(html.match(/<script type="module" src="([^"]+)"/)[1], page, base)], visited = new Set();
      while (queue.length) {
        const module = queue.pop(); if (visited.has(module.href)) continue; visited.add(module.href);
        const response = await request(module); assert.equal(response.status, 200, module.href); assert.match(response.type, /^text\/javascript/);
        for (const dependency of response.body.matchAll(/(?:^|\n)\s*(?:import|export)\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]/g)) queue.push(resolveImport(dependency[1], module, page, base));
      }
      assert.ok([...visited].some(url => url.endsWith('/vendor/three/addons/loaders/GLTFLoader.js')));
      assert.ok([...visited].some(url => url.endsWith('/src/old-trafford.js')));

      for (const venue of VENUES) {
        setActiveVenue(venue.id);
        const { node, document } = documentFixture(page);
        const configure = new Function('document', '$', 'VENUE', 'SECTIONS', 'venueUI', 'SECTION_BY_ID', 'getPosition', 'modelLabel', `return (${functionSource('configureVenue')});`);
        configure(document, node, VENUE, SECTIONS, VENUE_UI[venue.id], SECTION_BY_ID, getPosition, 'test')();
        const home = localUrl(node('.brand').href, page, base);
        assert.equal(home.searchParams.get('venue'), venue.id); assert.equal(home.pathname, page.pathname);
        assert.equal((await request(home)).status, 200);
        const sample = localUrl(node('coordinate-sample').href, page, base), sampleResponse = await request(sample);
        assert.equal(sampleResponse.status, 200); assert.match(sampleResponse.type, /^application\/json/);
        const data = JSON.parse(sampleResponse.body); assert.equal(data.version, 1);
        if (data.venueId) assert.equal(data.venueId, venue.id);

        const state = { section: SECTION_BY_ID.get(venue.defaultSection), row: 1, seat: 1, lighting: 'night', posture: 'standing' };
        let shared;
        const sync = new Function('VENUE', 'state', 'history', 'location', `return (${functionSource('syncUrl')});`);
        sync(VENUE, state, { replaceState(_data, _title, url) { shared = localUrl(url, page, base); } }, page)();
        assert.equal(shared.pathname, page.pathname); assert.equal(shared.searchParams.get('venue'), venue.id);
        assert.equal(shared.searchParams.get('section'), venue.defaultSection); assert.equal(shared.searchParams.get('light'), 'night');
        assert.equal((await request(shared)).status, 200);
        const selected = VENUES.find(other => other.id !== venue.id); let switchHandler, switched;
        node('venue-select').value = selected.id; node('venue-select').addEventListener = (_event, handler) => { switchHandler = handler; };
        const start = appSource.indexOf("$('venue-select').addEventListener('change',()=>{");
        const registration = appSource.slice(start, appSource.indexOf('\n});', start) + 4);
        new Function('$', 'location', 'VENUES', 'VENUE', 'state', registration)(node, { href: page.href, assign(url) { switched = localUrl(url, page, base); } }, VENUES, VENUE, state);
        switchHandler(); assert.equal(switched.pathname, page.pathname); assert.equal(switched.searchParams.get('venue'), selected.id);
        assert.equal(switched.searchParams.get('light'), 'night'); assert.equal(switched.searchParams.has('section'), false);
        assert.equal((await request(switched)).status, 200);
      }
    }
  });
}
