// Renders each build's palette into a mock Discord layout.
//
//   node tools/preview.mjs        (npm run preview)
//
// Output, one page per build:
//   docs/preview.html          Aetheris
//   docs/preview-bg.html       Aetheris BG
//   docs/preview-deep.html     Aetheris Deep
//   docs/preview-before.html   the 4.0.0 stylesheet kept in docs/legacy/
//
// Every page comes from the same mock markup; only the colour variables differ, and
// they are read from the shipped stylesheet, so a page cannot describe a palette
// that is not in the file.
//
// The markup is a mock, not Discord: it shows the palette (surfaces, text ramp,
// accents, semantic colours) at realistic density. It does not exercise the
// class-name selector fixes — those are covered by test/theme.test.js.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadTheme } from "../test/palette.js";
import { toHex } from "../test/color.js";
import { parseCss, collectVariables, resolveValue } from "../test/css.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const BUILDS = [
  { id: "", file: "Aetheris.theme.css", title: "Aetheris" },
  { id: "-bg", file: "Aetheris-BG.theme.css", title: "Aetheris BG" },
  { id: "-deep", file: "Aetheris-Deep.theme.css", title: "Aetheris Deep" },
];

function mockVars(theme) {
  const raw = (name) => theme.resolve(name);
  return {
    // The build's own backdrop declaration, used verbatim.
    background: raw("--background-image"),
    vars: {
      "--m-rail": raw("--aether-tertiary"),
      "--m-sidebar": raw("--aether-sidebar"),
      "--m-chat": raw("--aether-base"),
      "--m-raised": raw("--aether-raised"),
      "--m-input": raw("--aether-input"),
      "--m-border": raw("--border-subtle"),
      "--m-text": raw("--aether-text"),
      "--m-text-strong": raw("--aether-text-strong"),
      "--m-text-muted": raw("--aether-text-muted"),
      "--m-text-dim": raw("--aether-text-dim"),
      "--m-channel": raw("--channel-normal"),
      "--m-channel-muted": raw("--channel-muted"),
      "--m-unread": raw("--channel-unread"),
      "--m-accent": raw("--aether-accent"),
      "--m-accent-fill": raw("--aether-accent-fill"),
      "--m-on-accent": raw("--aether-on-accent"),
      "--m-selected-bg": raw("--channel-selected-bg"),
      "--m-selected-fg": raw("--channel-selected"),
      "--m-success": raw("--aether-success"),
      "--m-warning": raw("--aether-warning"),
      "--m-danger": raw("--aether-danger"),
      "--m-offline": raw("--aether-text-dim"),
      // Same expression the stylesheet uses on mentioned rows.
      "--m-mention-bg": `hsl(from ${raw("--main-color")} h s l / 0.16)`,
      "--m-mention-pill": raw("--aether-accent-fill"),
      "--m-mention-pill-fg": raw("--aether-mention-text"),
      "--m-scrollbar": raw("--scrollbar-auto-thumb"),
      "--m-filter": raw("--background-filter"),
    },
  };
}

