// Serves the released theme files over the LAN, so a phone can install them.
//
//   npm run serve            # http://<your-ip>:8099/
//   npm run serve -- 9000    # another port
//
// Why: Revenge (and Vencord's mobile relatives) install a theme from a URL, and a
// private GitHub repo has no raw URL a phone can read. This serves the same files
// from the machine that already has them — no public mirror, no token, no account.
//
// Only read-only GET/HEAD is handled, only files inside this repo are served, and
// only the release artifacts (*.theme.css, *-Revenge.json) plus an index page are
// reachable. Nothing leaves the LAN.

import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, sep } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] ?? process.env.PORT ?? 8099);

const MIME = {
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
};

function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      out.push({ name, address: addr.address });
    }
  }
  // Prefer the ranges a phone on the same Wi-Fi will reach.
  const rank = (ip) => (/^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3);
  return out.sort((a, b) => rank(a.address) - rank(b.address));
}

/** Theme folders: anything with a package.json beside it. */
function themeDirs() {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && existsSync(join(root, d.name, "package.json")))
    .map((d) => d.name)
    .sort();
}

/** Only the release artifacts are reachable; source, tests and docs are not. */
function releases() {
  const out = [];
  for (const theme of themeDirs()) {
    for (const file of readdirSync(join(root, theme))) {
      if (file.endsWith("-Revenge.json")) out.push({ theme, kind: "mobile", file: `${theme}/${file}` });
      else if (file.endsWith(".theme.css")) out.push({ theme, kind: "desktop", file: `${theme}/${file}` });
    }
  }
  return out;
}

const page = (items, host) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Discord themes — LAN</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 22px; font: 16px/1.5 system-ui, sans-serif; background: #040614; color: #a8e3d3; }
  h1 { font-size: 20px; color: #c9f0e4; margin: 0 0 4px; }
  p { color: #4f9a87; margin: 0 0 18px; }
  h2 { font-size: 13px; letter-spacing: .1em; text-transform: uppercase; color: #4f9a87; margin: 22px 0 8px; }
  a { display: block; padding: 12px 14px; margin-bottom: 8px; border: 1px solid #1d3f37;
      border-radius: 8px; color: #c9f0e4; text-decoration: none; background: #0f111a; }
  a small { display: block; color: #4f9a87; font-size: 12px; margin-top: 2px; word-break: break-all; }
  code { color: #c9f0e4; }
</style></head><body>
<h1>Discord themes</h1>
<p>Tap a file, then copy its URL into the client. Revenge wants the <code>-Revenge.json</code> link.</p>
${items
  .map(
    (group) => `<h2>${group.theme}</h2>
${group.items
  .map(
    (item) =>
      `<a href="/${item.file}">${item.file.split("/").pop()}<small>${host}/${item.file}</small></a>`,
  )
  .join("\n")}`,
  )
  .join("\n")}
<p style="margin-top:24px">Served from this machine over the local network. Stop it with Ctrl-C.</p>
</body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }
  const items = releases();
  const host = req.headers.host ?? "localhost";

  if (url === "/" || url === "/index.html") {
    const groups = [...new Set(items.map((i) => i.theme))].map((theme) => ({
      theme,
      items: items.filter((i) => i.theme === theme),
    }));
    res.writeHead(200, { "content-type": MIME[".html"] });
    res.end(req.method === "HEAD" ? undefined : page(groups, `http://${host}`));
    return;
  }

  // Path traversal guard: resolve, then require the result to stay inside root.
  const target = normalize(join(root, url));
  if (!target.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  const allowed = items.some((i) => join(root, i.file) === target);
  if (!allowed || !existsSync(target)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not a released theme file\n");
    return;
  }
  const body = readFileSync(target);
  res.writeHead(200, {
    "content-type": MIME[target.slice(target.lastIndexOf("."))] ?? "application/octet-stream",
    "content-length": body.length,
    "cache-control": "no-store",
  });
  res.end(req.method === "HEAD" ? undefined : body);
});

const addrs = lanAddresses();
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving ${releases().length} theme files from ${root}\n`);
  console.log("Open this on the phone (same Wi-Fi):\n");
  for (const { name, address } of addrs) console.log(`  http://${address}:${port}/   (${name})`);
  if (addrs.length === 0) console.log("  no LAN address found — is this machine online?");
  console.log("\nRevenge needs the .json URL:");
  for (const { address } of addrs.slice(0, 1)) {
    for (const item of releases().filter((i) => i.kind === "mobile")) {
      console.log(`  http://${address}:${port}/${item.file}`);
    }
  }
  console.log("\nCtrl-C to stop.");
});
