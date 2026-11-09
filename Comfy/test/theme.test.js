// The Comfy Deep contract, as tests.
//
// Two shipped artifacts from one palette: the ClearVision stylesheet for Vesktop
// (Linux/Windows) and the JSON manifest for the Revenge mobile client. These tests
// check both, and that neither drifts from src/.
//
// Run with: npm test

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { parseCss, stripComments } from "./css.js";
import { contrast, parseColor, toHex, luminance } from "./color.js";
import { loadTheme, FALLBACK_BASE } from "./palette.js";
import { build, readVariants, version } from "../tools/build.mjs";
import { manifest, render as renderJson } from "../tools/build-revenge.mjs";
import {
  PAIRS,
  AA,
  FOREIGN_COLOURS,
  CLEARVISION_CONTRACT,
  EXTERNAL_VARIABLES,
  PEAK_LUMINANCE_LIMIT,
} from "./spec.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const variants = readVariants();
const theme = loadTheme(join(repoRoot, variants[0].file));
const source = theme.source;
const REVENGE = join(repoRoot, "ComfyDeep-Revenge.json");

// --- Build integrity ---------------------------------------------------------

test("the shipped stylesheet is what `npm run build` produces", () => {
  const drift = build({ write: false }).filter((b) => readFileSync(join(repoRoot, b.file), "utf8") !== b.css);
  assert.deepEqual(drift.map((b) => b.file), [], "run `npm run build` after editing src/");
});

test("the shipped Revenge manifest is what the generator produces", () => {
  assert.ok(existsSync(REVENGE), "ComfyDeep-Revenge.json exists");
  const shipped = readFileSync(REVENGE, "utf8");
  assert.equal(shipped, renderJson(variants[0]), "run `npm run build` after editing the palette");
});

test("one build, one name, one file", () => {
  assert.equal(variants.length, 1, "this theme ships a single build");
  const [variant] = variants;
  assert.ok(existsSync(join(repoRoot, variant.file)));
  assert.ok(variant.description.length > 20 && variant.description.length <= 140);
  assert.doesNotMatch(variant.description, /[\r\n]/);
});

// --- Stylesheet --------------------------------------------------------------

