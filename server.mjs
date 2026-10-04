import http from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

export const APP_ROOT = dirname(fileURLToPath(import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

function isWithin(root, candidate) {
  const difference = relative(root, candidate);
  return difference === '' || (!difference.startsWith('..') && !isAbsolute(difference));
}

function reply(req, res, status, message, headers = {}) {
  const body = Buffer.from(message);
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

/** An offline static server. Importing this module does not start a listener. */
export function createAppServer({ root = APP_ROOT } = {}) {
  const absoluteRoot = resolve(root);
  const canonicalRoot = realpath(absoluteRoot);
  return http.createServer(async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      reply(req, res, 405, 'Only GET and HEAD are supported.', { Allow: 'GET, HEAD' });
      return;
    }

    // Do not let URL normalization erase a traversal before checking it.
    let pathname;
    try {
      const encodedPath = (req.url || '/').split(/[?#]/, 1)[0];
      if (!encodedPath.startsWith('/')) {
        reply(req, res, 400, 'Invalid request path.');
        return;
      }
      pathname = decodeURIComponent(encodedPath);
      if (pathname.includes('\0')) throw new URIError('NUL in path');
    } catch {
      reply(req, res, 400, 'Malformed percent-encoded path.');
      return;
    }

    const segments = pathname.replaceAll('\\', '/').split('/');
    if (segments.some(segment => segment.startsWith('.') || segment.includes(':'))) {
      reply(req, res, 403, 'This path is not accessible.');
      return;
    }

    if (pathname === '/api/health') {
      reply(req, res, 200, JSON.stringify({ ok: true, app: 'anfield-seat-explorer' }), {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return;
    }

    const requestedPath = pathname === '/' ? 'index.html' : segments.join('/').replace(/^\/+/, '');
    const candidate = resolve(absoluteRoot, requestedPath);
    if (!isWithin(absoluteRoot, candidate)) {
      reply(req, res, 403, 'This path is outside the application directory.');
      return;
    }

    try {
      const finalPath = await realpath(candidate);
      if (!isWithin(await canonicalRoot, finalPath)) {
        reply(req, res, 403, 'This path is outside the application directory.');
        return;
      }
      const file = await stat(finalPath);
      if (!file.isFile()) {
        reply(req, res, 404, 'File not found.');
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[extname(finalPath).toLowerCase()] || 'application/octet-stream',
        'Content-Length': file.size,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      const stream = createReadStream(finalPath);
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        reply(req, res, 404, 'File not found.');
      } else if (error.code === 'EACCES' || error.code === 'EPERM') {
        reply(req, res, 403, 'This file is not accessible.');
      } else {
        reply(req, res, 500, 'Unable to read the requested file.');
      }
    }
  });
}

export function parseOptions(args) {
  const options = { host: '127.0.0.1', port: 5173, open: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--open') options.open = true;
    else if (arg === '--port') {
      const value = args[++index];
      if (!value || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
        throw new Error('--port 必须为 1–65535 之间的整数。');
      }
      options.port = Number(value);
    } else if (arg === '--host') {
      const value = args[++index];
      if (!value || !/^[a-zA-Z0-9.:[\]-]+$/.test(value)) {
        throw new Error('--host 必须是有效的主机名或 IP 地址。');
      }
      options.host = value.replace(/^\[|\]$/g, '');
    } else if (arg === '--help' || arg === '-h') options.help = true;
    else throw new Error(`未知参数：${arg}`);
  }
  return options;
}

function openBrowser(url) {
  let child;
  if (process.platform === 'win32') {
    child = spawn('cmd.exe', ['/c', 'start', '', url], {
      windowsHide: true, detached: true, stdio: 'ignore',
    });
  } else {
    child = spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], {
      detached: true, stdio: 'ignore',
    });
  }
  child.on('error', () => console.warn(`浏览器未能自动打开，请手动访问 ${url}`));
  child.unref();
}

async function main() {
  let options;
  try {
    options = parseOptions(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (options.help) {
    console.log('用法：node server.mjs [--port 5173] [--host 127.0.0.1] [--open]');
    return;
  }
  const server = createAppServer();
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`端口 ${options.port} 已被占用。请关闭已有服务，或执行 start.cmd -Port ${options.port + 1 <= 65535 ? options.port + 1 : 5174} 使用另一端口。`);
    } else {
      console.error(`服务启动失败：${error.message}`);
    }
    process.exitCode = 1;
  });
  server.listen(options.port, options.host, () => {
    const browserHost = options.host === '0.0.0.0' ? '127.0.0.1' : options.host === '::' ? '[::1]' : options.host.includes(':') ? `[${options.host}]` : options.host;
    const url = `http://${browserHost}:${options.port}/`;
    console.log(`球场座位视野服务已启动（安菲尔德 / 诺坎普 / 伯纳乌 / 安联 / 老特拉福德）：${url}`);
    console.log('保持此窗口打开；按 Ctrl+C 停止服务。');
    if (options.open) openBrowser(url);
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main();
}
