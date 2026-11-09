// The Aetheris contract, as tests — run once per shipped build.
//
// These do not "test CSS"; they test the properties that made the 4.x builds
// unreadable: flattening surfaces, contrast, meaning lost from semantic colours,
// var() typos, stray !important, builds that collide by name, and a stylesheet
// that cannot even be parsed.
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
import { build, readVariants } from "../tools/build.mjs";
import { render as renderJson } from "../tools/build-revenge.mjs";
import {
  PAIRS,
  AA,
  LEGACY_FAILURES,
  CLEARVISION_CONTRACT,
  EXTERNAL_VARIABLES,
  PEAK_LUMINANCE_LIMIT,
  WALLPAPER_BRIGHTNESS_LIMIT,
} from "./spec.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const versionJson = JSON.parse(readFileSync(join(repoRoot, "version.json"), "utf8"));
const variants = readVariants();

const themes = variants.map((variant) => ({
  ...variant,
  path: join(repoRoot, variant.file),
  theme: loadTheme(join(repoRoot, variant.file)),
}));

// --- Build integrity ---------------------------------------------------------

test("every shipped theme is what `npm run build` produces", () => {
  const built = build({ write: false });
  const drift = built.filter((b) => readFileSync(join(repoRoot, b.file), "utf8") !== b.css);
  assert.deepEqual(drift.map((b) => b.file), [], "run `npm run build` after editing src/");
});

test("the three builds have distinct names, files and moods", () => {
  const names = variants.map((v) => v.name);
  const files = variants.map((v) => v.file);
  assert.equal(new Set(names).size, names.length, `theme names must be unique: ${names.join(", ")}`);
  assert.equal(new Set(files).size, files.length, "theme files must be unique");
  assert.equal(names.length, 3, "Aetheris ships three builds");
  for (const variant of variants) {
    assert.ok(existsSync(join(repoRoot, variant.file)), `${variant.file} exists`);
    assert.ok(variant.description.length > 20, `${variant.name} has a real description`);
    assert.ok(variant.description.length <= 140, `${variant.name} description fits a tooltip`);
    assert.doesNotMatch(variant.description, /[\r\n]/, "description is one line");
  }
});

test("the palettes differ, not just the metadata", () => {
  const palettes = variants.map((v) => readFileSync(join(repoRoot, "src/palettes", `${v.palette}.css`), "utf8"));
  assert.equal(new Set(palettes).size, palettes.length, "each build has its own palette file content");
});

// --- Per build ---------------------------------------------------------------

