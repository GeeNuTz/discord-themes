// Turns a shipped stylesheet into a resolvable palette.
//
// Two kinds of backdrop:
//   gradient   the theme's own --background-image gradient; sampled to its
//              brightest pixel (test/gradient.js)
//   wallpaper  a url() image; its content is unknown, so the bound is "pure white
//              through --background-filter" — the brightest pixel any photo can
//              produce after the theme's own darkening
// A translucent surface is composited over that backdrop, which is the worse case
// for light text. Text is then measured against the surface it actually sits on.

import { readFileSync } from "node:fs";
import { parseCss, collectVariables, resolveValue, referencedVariables } from "./css.js";
import { parseColor, composite, contrast, toHex, isOpaque, luminance } from "./color.js";
import { evaluateBackground } from "./gradient.js";

export const FALLBACK_BASE = "#040614"; // Comfy Deep main: the canvas if no gradient paints

/** brightness() factor in a filter chain, or 1. Throws on calc(): guessing is worse. */
export function brightnessOf(filter) {
  if (!filter) return 1;
  const call = String(filter).match(/brightness\(\s*([^)]*)\)/i);
  if (!call) return 1; // no brightness(): the wallpaper stays as-is
  const arg = call[1].trim();
  if (/calc\(/i.test(arg) || /[a-z%]/i.test(arg)) {
    throw new Error(`brightness(${arg}) is not modelled; use a plain number`);
  }
  const value = parseFloat(arg);
  if (!(value > 0 && value <= 2)) throw new Error(`implausible brightness(${value})`);
  return value;
}

export function loadTheme(cssPath) {
  const source = readFileSync(cssPath, "utf8");
  const parsed = parseCss(source);
  const vars = collectVariables(parsed.blocks);

  const resolve = (name) => {
    if (!vars.has(name)) throw new Error(`unknown variable ${name}`);
    return resolveValue(vars.get(name), vars);
  };

  const backgroundImage = vars.has("--background-image") ? resolve("--background-image") : "none";
  const isWallpaper = /(?:^|,)\s*(?:url|image-set)\(/i.test(backgroundImage);

  const filter = vars.has("--background-filter") ? resolve("--background-filter") : "";
  // A wallpaper is unknown content, so it is modelled as white pushed through the
  // theme's own brightness() filter. Gradient layers above it still composite on
  // top, which is how a wash keeps a wallpaper readable.
  const wallpaperBase = (() => {
    const v = 255 * brightnessOf(filter);
    return { r: v, g: v, b: v, a: 1 };
  })();

  const gradient = evaluateBackground(backgroundImage, { wallpaperBase });
  const peak = gradient.peak;
  const peakHex = gradient.peakHex;
  const peakModel = isWallpaper ? "filtered-wallpaper" : "gradient";
  const peakAt = isWallpaper
    ? { viewport: "worst-case wallpaper (white through --background-filter, under the theme's wash)" }
    : gradient.peakAt;

  const base = parseColor(FALLBACK_BASE);

  /** Resolved colour, composited over a backdrop when translucent. */
  const colorOf = (name, backdrop = peak) => {
    // `--peak` is not in the stylesheet: it is the measured brightest backdrop
    // pixel, exposed so tests can ask "is text readable on the worst pixel?".
    const raw = name === "--peak" ? peakHex : resolve(name);
    const color = parseColor(raw);
    if (isOpaque(color)) return color;
    const under = backdrop === "base" ? base : peak;
    return composite(color, under);
  };

  const hex = (name, backdrop = peak) => toHex(colorOf(name, backdrop));

  const ratio = (fgName, bgName) => {
    const bg = colorOf(bgName);
    const fgRaw = parseColor(fgName === "--peak" ? peakHex : resolve(fgName));
    const fg = isOpaque(fgRaw) ? fgRaw : composite(fgRaw, bg);
    return contrast(fg, bg);
  };

  return {
    source,
    parsed,
    vars,
    resolve,
    colorOf,
    hex,
    ratio,
    peak,
    peakHex,
    peakLuminance: luminance(peak),
    peakAt,
    peakModel,
    isWallpaper,
    backgroundImage,
    gradient,
    referenced: referencedVariables(source),
  };
}