/** The 4.0.0 build only has Discord/ClearVision variables, so map them onto the mock. */
function legacyVars() {
  const path = join(repoRoot, "docs", "legacy", "Aetheris-4.0.0.css");
  if (!existsSync(path)) throw new Error(`missing previous build: ${path}`);
  const parsed = parseCss(readFileSync(path, "utf8"));
  const vars = collectVariables(parsed.blocks);
  const get = (name, fallback) => {
    if (!vars.has(name)) return fallback;
    return resolveValue(vars.get(name), vars).replace(/\s*!important\s*$/, "");
  };
  return {
    background: "none",
    vars: {
      "--m-rail": get("--background-tertiary", "#0c0c0e"),
      "--m-sidebar": get("--background-secondary", "#080228"),
      "--m-chat": get("--background-primary", "#080228"),
      "--m-raised": get("--embed-background", "#0e0449"),
      "--m-input": get("--channeltextarea-background", "#0c0c0e"),
      "--m-border": "rgba(255, 255, 255, 0.07)",
      "--m-text": get("--text-normal", "#cbadff"),
      "--m-text-strong": get("--text-primary", "#e9d9ff"),
      "--m-text-muted": get("--text-muted", "#8957ff"),
      "--m-text-dim": get("--offline-color", "#6e6a86"),
      "--m-channel": get("--channels-default", "#8957ff"),
      "--m-channel-muted": get("--interactive-muted", "#8957ff"),
      "--m-unread": get("--channel-unread", "#e9d9ff"),
      "--m-accent": get("--main-color", "#9360f0"),
      "--m-accent-fill": get("--main-color", "#9360f0"),
      "--m-on-accent": "#ffffff",
      "--m-selected-bg": get("--channel-selected-bg", "#9360f0"),
      "--m-selected-fg": get("--channel-selected", "#ffffff"),
      "--m-success": get("--status-online", get("--success-color", "#43b581")),
      "--m-warning": get("--status-idle", "#f6c177"),
      "--m-danger": get("--danger-color", "#b52258"),
      "--m-offline": get("--offline-color", "#6e6a86"),
      "--m-mention-bg": "rgba(114, 0, 0, 0.15)",
      "--m-mention-pill": get("--main-color", "#9360f0"),
      "--m-mention-pill-fg": get("--text-secondary", "#eae1ef"),
      "--m-scrollbar": get("--scrollbar-auto-thumb", "#d0b8f4"),
      "--m-filter": "none",
    },
  };
}

