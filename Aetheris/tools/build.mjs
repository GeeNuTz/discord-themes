// Builds the three shipped themes from src/theme.template.css + src/palettes/*.css.
//
//   npm run build
//
// The generated files are committed: a client needs a single standalone .css, so
// there is no runtime import and no build step at install time. `npm test` fails
// if a shipped file no longer matches what this script would produce, which keeps
// hand edits from silently drifting away from the template.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function version() {
  return JSON.parse(readFileSync(join(repoRoot, "version.json"), "utf8")).version;
}

export function readVariants() {
  return JSON.parse(readFileSync(join(repoRoot, "src/variants.json"), "utf8"));
}

export function render(variant, version) {
  const template = readFileSync(join(repoRoot, "src/theme.template.css"), "utf8");
  const palette = readFileSync(join(repoRoot, "src/palettes", `${variant.palette}.css`), "utf8").trimEnd();
  return template
    .replaceAll("{{NAME}}", variant.name)
    .replaceAll("{{VERSION}}", version)
    .replaceAll("{{DESCRIPTION}}", variant.description)
    .replace("{{PALETTE}}", () => palette);
}

export function build({ write = true } = {}) {
  const version = JSON.parse(readFileSync(join(repoRoot, "version.json"), "utf8")).version;
  const variants = readVariants();
  const results = variants.map((variant) => {
    const css = render(variant, version);
    if (write) writeFileSync(join(repoRoot, variant.file), css);
    return { ...variant, css };
  });
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = build();
  for (const r of results) {
    console.log(`${r.file.padEnd(26)} ${r.name.padEnd(14)} ${(r.css.length / 1024).toFixed(1)} kB`);
  }
}