test("metadata is complete and versioned", () => {
  assert.match(source, /@name Comfy Deep\b/);
  assert.match(source, /@author\s+\S+/);
  assert.match(source, /@description\s+\S+/);
  assert.match(source, /@source\s+https:\/\//);
  const header = source.match(/@version\s+([\d.]+)/);
  assert.ok(header, "@version is declared");
  assert.equal(header[1], version(), "header version tracks version.json");
});

test("parses and is structurally sound", () => {
  assert.equal(theme.parsed.balanced, true, "every { has a matching }");
  assert.ok(theme.parsed.blocks.length > 10, "theme has rule blocks");
});

test("@import rules come before every style rule", () => {
  const imports = theme.parsed.imports;
  assert.equal(imports.length, 2, "ClearVision main + vencord are both imported");
  const firstBlock = Math.min(...theme.parsed.blocks.map((b) => b.index));
  for (const imp of imports) assert.ok(imp.index < firstBlock, `@import ${imp.url} must precede style rules`);
});

test("no !important anywhere", () => {
  const hits = [...stripComments(source).matchAll(/!\s*important/gi)];
  assert.equal(hits.length, 0, "the cascade is solved with order and specificity, not force");
});

test("no declaration is written twice inside one block", () => {
  for (const block of theme.parsed.blocks) {
    const seen = new Map();
    for (const { prop, value } of block.decls) {
      if (!prop.startsWith("--")) continue;
      if (seen.has(prop) && seen.get(prop) !== value) {
        assert.fail(`${block.selector} sets ${prop} twice: "${seen.get(prop)}" then "${value}"`);
      }
      seen.set(prop, value);
    }
  }
});

test("every var() reference resolves", () => {
  const defined = new Set([...theme.vars.keys(), "--peak"]);
  const allowed = (n) => defined.has(n) || EXTERNAL_VARIABLES.includes(n) || n.startsWith("--hsl-");
  assert.deepEqual([...theme.referenced].filter((n) => !allowed(n)), []);
});

test("ClearVision's settings contract is complete", () => {
  assert.deepEqual(CLEARVISION_CONTRACT.filter((n) => !theme.vars.has(n)), []);
});

test("nothing is fetched for type: the theme ships no webfont", () => {
  assert.equal(theme.parsed.atRules.filter((r) => r.prelude.startsWith("@font-face")).length, 0);
  assert.match(source, /--main-font:\s*"gg sans"/);
});

// --- Readability -------------------------------------------------------------

test("the text ground is dark and the canvas is bounded", () => {
  assert.equal(theme.peakModel, "gradient");
  assert.ok(
    theme.peakLuminance <= PEAK_LUMINANCE_LIMIT,
    `peak luminance ${theme.peakLuminance.toFixed(4)} must stay <= ${PEAK_LUMINANCE_LIMIT}`,
  );
  assert.ok(theme.peak.b >= theme.peak.g, `canvas peak ${theme.peakHex} must stay blue-teal (b >= g)`);
  const ground = luminance(theme.colorOf("--background-primary"));
  assert.ok(ground <= 0.06, `--background-primary is too bright (${theme.hex("--background-primary")})`);
});

test("surfaces are translucent, so the backdrop is not erased", () => {
  for (const name of ["--background-primary", "--background-secondary", "--background-tertiary"]) {
    assert.ok(parseColor(theme.resolve(name)).a < 0.99, `${name} must keep some transparency`);
  }
});

test("the declared surface planes step in the documented order", () => {
  const lum = (n) => luminance(theme.colorOf(n));
  const order = variants[0].planes;
  assert.equal(order.length, 3, "planes lists three variables");
  const values = order.map(lum);
  for (let i = 1; i < values.length; i += 1) {
    assert.ok(values[i] > values[i - 1], `${order[i]} should read lighter than ${order[i - 1]}`);
  }
});

test("every text/surface pair meets WCAG AA", () => {
  const failures = [];
  for (const pair of PAIRS) {
    const ratio = theme.ratio(pair.fg, pair.bg);
    if (ratio < pair.min) failures.push(`${pair.label}: ${pair.fg} on ${pair.bg} = ${ratio.toFixed(2)} < ${pair.min}`);
  }
  assert.deepEqual(failures, []);
});

test("no foreign palette survives in a declaration", () => {
  const values = theme.parsed.blocks
    .flatMap((b) => b.decls.map((d) => d.value))
    .join("\n")
    .toLowerCase();
  const hits = FOREIGN_COLOURS.filter(({ value }) => values.includes(value.toLowerCase()));
  assert.deepEqual(hits.map((h) => `${h.value} (${h.why})`), []);
});

test("the accent that carries text is not the decorative accent", () => {
  assert.ok(contrast("#ffffff", theme.resolve("--main-color")) < AA.normal, "sanity: white on the bright accent fails");
  assert.ok(contrast("#ffffff", theme.resolve("--comfy-accent-fill")) >= AA.normal, "the fill variant carries white");
  assert.ok(
    contrast(theme.resolve("--channel-selected"), theme.resolve("--channel-selected-bg")) >= AA.normal,
    "the selected pill label stays readable",
  );
});

test("the header stamp is this build, not ClearVision", () => {
  const v = JSON.parse(readFileSync(join(repoRoot, "version.json"), "utf8")).version;
  assert.match(source, new RegExp(`content:\\s*"Comfy Deep"`), "title bar shows the theme name");
  assert.match(source, new RegExp(`content:\\s*"v${v}"`), "title bar shows the version");
  assert.match(source, new RegExp(`content:\\s*"Comfy Deep v${v}"`), "the info slot repeats both");
  assert.doesNotMatch(source, /content:\s*"ClearVision/, "ClearVision's own stamp is replaced");

    for (const line of source.split("\n")) {
      if (!/content:\s*"(Comfy Deep|Aetheris)/.test(line)) continue;
      const block = source.slice(0, source.indexOf(line)).split("}").pop();
      assert.match(block, /:root:is\(\.theme-dark/, "stamp rules must outrank ClearVision's (0,2,1)");
    }
});

test("filled-button overrides exist for brand, danger and success", () => {
  for (const token of ["--comfy-accent-fill", "--comfy-danger-fill", "--comfy-success-fill"]) {
    assert.match(source, new RegExp(`background-color:\\s*var\\(${token}\\)`));
  }
  assert.match(source, /class\*="lookFilled_"/);
  assert.match(source, /class\*="lookFilled-"/);
});

test("both class-name conventions are matched", () => {
  const pinned = ["NDaLCQ"];
  const tokens = new Set(
    [...source.matchAll(/class\*="([a-zA-Z]+)_/g)].map((m) => m[1]).filter((t) => !pinned.includes(t)),
  );
  assert.deepEqual([...tokens].filter((t) => !source.includes(`class*="${t}-`)), []);
});

// --- Revenge manifest --------------------------------------------------------

const revenge = JSON.parse(readFileSync(REVENGE, "utf8"));

test("the Revenge manifest is a valid spec-2 theme", () => {
  assert.equal(revenge.spec, 2, "Revenge parses spec 2 (Vendetta format)");
  assert.equal(revenge.name, variants[0].name);
  assert.ok(Array.isArray(revenge.authors) && revenge.authors.length > 0);
  assert.ok(Array.isArray(revenge.semanticColors?.TEXT_NORMAL), "semanticColors values are arrays");
  const hexes = [
    ...Object.values(revenge.semanticColors).flat(),
    ...Object.values(revenge.rawColors ?? {}),
  ].filter(Boolean);
  assert.ok(hexes.length >= 30, "the manifest carries a full palette");
  for (const value of hexes) assert.match(value, /^#[0-9a-f]{6}$/i, `bad hex: ${value}`);
});

test("the Revenge manifest carries the same palette as the stylesheet", () => {
  const generated = manifest(variants[0]);
  assert.equal(revenge.semanticColors.BACKGROUND_PRIMARY[0], generated.semanticColors.BACKGROUND_PRIMARY[0]);
  // Every semantic colour must be one the stylesheet also paints.
  const painted = new Set(
    [...theme.vars.keys()]
      .filter((n) => /^(#|rgba?\()/i.test(theme.resolve(n)))
      .map((n) => toHex(theme.colorOf(n)).toLowerCase()),
  );
  const missing = Object.entries(revenge.semanticColors)
    .flatMap(([key, values]) => (values[0] ? [[key, values[0].toLowerCase()]] : []))
    .filter(([, value]) => !painted.has(value));
  assert.deepEqual(missing.map(([key, value]) => `${key}=${value}`), []);
});

test("the Revenge manifest is readable too", () => {
  const s = revenge.semanticColors;
  const pairs = [
    ["TEXT_NORMAL", "BACKGROUND_PRIMARY", AA.body],
    ["TEXT_MUTED", "BACKGROUND_PRIMARY", AA.normal],
    ["TEXT_MUTED", "BACKGROUND_SECONDARY", AA.normal],
    ["HEADER_PRIMARY", "BACKGROUND_SECONDARY", AA.body],
    ["TEXT_LINK", "BACKGROUND_PRIMARY", AA.normal],
    ["TEXT_DANGER", "BACKGROUND_PRIMARY", AA.normal],
    ["INTERACTIVE_NORMAL", "BACKGROUND_SECONDARY", AA.normal],
    ["STATUS_OFFLINE", "BACKGROUND_SECONDARY", AA.normal],
  ];
  const failures = pairs
    .map(([fg, bg, min]) => [fg, bg, contrast(s[fg][0], s[bg][0]), min])
    .filter(([, , ratio, min]) => ratio < min)
    .map(([fg, bg, ratio, min]) => `${fg} on ${bg} = ${ratio.toFixed(2)} < ${min}`);
  assert.deepEqual(failures, []);
  assert.ok(contrast("#ffffff", s.BACKGROUND_ACCENT[0]) >= AA.normal, "white on the accent fill");
});

// --- Everywhere --------------------------------------------------------------

test("the flat fallback canvas stays dark enough for the text ramp", () => {
  const bg = toHex(parseColor(FALLBACK_BASE));
  assert.ok(contrast(theme.resolve("--text-normal"), bg) >= AA.body);
  assert.ok(contrast(theme.resolve("--text-muted"), bg) >= AA.normal);
});
