// The collection's publish gate, the one that must pass before a push.
//
//   npm run verify
//
// Runs every theme's artifact gate, then answers the repository questions:
// versions, secrets across the whole tree, README images, and git state
// (clean, not behind, something new to publish).

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { themes } from "./all.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const results = [];
const check = (name, fn) => {
  try {
    results.push({ ok: true, name, detail: fn() || "" });
  } catch (error) {
    results.push({ ok: false, name, detail: error.message });
  }
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const git = (args) =>
  execFileSync("git", args, { cwd: root, stdio: "pipe" }).toString().trim();

// --- Themes -----------------------------------------------------------------

const list = themes();

check(`theme artifacts verify (${list.length})`, () => {
  const failed = [];
  for (const name of list) {
    try {
      execFileSync(process.execPath, ["tools/verify.mjs"], { cwd: join(root, name), stdio: "pipe" });
    } catch {
      failed.push(name);
    }
  }
  assert(failed.length === 0, `failing: ${failed.join(", ")}`);
  return list.join(", ");
});

check("every theme has a row in the README", () => {
  const readme = read("README.md");
  const missing = list.filter((name) => !readme.includes(`(${name}/)`));
  assert(missing.length === 0, `not linked from README: ${missing.join(", ")}`);
  return `${list.length} linked`;
});

check("theme names are unique", () => {
  const names = list.map((name) => JSON.parse(read(`${name}/package.json`)).name);
  assert(new Set(names).size === names.length, `duplicate package names: ${names.join(", ")}`);
  return names.join(", ");
});

// --- Repository -------------------------------------------------------------

check("no secrets or personal paths in the tree", () => {
  const patterns = [
    [/gh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
    [/github_pat_[A-Za-z0-9_]{20,}/, "fine-grained token"],
    [/sk-[A-Za-z0-9]{20,}/, "API key"],
    [/AKIA[0-9A-Z]{16}/, "AWS key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
    [/\/home\/[A-Za-z0-9._-]+\//, "absolute home path"],
    [/\/var\/home\//, "absolute home path"],
  ];
  const files = list.flatMap((name) => [
    `${name}/README.md`,
    `${name}/${JSON.parse(read(`${name}/version.json`)) && `${name}/version.json`}`,
  ]);
  for (const file of files.filter((f) => existsSync(join(root, f)))) {
    const body = read(file);
    for (const [pattern, label] of patterns) {
      assert(!pattern.test(body), `${file}: ${label}`);
    }
  }
  const top = ["README.md", "CONTRIBUTING.md", "LICENSE", "package.json"];
  for (const file of top) {
    const body = read(file);
    for (const [pattern, label] of patterns) {
      assert(!pattern.test(body), `${file}: ${label}`);
    }
  }
  return `${files.length + top.length} files`;
});

check("no Cyrillic text in docs or themes", () => {
  for (const name of list) {
    for (const file of [`${name}/README.md`, `${name}/CHANGELOG.md`]) {
      if (existsSync(join(root, file))) assert(!/[\u0400-\u04FF]/.test(read(file)), `${file} contains Cyrillic`);
    }
  }
  assert(!/[\u0400-\u04FF]/.test(read("README.md")), "root README contains Cyrillic");
  return "English throughout";
});

check("README images exist", () => {
  const images = [...read("README.md").matchAll(/\((?:\.\/)?([a-z0-9-]+\/docs\/[^)]+\.(?:jpg|png))\)/g)].map((m) => m[1]);
  assert(images.length >= list.length, `expected at least ${list.length} images, found ${images.length}`);
  const missing = images.filter((p) => !existsSync(join(root, p)));
  assert(missing.length === 0, `missing: ${missing.join(", ")}`);
  return `${images.length} images`;
});

check("git working tree is clean", () => {
  try {
    git(["rev-parse", "--is-inside-work-tree"]);
  } catch {
    return "not a git repository (first publish)";
  }
  const status = git(["status", "--porcelain"]);
  assert(status === "", `uncommitted changes:\n${status}`);
  return "clean";
});

check("nothing behind the remote, and something to publish", () => {
  let branch;
  try {
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  } catch {
    return "not a git repository (first publish)";
  }
  const hasUpstream = (() => {
    try {
      git(["rev-parse", "--abbrev-ref", `${branch}@{u}`]);
      return true;
    } catch {
      return false;
    }
  })();
  if (!hasUpstream) return "no upstream: first push";
  const [ahead, behind] = git(["rev-list", "--left-right", "--count", `${branch}...@{u}`]).split(/\s+/).map(Number);
  assert(behind === 0, `behind origin by ${behind} commit(s): pull first`);
  assert(ahead > 0, "nothing new to publish: the remote already has this commit");
  return `ahead ${ahead}, behind 0`;
});

// --- Report -----------------------------------------------------------------

const width = Math.max(...results.map((r) => r.name.length));
for (const { ok, name, detail } of results) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(width)}  ${detail}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? ` — ${failed} FAILED` : " — safe to publish"}`);
process.exit(failed === 0 ? 0 : 1);