const MOCK = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>__TITLE__</title>
<style>
  :root { __VARS__ --m-bg: __BACKGROUND__; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    font-family: "Roboto", "Noto Sans", "DejaVu Sans", system-ui, sans-serif;
    font-size: 15px; color: var(--m-text); background: var(--m-chat); overflow: hidden;
  }
  .app { height: 100vh; display: flex; flex-direction: column; }
  .app::before {
    content: ""; position: fixed; inset: 0; z-index: 0;
    background: var(--m-bg); filter: var(--m-filter);
    background-position: center; background-size: cover; background-repeat: no-repeat;
  }
  .app > * { position: relative; z-index: 1; }
  .titlebar {
    height: 32px; flex: 0 0 32px; display: flex; align-items: center; gap: 10px;
    padding: 0 12px; background: var(--m-rail); border-bottom: 1px solid var(--m-border);
    font-size: 12px; color: var(--m-text-muted);
  }
  .titlebar strong { color: var(--m-text); font-weight: 700; letter-spacing: .2px; }
  .titlebar .spacer { flex: 1; }
  .dots { display: flex; gap: 8px; }
  .dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--m-border); display: block; }
  .shell { flex: 1; display: flex; min-height: 0; }
  .rail {
    width: 72px; flex: 0 0 72px; background: var(--m-rail); border-right: 1px solid var(--m-border);
    display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 10px 0;
  }
  .guild {
    width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center;
    background: var(--m-raised); color: var(--m-text); font-weight: 700; font-size: 13px;
    border: 1px solid var(--m-border);
  }
  .guild.active { border-radius: 15px; background: var(--m-accent); color: var(--m-selected-fg); border-color: var(--m-accent); }
  .rail hr { width: 28px; border: 0; border-top: 1px solid var(--m-border); margin: 4px 0; }
  .sidebar {
    width: 238px; flex: 0 0 238px; background: var(--m-sidebar);
    border-right: 1px solid var(--m-border); display: flex; flex-direction: column; min-height: 0;
  }
  .server { padding: 12px 14px; font-weight: 700; color: var(--m-text-strong); border-bottom: 1px solid var(--m-border); display: flex; align-items: center; }
  .server span { margin-left: auto; color: var(--m-text-muted); font-weight: 400; }
  .channels { padding: 10px 0; overflow: hidden; flex: 1; }
  .category {
    display: flex; align-items: center; gap: 8px; padding: 12px 14px 6px;
    font-size: 11px; letter-spacing: .8px; text-transform: uppercase; color: var(--m-text-muted);
  }
  .category::after { content: ""; flex: 1; border-top: 1px solid var(--m-border); }
  .channel {
    display: flex; align-items: center; gap: 8px; margin: 1px 8px; padding: 7px 10px;
    border-radius: 6px; color: var(--m-channel); font-size: 15px;
  }
  .channel .hash { color: var(--m-channel-muted); }
  .channel.muted { color: var(--m-channel-muted); }
  .channel.unread { color: var(--m-unread); font-weight: 700; }
  .channel.selected { background: var(--m-selected-bg); color: var(--m-selected-fg); font-weight: 600; }
  .channel.selected .hash { color: var(--m-selected-fg); opacity: .75; }
  .channel .badge { margin-left: auto; background: var(--m-danger); color: #fff; font-size: 11px; border-radius: 8px; padding: 0 6px; }
  .userpanel {
    height: 56px; flex: 0 0 56px; display: flex; align-items: center; gap: 8px;
    padding: 0 10px; background: var(--m-chat); border-top: 1px solid var(--m-border);
  }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%; flex: 0 0 32px;
    background: linear-gradient(135deg, var(--m-accent), var(--m-raised));
    border: 1px solid var(--m-border);
  }
  .userpanel .who { font-size: 13px; }
  .userpanel .who b { display: block; color: var(--m-text-strong); font-size: 14px; }
  .userpanel .who small { color: var(--m-text-muted); }
  .icons { margin-left: auto; display: flex; gap: 10px; color: var(--m-text-muted); font-size: 15px; }
  .chat { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--m-chat); }
  .chathead {
    height: 46px; flex: 0 0 46px; display: flex; align-items: center; gap: 8px;
    padding: 0 16px; border-bottom: 1px solid var(--m-border);
    background: var(--m-chat); font-weight: 700; color: var(--m-text-strong);
  }
  .chathead em { font-style: normal; font-weight: 400; color: var(--m-text-muted); font-size: 13px; padding-left: 8px; border-left: 1px solid var(--m-border); }
  .messages { flex: 1; overflow: hidden; padding: 16px 8px 10px 16px; position: relative; }
  .msg { display: flex; gap: 12px; padding: 6px 8px; border-radius: 4px; }
  .msg .mbody { flex: 1; min-width: 0; }
  .meta { display: flex; align-items: baseline; gap: 8px; }
  .meta b { color: var(--m-text-strong); font-weight: 600; font-size: 15px; }
  .meta time { color: var(--m-text-muted); font-size: 11px; }
  .text { color: var(--m-text); margin-top: 2px; line-height: 1.35; }
  .text.mentionline { color: var(--m-text-strong); }
  .mention {
    background: var(--m-mention-bg); box-shadow: inset 2px 0 0 var(--m-accent);
    border-radius: 4px; padding: 2px 8px; margin: 4px 0 4px -8px;
  }
  .pill {
    background: var(--m-mention-pill); color: var(--m-mention-pill-fg);
    border-radius: 5px; padding: 0 5px; font-weight: 500;
  }
  .link { color: var(--m-accent); text-decoration: none; }
  .divider { display: flex; align-items: center; gap: 10px; margin: 14px 8px 6px; color: var(--m-text-muted); font-size: 11px; }
  .divider::before, .divider::after { content: ""; flex: 1; border-top: 1px solid var(--m-border); }
  .card {
    margin-top: 6px; display: flex; background: var(--m-raised); border: 1px solid var(--m-border);
    border-left: 3px solid var(--m-accent); border-radius: 6px; padding: 10px 12px; max-width: 430px;
  }
  .card .thumb { width: 64px; height: 64px; border-radius: 6px; margin-right: 12px; background: linear-gradient(140deg, var(--m-accent), var(--m-chat)); flex: 0 0 64px; }
  .card h4 { margin: 0 0 4px; font-size: 14px; color: var(--m-text-strong); }
  .card p { margin: 0; font-size: 13px; color: var(--m-text-muted); line-height: 1.35; }
  .composer { padding: 0 16px 14px; }
  .composer .box {
    display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 14px;
    background: var(--m-input); border: 1px solid var(--m-border); border-radius: 10px; color: var(--m-text-muted);
  }
  .composer .box .plus { width: 20px; height: 20px; border-radius: 50%; background: var(--m-raised); display: grid; place-items: center; color: var(--m-text); font-size: 13px; }
  .composer .box .tools { margin-left: auto; display: flex; gap: 12px; }
  .scroll { width: 8px; background: var(--m-scrollbar); border-radius: 4px; margin: 6px 4px 6px 0; flex: 0 0 8px; }
  .members {
    width: 236px; flex: 0 0 236px; background: var(--m-sidebar);
    border-left: 1px solid var(--m-border); padding: 12px 8px; overflow: hidden;
  }
  .members .role { font-size: 11px; text-transform: uppercase; letter-spacing: .8px; color: var(--m-text-muted); margin: 10px 8px 6px; }
  .member { display: flex; align-items: center; gap: 9px; padding: 6px 8px; border-radius: 6px; color: var(--m-text-muted); font-size: 14px; }
  .member b { color: var(--m-text); font-weight: 500; }
  .member.offline b { color: var(--m-text-dim); font-weight: 400; }
  .dot { width: 9px; height: 9px; border-radius: 50%; margin-left: auto; flex: 0 0 9px; }
  .dot.on { background: var(--m-success); }
  .dot.idle { background: var(--m-warning); }
  .dot.dnd { background: var(--m-danger); }
  .dot.off { background: var(--m-offline); }
  .rolebadge { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; background: var(--m-accent-fill); color: var(--m-on-accent); }
  .tag { font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid var(--m-border); color: var(--m-text-muted); }
  .reaction { display: inline-flex; align-items: center; gap: 5px; margin-top: 6px; padding: 2px 8px; border-radius: 10px; background: var(--m-raised); border: 1px solid var(--m-border); font-size: 12px; color: var(--m-text-muted); }
  .reaction.me { background: var(--m-accent); border-color: var(--m-accent); color: var(--m-selected-fg); }
  .note { position: absolute; right: 18px; bottom: 10px; font-size: 11px; color: var(--m-text-muted); }
