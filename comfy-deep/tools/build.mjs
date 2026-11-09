// Builds the shipped artifacts from src/:
//
//   src/theme.template.css + src/palettes/comfy-deep.css -> ComfyDeep.theme.css
//   the same palette                                    -> ComfyDeep-Revenge.json
//
//   npm run build
//
// Both outputs are committed: a client needs one standalone file and the mobile
// client needs one JSON, so nothing is imported at install time. `npm test` fails
// if a shipped file no longer matches what this script would produce.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function readVariants() {
  return JSON.parse(readFileSync(join(repoRoot, "src/variants.json"), "utf8"));
}

export function version() {
  return JSON.parse(readFileSync(join(repoRoot, "version.json"), "utf8")).version;
}

export function renderCss(variant, v = version()) {
  const template = readFileSync(join(repoRoot, "src/theme.template.css"), "utf8");
  const palette = readFileSync(join(repoRoot, "src/palettes", `${variant.palette}.css`), "utf8").trimEnd();
  return template
    .replaceAll("{{NAME}}", variant.name)
    .replaceAll("{{VERSION}}", v)
    .replaceAll("{{DESCRIPTION}}", variant.description)
    .replace("{{PALETTE}}", () => palette);
}

export function build({ write = true } = {}) {
  const v = version();
  const results = readVariants().map((variant) => {
    const css = renderCss(variant, v);
    if (write) writeFileSync(join(repoRoot, variant.file), css);
    return { ...variant, css };
  });
  return results;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const r of build()) {
    console.log(`${r.file.padEnd(24)} ${r.name.padEnd(12)} ${(r.css.length / 1024).toFixed(1)} kB`);
  }
}
