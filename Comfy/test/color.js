// Color math for the Comfy Deep theme tests. No dependencies.
// Every function is pure; the tests import it to keep the palette honest.

const HEX = /^#([0-9a-f]{3,8})$/i;

export function parseColor(input) {
  const value = String(input).trim().toLowerCase();

  const hex = value.match(HEX);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) throw new Error(`bad hex: ${input}`);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) throw new Error(`bad rgb: ${input}`);
    const num = (s) => {
      if (s.endsWith("%")) return (parseFloat(s) / 100) * 255;
      return parseFloat(s);
    };
    const alpha = parts[3] === undefined ? 1 : parseFloat(parts[3]);
    return { r: num(parts[0]), g: num(parts[1]), b: num(parts[2]), a: Number.isFinite(alpha) ? alpha : 1 };
  }

  throw new Error(`unsupported color: ${input}`);
}

export function toHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Source-over compositing of `top` onto `bottom`. Bottom must be opaque. */
export function composite(top, bottom) {
  const base = bottom.a === undefined ? { ...bottom, a: 1 } : bottom;
  const a = top.a === undefined ? 1 : top.a;
  if (base.a !== 1) throw new Error("composite() needs an opaque backdrop");
  return {
    r: top.r * a + base.r * (1 - a),
    g: top.g * a + base.g * (1 - a),
    b: top.b * a + base.b * (1 - a),
    a: 1,
  };
}

function channel(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(color) {
  const c = typeof color === "string" ? parseColor(color) : color;
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG 2.1 contrast ratio between two opaque colors. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isOpaque(color) {
  const c = typeof color === "string" ? parseColor(color) : color;
  return (c.a === undefined ? 1 : c.a) >= 0.999;
}
