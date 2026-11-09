// Minimal CSS reader for the Aetheris theme: structure checks, custom-property
// collection and var() resolution. It understands only what the theme uses —
// nested at-rules are recorded, not evaluated.

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Split a declaration list on `;` at parenthesis depth 0. */
function splitDeclarations(body) {
  const out = [];
  let depth = 0;
  let buf = "";
  for (const ch of body) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === ";" && depth === 0) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

/**
 * Walk the stylesheet and return:
 *   blocks   [{ selector, decls: [{ prop, value }], index }]
 *   atRules  [{ prelude, body, index }]  (@font-face, @import is captured separately)
 *   imports  [url]
 *   balanced whether every `{` has a matching `}`
 */
export function parseCss(source) {
  const css = stripComments(source);
  const blocks = [];
  const atRules = [];
  const imports = [];
  let balanced = true;
  let i = 0;
  let order = 0;

  while (i < css.length) {
    // Skip whitespace.
    while (i < css.length && /\s/.test(css[i])) i += 1;
    if (i >= css.length) break;

    if (css[i] === "@") {
      const semi = css.indexOf(";", i);
      const brace = css.indexOf("{", i);
      if (brace === -1 || (semi !== -1 && semi < brace)) {
        // Statement at-rule: @import, @charset.
        const statement = css.slice(i, semi === -1 ? css.length : semi).trim();
        const m = statement.match(/@import\s+(?:url\(\s*)?["']?([^"')\s]+)/i);
        if (m) imports.push({ url: m[1], index: order });
        i = semi === -1 ? css.length : semi + 1;
        order += 1;
        continue;
      }
      // Block at-rule: find the matching brace.
      const start = brace;
      let depth = 0;
      let j = start;
      for (; j < css.length; j += 1) {
        if (css[j] === "{") depth += 1;
        else if (css[j] === "}") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      if (depth !== 0) balanced = false;
      const prelude = css.slice(i, start).trim();
      const body = css.slice(start + 1, j);
      atRules.push({ prelude, body, index: order });
      i = j + 1;
      order += 1;
      continue;
    }

    const open = css.indexOf("{", i);
    if (open === -1) break;
    let depth = 0;
    let j = open;
    for (; j < css.length; j += 1) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) balanced = false;
    const selector = css.slice(i, open).trim().replace(/\s+/g, " ");
    const body = css.slice(open + 1, j);
    const decls = splitDeclarations(body)
      .map((chunk) => {
        const colon = chunk.indexOf(":");
        if (colon === -1) return null;
        return {
          prop: chunk.slice(0, colon).trim(),
          value: chunk.slice(colon + 1).trim().replace(/\s+/g, " "),
        };
      })
      .filter(Boolean);
    blocks.push({ selector, decls, index: order });
    i = j + 1;
    order += 1;
  }

  return { blocks, atRules, imports, balanced };
}

/** Effective custom properties: later declarations win, as they do on <html>. */
export function collectVariables(blocks) {
  const vars = new Map();
  for (const block of blocks) {
    for (const { prop, value } of block.decls) {
      if (prop.startsWith("--")) vars.set(prop, value);
    }
  }
  return vars;
}

/** Resolve var() references. Throws on cycles and unknown properties. */
export function resolveValue(value, vars, seen = new Set()) {
  let out = String(value);
  for (let guard = 0; guard < 32; guard += 1) {
    const m = out.match(/var\(\s*(--[a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/i);
    if (!m) return out.trim();
    const [whole, name, fallback] = m;
    if (seen.has(name)) throw new Error(`var() cycle at ${name}`);
    let replacement;
    if (vars.has(name)) {
      const next = new Set(seen).add(name);
      replacement = resolveValue(vars.get(name), vars, next);
    } else if (fallback !== undefined) {
      replacement = resolveValue(fallback, vars, seen);
    } else {
      throw new Error(`undefined variable ${name}`);
    }
    out = out.replace(whole, replacement);
  }
  throw new Error(`unresolved value: ${value}`);
}

/** Names referenced through var() in a stylesheet (for the defined/used check). */
export function referencedVariables(source) {
  const names = new Set();
  for (const m of stripComments(source).matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) names.add(m[1]);
  return names;
}

export { stripComments };
