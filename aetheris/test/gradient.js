// Evaluates the theme's --background-image gradient to find its brightest pixel.
//
// The theme claims a bounded canvas: text contrast is only provable if the
// backdrop cannot get brighter than some known colour. This module samples the
// real gradient declaration over a few viewport sizes and returns the maximum.
//
// Scope: the grammar the theme uses — comma-separated layers of
// `radial-gradient(circle <len> at <pct> <pct>, <color> [<pct>], ...)` and
// `linear-gradient(<angle>, <color> <pct>, ...)`. Anything else throws instead
// of silently returning a wrong bound. Interpolation is sRGB, like browsers do
// for legacy gradient syntax.

import { parseColor, toHex, composite, luminance } from "./color.js";

function splitTopLevel(text, separator = ",") {
  const parts = [];
  let depth = 0;
  let buf = "";
  for (const ch of text) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === separator && depth === 0) {
      parts.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function parseStops(text) {
  const stops = splitTopLevel(text).map((chunk) => {
    const m = chunk.match(/^(.*?)(?:\s+(-?[\d.]+)%)?$/);
    // Greedy colour match: split off a trailing percentage if present.
    const stop = chunk.match(/^((?:rgba?|hsla?)\([^)]*\)|#[0-9a-f]{3,8})\s*(?:(-?[\d.]+)%)?$/i);
    if (!stop) throw new Error(`unsupported gradient stop: ${chunk}`);
    return {
      color: parseColor(stop[1]),
      position: stop[2] === undefined ? null : parseFloat(stop[2]),
    };
  });
  if (stops.length < 2) throw new Error("gradient needs two stops");
  // Fill missing positions: first = 0, last = 100, others interpolated evenly.
  if (stops[0].position === null) stops[0].position = 0;
  if (stops[stops.length - 1].position === null) stops[stops.length - 1].position = 100;
  for (let i = 1; i < stops.length - 1; i += 1) {
    if (stops[i].position === null) {
      const prev = stops[i - 1].position;
      const next = stops.find((s, j) => j > i && s.position !== null).position;
      stops[i].position = prev + ((next - prev) * 1) / 2;
    }
  }
  return stops;
}

function sampleStops(stops, t) {
  const pct = Math.max(0, Math.min(1, t)) * 100;
  if (pct <= stops[0].position) return { ...stops[0].color };
  const last = stops[stops.length - 1];
  if (pct >= last.position) return { ...last.color };
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (pct >= a.position && pct <= b.position) {
      const span = b.position - a.position || 1;
      const f = (pct - a.position) / span;
      return {
        r: a.color.r + (b.color.r - a.color.r) * f,
        g: a.color.g + (b.color.g - a.color.g) * f,
        b: a.color.b + (b.color.b - a.color.b) * f,
        a: a.color.a + (b.color.a - a.color.a) * f,
      };
    }
  }
  return { ...last.color };
}

function parseLayers(value) {
  const text = String(value).trim();
  if (/^none$/i.test(text)) return [];
  return splitTopLevel(text).map((layer) => {
    // A bitmap cannot be read here; it is modelled as the brightest pixel any
    // photo can produce, i.e. pure white (the caller may lower that with the
    // theme's own brightness() filter).
    if (/^(url|image-set)\(/i.test(layer)) return { kind: "wallpaper" };
    const m = layer.match(/^(radial|linear)-gradient\((.*)\)$/is);
    if (!m) throw new Error(`unsupported background layer: ${layer.slice(0, 40)}`);
    const [, kind, body] = m;
    if (kind === "radial") {
      const head = body.match(/^\s*circle\s+([\d.]+)px\s+at\s+(-?[\d.]+)%\s+(-?[\d.]+)%\s*,\s*/i);
      if (!head) throw new Error(`unsupported radial form: ${body.slice(0, 40)}`);
      return {
        kind,
        radius: parseFloat(head[1]),
        cx: parseFloat(head[2]) / 100,
        cy: parseFloat(head[3]) / 100,
        stops: parseStops(body.slice(head[0].length)),
      };
    }
    const angleMatch = body.match(/^\s*(-?[\d.]+)deg\s*,\s*/i);
    if (!angleMatch) throw new Error(`unsupported linear form: ${body.slice(0, 40)}`);
    return { kind, angle: parseFloat(angleMatch[1]), stops: parseStops(body.slice(angleMatch[0].length)) };
  });
}

/** Colour of one layer at a normalised point (x,y in 0..1) of a w×h box. */
function layerColor(layer, x, y, w, h) {
  if (layer.kind === "wallpaper") return layer.base;
  if (layer.kind === "radial") {
    const dx = (x - layer.cx) * w;
    const dy = (y - layer.cy) * h;
    const distance = Math.hypot(dx, dy);
    return sampleStops(layer.stops, distance / layer.radius);
  }
  // CSS angle: 0deg = to top, clockwise. Gradient line length for a box.
  const theta = (layer.angle * Math.PI) / 180;
  const dirX = Math.sin(theta);
  const dirY = -Math.cos(theta);
  const length = Math.abs(w * dirX) + Math.abs(h * dirY);
  // Projection of the point onto the gradient line, measured from the far corner.
  const px = (x - 0.5) * w;
  const py = (y - 0.5) * h;
  const projection = px * dirX + py * dirY;
  const t = projection / length + 0.5;
  return sampleStops(layer.stops, t);
}

export const VIEWPORTS = [
  { name: "1280x720", w: 1280, h: 720 },
  { name: "1440x900", w: 1440, h: 900 },
  { name: "1920x1080", w: 1920, h: 1080 },
  { name: "2560x1440", w: 2560, h: 1440 },
];

/**
 * Returns { peak, peakHex, peakLuminance, perViewport } for the given
 * --background-image value, plus the layers so reports can name them.
 */
export function evaluateBackground(value, { samples = 96, wallpaperBase } = {}) {
  const layers = parseLayers(value);
  for (const layer of layers) {
    if (layer.kind === "wallpaper") layer.base = wallpaperBase ?? { r: 255, g: 255, b: 255, a: 1 };
  }
  if (layers.length === 0) {
    return { layers, peak: { r: 8, g: 2, b: 40, a: 1 }, peakHex: "#080228", peakLuminance: luminance("#080228"), perViewport: [] };
  }
  // The bottom-most layer must be opaque, or the window colour would show.
  const bottom = layers[layers.length - 1];
  if (bottom.kind !== "wallpaper" && bottom.kind === "linear" && bottom.stops.some((stop) => stop.color.a < 1)) {
    throw new Error("bottom gradient layer must be opaque, otherwise nothing bounds the backdrop");
  }
  const perViewport = [];
  let peak = { r: 0, g: 0, b: 0, a: 1 };
  let peakLuminance = -1;
  let peakAt = null;

  for (const vp of VIEWPORTS) {
    for (let iy = 0; iy <= samples; iy += 1) {
      for (let ix = 0; ix <= samples; ix += 1) {
        const x = ix / samples;
        const y = iy / samples;
        // Composite layers bottom-up; the first layer in CSS is the top one.
        let color = { r: 255, g: 255, b: 255, a: 1 }; // opaque window backdrop
        for (let i = layers.length - 1; i >= 0; i -= 1) {
          color = composite(layerColor(layers[i], x, y, vp.w, vp.h), color);
        }
        const l = luminance(color);
        if (l > peakLuminance) {
          peakLuminance = l;
          peak = color;
          peakAt = { viewport: vp.name, x, y };
        }
      }
    }
    perViewport.push({ viewport: vp.name });
  }

  return { layers, peak, peakHex: toHex(peak), peakLuminance, peakAt, perViewport };
}
