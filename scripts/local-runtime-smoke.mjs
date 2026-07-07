#!/usr/bin/env node
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createApp } from "../apps/api/dist/app.js";

const rootDir = resolve(import.meta.dirname, "..");
const webDistDir = resolve(rootDir, "apps/web/dist");

async function main() {
  const apiServer = await listen(createApp());
  const webServer = await listen(createStaticServer(webDistDir));

  try {
    const apiBaseUrl = localUrl(apiServer);
    const webBaseUrl = localUrl(webServer);

    const health = await fetchJson(`${apiBaseUrl}/healthz`);
    assertEqual(health.service, "tax-lien-api", "API health service");
    assertEqual(health.status, "ok", "API health status");

    const missing = await fetch(`${apiBaseUrl}/definitely-not-a-real-route`);
    assertEqual(missing.status, 404, "API unknown route status");
    const missingBody = await missing.json();
    assertEqual(missingBody.error?.code, "route_not_found", "API unknown route error code");

    const indexResponse = await fetch(`${webBaseUrl}/`);
    assertEqual(indexResponse.status, 200, "web index status");
    const html = await indexResponse.text();
    if (!html.includes('<div id="root"></div>')) {
      throw new Error("web index is missing the React root element");
    }

    const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/gu)].map((match) => match[1]);
    if (assetPaths.length === 0) {
      throw new Error("web index did not reference built JS/CSS assets");
    }

    for (const assetPath of assetPaths) {
      const assetUrl = new URL(assetPath, webBaseUrl);
      const assetResponse = await fetch(assetUrl);
      assertEqual(assetResponse.status, 200, `web asset status for ${assetPath}`);
    }

    console.log(`local runtime smoke passed: api=${apiBaseUrl} web=${webBaseUrl}`);
  } finally {
    await close(apiServer);
    await close(webServer);
  }
}

function createStaticServer(directory) {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://localhost");
      const filePath = resolveStaticPath(directory, requestUrl.pathname);
      const body = await readFile(filePath);
      response.writeHead(200, { "content-type": contentType(filePath) });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found");
    }
  });
}

function resolveStaticPath(directory, pathname) {
  const rawPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(rawPath);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.(?:\/|\\|$))+/u, "");
  const fullPath = resolve(directory, `.${sep}${normalizedPath}`);

  if (!fullPath.startsWith(`${directory}${sep}`) && fullPath !== directory) {
    throw new Error("static path escaped web dist directory");
  }

  return fullPath;
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function listen(server) {
  return new Promise((resolveListen, reject) => {
    const httpServer = server.listen(0, "127.0.0.1", () => {
      httpServer.off("error", reject);
      resolveListen(httpServer);
    });
    httpServer.once("error", reject);
  });
}

function close(server) {
  return new Promise((resolveClose, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolveClose();
    });
  });
}

function localUrl(server) {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("server did not expose a TCP address");
  }
  return `http://127.0.0.1:${address.port}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`expected ${url} to return 2xx, got ${response.status}`);
  }
  return response.json();
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`local runtime smoke failed: ${message}`);
  process.exit(1);
});
