// Runs one command in every theme folder.
//
//   node tools/all.mjs test     # node --test test/theme.test.js
//   node tools/all.mjs verify   # each theme's artifact gate
//
// A theme folder is any directory with a package.json and a test/theme.test.js.

import { readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function themes() {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "tools" && d.name !== "node_modules")
    .map((d) => d.name)
    .filter((name) => existsSync(join(root, name, "package.json")))
    .sort();
}

export function run(task, name) {
  const cwd = join(root, name);
  const args =
    task === "test" ? ["--test", "test/theme.test.js"] : ["tools/verify.mjs"];
  return execFileSync(process.execPath, args, { cwd, stdio: "inherit" });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const task = process.argv[2] ?? "test";
  const list = themes();
  console.log(`${task}: ${list.length} theme(s) — ${list.join(", ")}\n`);
  let failed = 0;
  for (const name of list) {
    console.log(`── ${name}`);
    try {
      run(task, name);
    } catch {
      failed += 1;
    }
    console.log("");
  }
  if (failed) {
    console.error(`${failed} theme(s) failed`);
    process.exit(1);
  }
  console.log(`all ${list.length} theme(s) ${task === "test" ? "pass" : "verified"}`);
}
