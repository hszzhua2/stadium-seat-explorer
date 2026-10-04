import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, writeFile, mkdir, rm, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createAppServer, parseOptions } from '../server.mjs';

function request(port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

test('offline static service and request boundaries', async t => {
  const fixture = await mkdtemp(join(tmpdir(), 'anfield-server-test-'));
  const root = join(fixture, 'site');
  await mkdir(root);
  await mkdir(join(root, 'folder'));
  await mkdir(join(root, '.private'));
  await writeFile(join(root, 'index.html'), '<!doctype html><title>安菲尔德</title>');
  await writeFile(join(root, 'main.js'), 'export const x = 1;');
  await writeFile(join(root, 'model.glb'), new Uint8Array([103, 108, 84, 70]));
  await writeFile(join(root, 'hello world.txt'), 'A file with spaces');
  await writeFile(join(root, '.env'), 'not available');
  await writeFile(join(root, '.private', 'readme.txt'), 'not available');
  await writeFile(join(fixture, 'secret.txt'), 'outside root');
  const server = createAppServer({ root });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    const cleanupPath = await realpath(fixture);
    assert.equal(dirname(cleanupPath), await realpath(tmpdir()), 'cleanup stays in the OS temporary directory');
    assert.match(basename(cleanupPath), /^anfield-server-test-/);
    await rm(cleanupPath, { recursive: true, force: true });
  });
  const port = server.address().port;

  await t.test('root HTML, MIME, spaces and query strings', async () => {
    const index = await request(port, '/');
    assert.equal(index.status, 200);
    assert.match(index.headers['content-type'], /^text\/html/);
    assert.match(index.body, /安菲尔德/);
    assert.equal(Number(index.headers['content-length']), Buffer.byteLength(index.body));
    assert.equal((await request(port, '/main.js')).headers['content-type'], 'text/javascript; charset=utf-8');
    assert.equal((await request(port, '/model.glb')).headers['content-type'], 'model/gltf-binary');
    assert.equal((await request(port, '/hello%20world.txt?v=1')).body, 'A file with spaces');
  });

  await t.test('HEAD gives GET metadata and no body', async () => {
    const head = await request(port, '/', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body, '');
    assert.ok(Number(head.headers['content-length']) > 0);
  });

  await t.test('health API and unsupported methods', async () => {
    const health = await request(port, '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.body), { ok: true, app: 'anfield-seat-explorer' });
    assert.match(health.headers['content-type'], /^application\/json/);
    assert.equal((await request(port, '/api/health', 'HEAD')).body, '');
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await request(port, '/', method);
      assert.equal(response.status, 405);
      assert.equal(response.headers.allow, 'GET, HEAD');
    }
  });

  await t.test('directories and missing files are not listed', async () => {
    for (const path of ['/folder', '/folder/', '/missing.txt']) {
      const response = await request(port, path);
      assert.equal(response.status, 404, path);
      assert.doesNotMatch(response.body, /hello world|\.env/);
    }
  });

  await t.test('malformed percent encoding and NUL fail cleanly', async () => {
    for (const path of ['/bad%ZZ', '/bad%E0%A4%A', '/%00index.html']) {
      assert.equal((await request(port, path)).status, 400, path);
    }
    assert.equal((await request(port, '/')).status, 200, 'service remains usable');
  });

  await t.test('traversal, Windows separators and hidden files are refused', async () => {
    for (const path of [
      '/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt',
      '/%5c..%5csecret.txt', '/C:%5cWindows', '/.env', '/%2eenv',
      '/.private/readme.txt', '/folder/../index.html',
    ]) {
      assert.equal((await request(port, path)).status, 403, path);
    }
  });

  await t.test('a symlink cannot expose files outside the application root', async () => {
    try {
      await symlink(fixture, join(root, 'outside'), process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') return t.skip('OS does not permit a test symlink');
      throw error;
    }
    assert.equal((await request(port, '/outside/secret.txt')).status, 403);
  });

  await t.test('an occupied CLI port gives an actionable message and exits', async () => {
    await assert.rejects(
      promisify(execFile)(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url)), '--port', String(port)], { timeout: 5000 }),
      error => error.code === 1 && /端口.*已被占用/.test(error.stderr) && /-Port/.test(error.stderr),
    );
    assert.equal((await request(port, '/api/health')).status, 200);
  });
});

test('CLI options reject invalid ports and unsafe host strings', () => {
  assert.deepEqual(parseOptions([]), { host: '127.0.0.1', port: 5173, open: false });
  assert.deepEqual(parseOptions(['--port', '6020', '--host', 'localhost', '--open']), { host: 'localhost', port: 6020, open: true });
  assert.equal(parseOptions(['--host', '[::1]']).host, '::1');
  for (const args of [['--port', '0'], ['--port', '65536'], ['--port', '1.5'], ['--port'], ['--host'], ['--host', 'a & calc'], ['--unknown']]) {
    assert.throws(() => parseOptions(args));
  }
});