for (const { name, file, theme, description } of themes) {
  const source = theme.source;

  test(`${name}: metadata is complete and versioned`, () => {
    assert.match(source, new RegExp(`@name ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
    assert.match(source, /@author\s+\S+/);
    assert.match(source, /@description\s+\S+/);
    assert.match(source, /@source\s+https:\/\//);
    const header = source.match(/@version\s+([\d.]+)/);
    assert.ok(header, "@version is declared");
    assert.equal(header[1], versionJson.version, "header version tracks version.json");
    assert.ok(description.startsWith(source.match(/@description\s+([\s\S]*?)\n \*/)[1].slice(0, 20)));
  });

  test(`${name}: parses and is structurally sound`, () => {
    assert.equal(theme.parsed.balanced, true, "every { has a matching }");
    assert.ok(theme.parsed.blocks.length > 10, "theme has rule blocks");
    assert.ok(
      theme.parsed.atRules.filter((r) => r.prelude.startsWith("@font-face")).length >= 3,
      "the three Aetheris @font-face blocks are present",
    );
  });

  test(`${name}: @import rules come before every style rule`, () => {
    const imports = theme.parsed.imports;
    assert.equal(imports.length, 2, "ClearVision main + vencord are both imported");
    const firstBlockIndex = Math.min(...theme.parsed.blocks.map((b) => b.index));
    const firstAtRule = Math.min(...theme.parsed.atRules.map((r) => r.index));
    for (const imp of imports) {
      assert.ok(imp.index < firstBlockIndex, `@import ${imp.url} must precede style rules`);
      assert.ok(imp.index < firstAtRule, `@import ${imp.url} must precede @font-face`);
    }
  });

  test(`${name}: no !important anywhere`, () => {
    const hits = [...stripComments(source).matchAll(/!\s*important/gi)];
    assert.equal(hits.length, 0, "the cascade is solved with order and specificity, not force");
  });

  test(`${name}: no declaration is written twice inside one block`, () => {
    for (const block of theme.parsed.blocks) {
      const seen = new Map();
      for (const { prop, value } of block.decls) {
        if (!prop.startsWith("--")) continue;
        if (seen.has(prop) && seen.get(prop) !== value) {
          assert.fail(`${name} ${block.selector} sets ${prop} twice: "${seen.get(prop)}" then "${value}"`);
        }
        seen.set(prop, value);
      }
    }
  });

  test(`${name}: every var() reference resolves`, () => {
    const defined = new Set([...theme.vars.keys(), "--peak"]);
    const allowed = (n) => defined.has(n) || EXTERNAL_VARIABLES.includes(n) || n.startsWith("--hsl-");
    const unknown = [...theme.referenced].filter((n) => !allowed(n));
    assert.deepEqual(unknown, [], "an unresolved var() name is a silent no-op in the browser");
  });

  test(`${name}: ClearVision's settings contract is complete`, () => {
    const missing = CLEARVISION_CONTRACT.filter((n) => !theme.vars.has(n));
    assert.deepEqual(missing, [], "missing settings fall back to ClearVision's blue defaults");
  });

  test(`${name}: the text ground is dark, whatever the backdrop`, () => {
    if (theme.peakModel === "gradient") {
      assert.ok(
        theme.peakLuminance <= PEAK_LUMINANCE_LIMIT,
        `peak luminance ${theme.peakLuminance.toFixed(4)} must stay <= ${PEAK_LUMINANCE_LIMIT}`,
      );
      const peak = theme.peak;
      assert.ok(peak.b > peak.g + 20, `canvas peak ${theme.peakHex} must stay blue-violet (b > g)`);
      assert.ok(peak.b > peak.r, `canvas peak ${theme.peakHex} must stay violet (b > r)`);
    } else {
      assert.ok(theme.isWallpaper, "a wallpaper theme says so");
      // The wash and the panels, not the photo, decide the bound.
      assert.ok(
        theme.peakLuminance <= WALLPAPER_BRIGHTNESS_LIMIT,
        `the filter must darken a wallpaper: peak luminance ${theme.peakLuminance.toFixed(3)}`,
      );
    }
    // Whatever the backdrop, body text sits on a surface that is dark.
    const ground = luminance(theme.colorOf("--background-primary"));
    assert.ok(
      ground <= 0.06,
      `--background-primary over the backdrop is too bright (${theme.hex("--background-primary")})`,
    );
  });

  test(`${name}: surfaces are translucent, so the backdrop is not erased`, () => {
    for (const varName of ["--background-primary", "--background-secondary", "--background-tertiary"]) {
      const color = parseColor(theme.resolve(varName));
      assert.ok(color.a < 0.95, `${varName} (${theme.resolve(varName)}) must keep some transparency`);
    }
  });

  test(`${name}: surface planes step downward`, () => {
    const lum = (n) => {
      const c = theme.colorOf(n);
      return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    };
    const chat = lum("--background-primary");
    const sidebar = lum("--background-secondary");
    const rail = lum("--background-tertiary");
    assert.ok(chat > sidebar, `chat (${chat.toFixed(1)}) should read lighter than sidebar (${sidebar.toFixed(1)})`);
    assert.ok(sidebar > rail, `sidebar (${sidebar.toFixed(1)}) should read lighter than rail (${rail.toFixed(1)})`);
  });

  test(`${name}: every text/surface pair meets WCAG AA`, () => {
    const failures = [];
    for (const pair of PAIRS) {
      const ratio = theme.ratio(pair.fg, pair.bg);
      if (ratio < pair.min) {
        failures.push(`${pair.label}: ${pair.fg} on ${pair.bg} = ${ratio.toFixed(2)} < ${pair.min}`);
      }
    }
    assert.deepEqual(failures, []);
  });

  test(`${name}: the 4.x readability regressions cannot come back`, () => {
    const values = theme.parsed.blocks
      .flatMap((block) => block.decls.map((decl) => decl.value))
      .join("\n")
      .toLowerCase();
    const hits = LEGACY_FAILURES.filter(({ value }) => values.includes(value.toLowerCase()));
    assert.deepEqual(hits.map((h) => `${h.value} (${h.why})`), []);
  });

  test(`${name}: decorative accent and text-bearing accent stay separate`, () => {
    const onMain = contrast("#ffffff", theme.resolve("--main-color"));
    assert.ok(onMain < AA.normal, "sanity: the bright accent cannot carry white text at AA");
    const onFill = contrast("#ffffff", theme.resolve("--aether-accent-fill"));
    assert.ok(onFill >= AA.normal, "the fill variant must carry white text at AA");
  });

  test(`${name}: filled-button overrides exist for brand, danger and success`, () => {
    for (const token of ["--aether-accent-fill", "--aether-danger-fill", "--aether-success-fill"]) {
      assert.match(source, new RegExp(`background-color:\\s*var\\(${token}\\)`), `${token} is used by a fill rule`);
    }
    assert.match(source, /class\*="lookFilled_"/, "covers the name_hash class convention");
    assert.match(source, /class\*="lookFilled-"/, "covers the name-hash class convention");
  });

  test(`${name}: both class-name conventions are matched`, () => {
    const pinned = ["NDaLCQ"]; // ClearVision's mention wrapper is addressed by hash, not by name
    const tokens = new Set(
      [...source.matchAll(/class\*="([a-zA-Z]+)_/g)].map((m) => m[1]).filter((t) => !pinned.includes(t)),
    );
    const missing = [...tokens].filter((t) => !source.includes(`class*="${t}-"`));
    assert.deepEqual(missing, [], `add a "name-" variant for: ${missing.join(", ")}`);
  });

  test(`${name}: keeps the Aetheris faces`, () => {
    assert.match(source, /--font-display:\s*"Meloso"/, "headers and usernames use Meloso");
    assert.match(source, /--main-font:\s*"RobotoCustom"/, "body text stays RobotoCustom");
  });
}

test("the flat fallback canvas stays dark enough for the text ramp", () => {
  const bg = toHex(parseColor(FALLBACK_BASE));
  for (const { name, theme } of themes) {
    const ratio = contrast(theme.resolve("--text-normal"), bg);
    assert.ok(ratio >= AA.body, `${name}: --text-normal on ${bg} = ${ratio.toFixed(2)}`);
    const muted = contrast(theme.resolve("--text-muted"), bg);
    assert.ok(muted >= AA.normal, `${name}: --text-muted on ${bg} = ${muted.toFixed(2)}`);
  }
});

// --- Revenge manifests (mobile): one per build ---------------------------------

const manifests = variants.map((variant) => ({
  variant,
  file: `${variant.file.replace(/\.theme\.css$/, "")}-Revenge.json`,
  json: JSON.parse(readFileSync(join(repoRoot, `${variant.file.replace(/\.theme\.css$/, "")}-Revenge.json`), "utf8")),
  theme: themes.find((t) => t.file === variant.file).theme,
}));

for (const { variant, file, json, theme: buildTheme } of manifests) {
  test(`${variant.name}: the Revenge manifest is a valid spec-2 theme`, () => {
    assert.equal(json.spec, 2, "Revenge parses spec 2 (Vendetta format)");
    assert.equal(json.name, variant.name, `${file} carries its own build name`);
    assert.ok(Array.isArray(json.authors) && json.authors.length > 0);
    const hexes = [...Object.values(json.semanticColors).flat(), ...Object.values(json.rawColors ?? {})].filter(Boolean);
    assert.ok(hexes.length >= 30);
    for (const value of hexes) assert.match(value, /^#[0-9a-f]{6}$/i, `bad hex: ${value}`);
  });

  test(`${variant.name}: the Revenge manifest is generated, not hand-edited`, () => {
    assert.equal(readFileSync(join(repoRoot, file), "utf8"), renderJson(variant), "run npm run build");
  });

  test(`${variant.name}: the Revenge manifest uses this build's palette`, () => {
    const painted = new Set(
      [...buildTheme.vars.keys()]
        .filter((n) => /^(#|rgba?\()/i.test(buildTheme.resolve(n)))
        .map((n) => toHex(buildTheme.colorOf(n)).toLowerCase()),
    );
    const missing = Object.entries(json.semanticColors)
      .flatMap(([key, values]) => (values[0] ? [[key, values[0].toLowerCase()]] : []))
      .filter(([, value]) => !painted.has(value));
    assert.deepEqual(missing.map(([k, v]) => `${k}=${v}`), []);
  });

  test(`${variant.name}: the Revenge manifest is readable`, () => {
    const s = json.semanticColors;
    const pairs = [
      ["TEXT_NORMAL", "BACKGROUND_PRIMARY", AA.body],
      ["TEXT_MUTED", "BACKGROUND_PRIMARY", AA.normal],
      ["TEXT_MUTED", "BACKGROUND_SECONDARY", AA.normal],
      ["HEADER_PRIMARY", "BACKGROUND_SECONDARY", AA.body],
      ["TEXT_LINK", "BACKGROUND_PRIMARY", AA.normal],
      ["HEADER_SECONDARY", "BACKGROUND_SECONDARY", AA.normal],
    ];
    const failures = pairs
      .map(([fg, bg, min]) => [fg, bg, contrast(s[fg][0], s[bg][0]), min])
      .filter(([, , ratio, min]) => ratio < min)
      .map(([fg, bg, ratio, min]) => `${fg} on ${bg} = ${ratio.toFixed(2)} < ${min}`);
    assert.deepEqual(failures, []);
    assert.ok(contrast("#ffffff", s.BACKGROUND_ACCENT[0]) >= AA.normal, "white on the accent fill");
  });
}

test("every build ships a mobile manifest", () => {
  const files = manifests.map((m) => m.file);
  assert.equal(files.length, variants.length, "one manifest per stylesheet");
  for (const file of files) assert.ok(existsSync(join(repoRoot, file)), `${file} exists`);
  assert.equal(new Set(manifests.map((m) => m.json.name)).size, variants.length, "manifest names are distinct");
});
