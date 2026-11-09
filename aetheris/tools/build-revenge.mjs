// Generates Aetheris-Revenge.json (the mobile client's theme format) from the
// same palette the desktop CSS uses, so the two cannot drift.
//
// Format reference: revenge-mod/revenge-bundle, src/lib/addons/themes/colors/types.ts
//   VendettaThemeManifest { spec: 2, name, description, authors,
//                           semanticColors: Record<string, (string|false)[]>,
//                           rawColors: Record<string, string> }
// semanticColors values are [dark, light]; Revenge picks index 0 for dark mode.
//
//   node tools/build-revenge.mjs [--check]   (--check prints instead of writing)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadTheme } from "../test/palette.js";
import { readVariants } from "./build.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = () => JSON.parse(readFileSync(join(repoRoot, "version.json"), "utf8")).version;

// Discord's raw palette ramp, derived from the Aetheris teal so that anything
// the semantic map does not cover still lands in the right family.
const RAMP_STEPS = [100, 130, 160, 200, 230, 260, 300, 330, 360, 400, 430, 460, 500, 560, 600, 630, 645, 660, 700, 730, 760, 800, 830, 860, 900];

export function manifest(variant) {
  const theme = loadTheme(join(repoRoot, variant.file));
  // Opaque hex, composited over the canvas: mobile paints flat colours.
  const hex = (token) => theme.hex(token);
  const semantic = {
    BACKGROUND_PRIMARY: [hex("--aether-base")],
    BACKGROUND_SECONDARY: [hex("--aether-sidebar")],
    BACKGROUND_SECONDARY_ALT: [hex("--aether-sidebar-alt")],
    BACKGROUND_TERTIARY: [hex("--aether-tertiary")],
    BACKGROUND_ACCENT: [hex("--aether-accent-fill")],
    BACKGROUND_FLOATING: [hex("--aether-overlay")],
    BACKGROUND_NESTED_FLOATING: [hex("--aether-modal")],
    BACKGROUND_MOBILE_PRIMARY: [hex("--aether-base")],
    BACKGROUND_MOBILE_SECONDARY: [hex("--aether-sidebar")],
    TEXT_NORMAL: [hex("--aether-text")],
    TEXT_MUTED: [hex("--aether-text-muted")],
    TEXT_LINK: [hex("--aether-accent-soft")],
    TEXT_BRAND: [hex("--aether-accent-soft")],
    TEXT_DANGER: [hex("--aether-danger")],
    HEADER_PRIMARY: [hex("--aether-text-strong")],
    HEADER_SECONDARY: [hex("--aether-text-soft")],
    INTERACTIVE_NORMAL: [hex("--channel-normal")],
    INTERACTIVE_HOVER: [hex("--channel-hover")],
    INTERACTIVE_ACTIVE: ["#ffffff"],
    INTERACTIVE_MUTED: [hex("--aether-text-muted")],
    CHANNEL_ICON: [hex("--aether-text-muted")],
    STATUS_ONLINE: [hex("--aether-success")],
    STATUS_IDLE: [hex("--aether-warning")],
    STATUS_DND: [hex("--aether-danger")],
    STATUS_OFFLINE: [hex("--aether-text-dim")],
  };

  const rawColors = {
    // The theme's own accent ramp, so mobile matches the desktop palette exactly.
    ...Object.fromEntries(
      RAMP_STEPS.filter((step) => theme.vars.has(`--brand-${step}`)).map((step) => [
        `PRIMARY_${step}`,
        hex(`--brand-${step}`),
      ]),
    ),
    BRAND_360: hex("--brand-360"),
    BRAND_400: hex("--brand-400"),
    BRAND_500: hex("--brand-500"),
    BRAND_560: hex("--aether-accent"),
    RED_400: hex("--aether-danger"),
    RED_500: hex("--red-500"),
    RED_560: hex("--aether-danger-fill"),
    GREEN_360: hex("--aether-success"),
    GREEN_560: hex("--aether-success-fill"),
    YELLOW_360: hex("--aether-warning"),
    BLUE_345: hex("--aether-info"),
    WHITE: "#ffffff",
    BLACK: "#000000",
  };

  return {
    spec: 2,
    name: variant.name,
    description: variant.description,
    authors: [{ name: "GeeNuTz" }],
    semanticColors: semantic,
    rawColors,
  };
}

export function render(variant) {
  return `${JSON.stringify(manifest(variant), null, 2)}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const variant = readVariants()[0];
  const json = render(variant);
  const out = join(repoRoot, "Aetheris-Revenge.json");
  if (process.argv.includes("--check")) {
    console.log(json);
  } else {
    writeFileSync(out, json);
    console.log(`Aetheris-Revenge.json  ${variant.name}  v${version()}  ${(json.length / 1024).toFixed(1)} kB`);
  }
}
