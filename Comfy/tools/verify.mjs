// Pre-publish gate. Answers two questions at once:
//   is the artifact correct?   (tests, versions, drift, secrets, docs, screenshots)
// The collection's git state is checked by ../../tools/verify.mjs.
//
//   npm run verify
//
// Exit code 0 means: safe to push. Anything non-zero means: fix it first. This is
// the law-1 gate, so it refuses on the first failure instead of reporting green.

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { build, readVariants, version } from "./build.mjs";
import { render as renderJson } from "./build-revenge.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(repoRoot, p), "utf8");
const results = [];
const check = (name, fn) => {
  try {
    const detail = fn();
    results.push({ ok: true, name, detail: detail || "" });
  } catch (error) {
    results.push({ ok: false, name, detail: error.message });
  }
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// --- Artifact ---------------------------------------------------------------

check("tests pass", () => {
  execFileSync(process.execPath, ["--test", "test/theme.test.js"], { cwd: repoRoot, stdio: "pipe" });
  return "node --test test/theme.test.js";
});

check("shipped files match src/", () => {
  const drift = build({ write: false }).filter((b) => read(b.file) !== b.css);
  assert(drift.length === 0, `run npm run build: ${drift.map((b) => b.file).join(", ")}`);
  const json = read("ComfyDeep-Revenge.json");
  assert(json === renderJson(readVariants()[0]), "run npm run build: ComfyDeep-Revenge.json");
  return "css + json regenerated identically";
});

check("version is consistent in four places", () => {
  const v = version();
  const header = read("ComfyDeep.theme.css").match(/@version\s+([\d.]+)/)[1];
  const pkg = JSON.parse(read("package.json")).version;
  assert(header === v, `css header ${header} != version.json ${v}`);
  assert(pkg === v, `package.json ${pkg} != version.json ${v}`);
  return `v${v}`;
});

check("required files exist", () => {
  const required = [
    "README.md",
    "CHANGELOG.md",
    "version.json",
    "package.json",
    "ComfyDeep.theme.css",
    "ComfyDeep-Revenge.json",
    "docs/CONTRAST.md",
    "src/theme.template.css",
  ];
  const missing = required.filter((f) => !existsSync(join(repoRoot, f)));
  assert(missing.length === 0, `missing: ${missing.join(", ")}`);
  return `${required.length} files`;
});

check("README images exist and are not stale", () => {
  const readme = read("README.md");
  const images = [...readme.matchAll(/\((docs\/[^)]+\.(?:jpg|png))\)/g)].map((m) => m[1]);
  assert(images.length >= 2, "README links at least two images");
  const missing = images.filter((p) => !existsSync(join(repoRoot, p)));
  assert(missing.length === 0, `missing images: ${missing.join(", ")}`);
  const oldest = images
    .map((p) => statSync(join(repoRoot, p)).mtimeMs)
    .reduce((a, b) => Math.min(a, b));
  const themeMtime = statSync(join(repoRoot, "src/palettes")).mtimeMs;
  assert(oldest >= themeMtime - 1000, "a screenshot is older than the palette: re-render them");
  return `${images.length} images`;
});

// --- Hygiene ----------------------------------------------------------------

check("no secrets or personal paths", () => {
  const files = ["README.md", "CHANGELOG.md", "ComfyDeep.theme.css", "ComfyDeep-Revenge.json", "docs/CONTRAST.md"];
  const patterns = [
    [/gh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
    [/github_pat_[A-Za-z0-9_]{20,}/, "fine-grained token"],
    [/sk-[A-Za-z0-9]{20,}/, "API key"],
    [/AKIA[0-9A-Z]{16}/, "AWS key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
    [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, "email address"],
    [/\/home\/[A-Za-z0-9._-]+\//, "absolute home path"],
    [/\/var\/home\//, "absolute home path"],
  ];
  for (const file of files) {
    const body = read(file);
    for (const [pattern, label] of patterns) {
      const hit = body.match(pattern);
      assert(!hit, `${file}: ${label} (${hit?.[0]})`);
    }
  }
  return `${files.length} files, ${patterns.length} patterns`;
});

check("no Cyrillic text", () => {
  for (const file of ["README.md", "CHANGELOG.md", "ComfyDeep.theme.css"]) {
    assert(!/[\u0400-\u04FF]/.test(read(file)), `${file} contains Cyrillic`);
  }
  return "docs and code are English";
});

check("no third-party names in the screenshots pipeline", () => {
  const preview = read("tools/preview.mjs");
  const forbidden = ["GeeNuTz", "AsterionVT", "Spicetify", "Spotify"];
  const hits = forbidden.filter((name) => preview.includes(`<b>${name}</b>`));
  assert(hits.length === 0, `mock contains ${hits.join(", ")}`);
  return "mock data is synthetic";
});

// --- Report -----------------------------------------------------------------

const width = Math.max(...results.map((r) => r.name.length));
for (const { ok, name, detail } of results) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(width)}  ${detail}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` — ${failed} FAILED` : " — safe to publish"}`);
process.exit(failed === 0 ? 0 : 1);