</style>
</head>
<body>
<div class="app">
  <div class="titlebar">
    <strong>ClearVision 7.0.1</strong> <span>__SUBTITLE__</span>
    <span class="spacer"></span><span>Bonkerz</span><span class="spacer"></span>
    <div class="dots"><i></i><i></i><i></i></div>
  </div>
  <div class="shell">
    <div class="rail">
      <div class="guild active">B</div><div class="guild">⚙</div><div class="guild">✦</div><div class="guild">◈</div>
      <hr><div class="guild">▲</div><div class="guild">◍</div><div class="guild">✿</div><hr><div class="guild">◔</div>
    </div>
    <div class="sidebar">
      <div class="server">Bonkerz <span>⌄</span></div>
      <div class="channels">
        <div class="category">Text Channels</div>
        <div class="channel selected"><span class="hash">#</span> the-asylum</div>
        <div class="channel"><span class="hash">#</span> unemployed-activities</div>
        <div class="channel"><span class="hash">#</span> yap-central</div>
        <div class="channel unread"><span class="hash">#</span> isle-feed <span class="badge">3</span></div>
        <div class="channel muted"><span class="hash">#</span> old-bits</div>
        <div class="category">Meecha Voice</div>
        <div class="channel"><span class="hash">◔</span> Meccha #1</div>
        <div class="channel"><span class="hash">◔</span> Meccha #2</div>
        <div class="category">Isle Voice</div>
        <div class="channel"><span class="hash">◔</span> Isle #1</div>
      </div>
      <div class="userpanel">
        <div class="avatar"></div>
        <div class="who"><b>GeeNuTz</b><small>Online</small></div>
        <div class="icons">🎙 ✆ ⚙</div>
      </div>
    </div>
    <div class="chat">
      <div class="chathead"># the-asylum <em>vent, shitpost, exist</em></div>
      <div class="messages">
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>GeeNuTz</b><span class="rolebadge">ISLE</span><time>10/9/26, 20:44</time></div>
            <div class="text">lmao</div>
          </div>
        </div>
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>esculho ching</b><time>10/9/26, 20:51</time></div>
            <div class="text">bro trapp you freaky</div>
            <div class="mention"><div class="text mentionline"><span class="pill">@GeeNuTz</span> you smoking that 0.5 cheese sherbet</div></div>
            <div class="reaction me">🔥 2</div> <div class="reaction">😂 1</div>
          </div>
        </div>
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>GeeNuTz</b><span class="rolebadge">ISLE</span><time>10/9/26, 20:57</time></div>
            <div class="text">yup — see <a class="link" href="#">the archive thread</a></div>
          </div>
        </div>
        <div class="divider">November 7, 2026</div>
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>GeeNuTz</b><span class="rolebadge">ISLE</span><time>11/7/26, 14:34</time></div>
            <div class="text"><a class="link" href="#">https://discord.com/users/117868621859403543</a></div>
            <div class="card">
              <div class="thumb"></div>
              <div>
                <h4>GeeNuTz</h4>
                <p>geenutz · Zen Baboon · ISLE<br>Long-form text sits on the raised surface so it stays readable over the backdrop.</p>
              </div>
            </div>
            <div class="note">palette preview — layout is a mock</div>
          </div>
        </div>
      </div>
      <div class="composer">
        <div class="box">
          <span class="plus">+</span><span>Message #the-asylum</span><span class="tools">🖼 GIF 😊</span>
        </div>
      </div>
    </div>
    <div class="scroll"></div>
    <div class="members">
      <div class="role">Online — 3</div>
      <div class="member"><div class="avatar"></div><b>GeeNuTz</b><span class="tag">ISLE</span><span class="dot on"></span></div>
      <div class="member"><div class="avatar"></div><b>Snoop</b><span class="rolebadge">peep</span><span class="dot idle"></span></div>
      <div class="member"><div class="avatar"></div><b>Meccha</b><span class="tag">bot</span><span class="dot dnd"></span></div>
      <div class="role">Offline — 3</div>
      <div class="member offline"><div class="avatar"></div><b>samzoflame</b><span class="dot off"></span></div>
      <div class="member offline"><div class="avatar"></div><b>esculho ching</b><span class="dot off"></span></div>
      <div class="member offline"><div class="avatar"></div><b>TrapGodd4</b><span class="dot off"></span></div>
    </div>
  </div>
</div>
</body>
</html>`;

function render({ title, subtitle, palette }) {
  const vars = Object.entries(palette.vars)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
  return MOCK.replaceAll("__TITLE__", title)
    .replace("__SUBTITLE__", subtitle)
    .replace("__VARS__", vars)
    .replace("__BACKGROUND__", palette.background);
}

const pages = BUILDS.map((build) => ({
  out: `docs/preview${build.id}.html`,
  title: `${build.title} — palette preview`,
  subtitle: build.title,
  palette: mockVars(loadTheme(join(repoRoot, build.file))),
}));

pages.push({
  out: "docs/preview-before.html",
  title: "Aetheris 4.0.0 — palette preview",
  subtitle: "Aetheris 4.0.0 (previous build)",
  palette: legacyVars(),
});

for (const page of pages) {
  const html = render(page);
  writeFileSync(join(repoRoot, page.out), html);
  console.log(`wrote ${page.out} (${(html.length / 1024).toFixed(1)} kB)`);
}
