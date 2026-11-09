// Renders each build's palette into a mock Discord layout.
//
//   node tools/preview.mjs        (npm run preview)
//
// Output, one page per build:
//   docs/preview.html          Comfy Deep
//
// Every page comes from the same mock markup; only the colour variables differ, and
// they are read from the shipped stylesheet, so a page cannot describe a palette
// that is not in the file.
//
// The markup is a mock, not Discord: it shows the palette (surfaces, text ramp,
// accents, semantic colours) at realistic density. It does not exercise the
// class-name selector fixes — those are covered by test/theme.test.js.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { loadTheme } from "../test/palette.js";
import { toHex } from "../test/color.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const BUILDS = [{ id: "", file: "ComfyDeep.theme.css", title: "Comfy Deep" }];

function mockVars(theme) {
  const raw = (name) => theme.resolve(name);
  return {
    // The build's own backdrop declaration, used verbatim.
    background: raw("--background-image"),
    vars: {
      "--m-rail": raw("--comfy-tertiary"),
      "--m-sidebar": raw("--comfy-sidebar"),
      "--m-chat": raw("--comfy-base"),
      "--m-raised": raw("--comfy-raised"),
      "--m-input": raw("--comfy-input"),
      "--m-border": raw("--border-subtle"),
      "--m-text": raw("--comfy-text"),
      "--m-text-strong": raw("--comfy-text-strong"),
      "--m-text-muted": raw("--comfy-text-muted"),
      "--m-text-dim": raw("--comfy-text-dim"),
      "--m-channel": raw("--channel-normal"),
      "--m-channel-muted": raw("--channel-muted"),
      "--m-unread": raw("--channel-unread"),
      "--m-accent": raw("--comfy-accent"),
      "--m-accent-fill": raw("--comfy-accent-fill"),
      "--m-on-accent": raw("--comfy-on-accent"),
      "--m-selected-bg": raw("--channel-selected-bg"),
      "--m-selected-fg": raw("--channel-selected"),
      "--m-success": raw("--comfy-success"),
      "--m-warning": raw("--comfy-warning"),
      "--m-danger": raw("--comfy-danger"),
      "--m-offline": raw("--comfy-text-dim"),
      // Same expression the stylesheet uses on mentioned rows.
      "--m-mention-bg": `hsl(from ${raw("--main-color")} h s l / 0.16)`,
      "--m-mention-pill": raw("--comfy-accent-fill"),
      "--m-mention-pill-fg": raw("--comfy-mention-text"),
      "--m-scrollbar": raw("--scrollbar-auto-thumb"),
      "--m-filter": raw("--background-filter"),
    },
  };
}


const THEMES_MOCK = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>__TITLE__</title>
<style>
  :root { __VARS__ --m-bg: __BACKGROUND__; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    font-family: "Noto Sans", "DejaVu Sans", system-ui, sans-serif;
    font-size: 15px; color: var(--m-text); background: var(--m-chat); overflow: hidden;
  }
  .screen { position: fixed; inset: 0; }
  .screen::before {
    content: ""; position: absolute; inset: 0;
    background: var(--m-bg); filter: var(--m-filter);
    background-position: center; background-size: cover; background-repeat: no-repeat;
  }
  .veil { position: absolute; inset: 0; background: var(--m-rail); opacity: .72; }
  .panel {
    position: absolute; left: 12%; top: 8%; right: 12%; bottom: 8%;
    display: flex; background: var(--m-chat); border: 1px solid var(--m-border);
    border-radius: 8px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, .55);
  }
  .nav { width: 26%; background: var(--m-sidebar); border-right: 1px solid var(--m-border); padding: 14px 10px; }
  .nav .who { display: flex; align-items: center; gap: 10px; padding: 6px 8px 16px; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--m-accent), var(--m-raised)); border: 1px solid var(--m-border); }
  .nav .who b { display: block; color: var(--m-text-strong); font-size: 15px; }
  .nav .who small { color: var(--m-text-muted); font-size: 12px; }
  .nav .group { margin: 14px 6px 6px; font-size: 11px; letter-spacing: .8px; text-transform: uppercase; color: var(--m-text-muted); }
  .nav .item { padding: 8px 10px; border-radius: 6px; color: var(--m-text-muted); font-size: 14px; margin-bottom: 2px; }
  .nav .item.active { background: var(--m-accent); color: var(--m-selected-fg); font-weight: 600; }
  .main { flex: 1; padding: 26px 34px; overflow: hidden; }
  .main h1 { margin: 0 0 18px; font-size: 22px; color: var(--m-text-strong); }
  .tabs { display: flex; gap: 22px; border-bottom: 1px solid var(--m-border); margin-bottom: 20px; }
  .tab { padding: 0 2px 10px; color: var(--m-text-muted); font-size: 14px; }
  .tab.active { color: var(--m-text-strong); border-bottom: 2px solid var(--m-accent); font-weight: 600; }
  .hint { font-size: 12.5px; color: var(--m-text-muted); line-height: 1.5; margin-bottom: 14px; }
  .row {
    display: flex; align-items: flex-start; gap: 16px; padding: 14px 16px;
    background: var(--m-raised); border: 1px solid var(--m-border); border-radius: 8px; margin-bottom: 10px;
  }
  .row .meta { flex: 1; }
  .row .name { font-weight: 700; color: var(--m-text-strong); font-size: 15px; }
  .row .by { font-size: 11.5px; color: var(--m-text-muted); margin: 2px 0 6px; }
  .row .desc { font-size: 12.5px; color: var(--m-text-muted); line-height: 1.45; }
  .row .desc a { color: var(--m-accent); text-decoration: none; }
  .toggle { width: 34px; height: 20px; border-radius: 10px; background: var(--m-border); position: relative; flex: 0 0 34px; margin-top: 2px; }
  .toggle::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--m-text-muted); }
  .toggle.on { background: var(--m-accent); }
  .toggle.on::after { left: 16px; background: var(--m-selected-fg); }
  .note { margin-top: 18px; font-size: 11.5px; color: var(--m-text-dim); line-height: 1.5; }
</style>
</head>
<body>
<div class="screen">
  <div class="veil"></div>
  <div class="panel">
    <div class="nav">
      <div class="who"><div class="avatar"></div><div><b>Nova</b><small>Edit Profile</small></div></div>
      <div class="group">User Settings</div>
      <div class="item">Account</div>
      <div class="item">Appearance</div>
      <div class="item">Accessibility</div>
      <div class="group">Vencord Settings</div>
      <div class="item">Vencord</div>
      <div class="item">Plugins</div>
      <div class="item active">Themes</div>
      <div class="item">Updater</div>
      <div class="item">Backup &amp; Restore</div>
    </div>
    <div class="main">
      <h1>Themes</h1>
      <div class="tabs"><div class="tab active">Local Themes</div><div class="tab">Online Themes</div></div>
      <div class="hint">Themes are standalone CSS files. Drop one in the themes folder and toggle it here - the list entry is the <b>@name</b> field inside the file, not the filename.</div>
      <div class="row">
        <div class="meta">
          <div class="name">Comfy Deep</div>
          <div class="by">by Comfy Themes (palette) - Discord port by GeeNuTz</div>
          <div class="desc">Comfy Deep for Discord: near-black navy, teal text, low-glare surfaces. ClearVision v7 layout, measured contrast. <a href="#">Website</a></div>
        </div>
        <div class="toggle on"></div>
      </div>
      <div class="row">
        <div class="meta">
          <div class="name">Comfy Deep (mobile)</div>
          <div class="by">by GeeNuTz - Revenge theme</div>
          <div class="desc">The same palette as a Revenge manifest: ComfyDeep-Revenge.json. Installed from the Revenge themes page, so it is not listed in this folder.</div>
        </div>
        <div class="toggle"></div>
      </div>
      <div class="note">One palette, two clients: the stylesheet here and the JSON manifest for Revenge.</div>
    </div>
  </div>
</div>
</body>
</html>`;

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
    <span class="spacer"></span><span>Comfy Deep</span><span class="spacer"></span>
    <div class="dots"><i></i><i></i><i></i></div>
  </div>
  <div class="shell">
    <div class="rail">
      <div class="guild active">A</div><div class="guild">⚙</div><div class="guild">✦</div><div class="guild">◈</div>
      <hr><div class="guild">▲</div><div class="guild">◍</div><div class="guild">✿</div><hr><div class="guild">◔</div>
    </div>
    <div class="sidebar">
      <div class="server">Comfy Deep <span>⌄</span></div>
      <div class="channels">
        <div class="category">Text Channels</div>
        <div class="channel selected"><span class="hash">#</span> general</div>
        <div class="channel"><span class="hash">#</span> screenshots</div>
        <div class="channel"><span class="hash">#</span> themes</div>
        <div class="channel unread"><span class="hash">#</span> dev-log <span class="badge">3</span></div>
        <div class="channel muted"><span class="hash">#</span> archive</div>
        <div class="category">Voice</div>
        <div class="channel"><span class="hash">◔</span> Lounge</div>
        <div class="channel"><span class="hash">◔</span> Focus</div>
        <div class="category">Sessions</div>
        <div class="channel"><span class="hash">◔</span> Studio</div>
      </div>
      <div class="userpanel">
        <div class="avatar"></div>
        <div class="who"><b>Nova</b><small>Online</small></div>
        <div class="icons">🎙 ✆ ⚙</div>
      </div>
    </div>
    <div class="chat">
      <div class="chathead"># general <em>palette talk, screenshots, whatever</em></div>
      <div class="messages">
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>Nova</b><span class="rolebadge">MEMBER</span><time>10/9/26, 20:44</time></div>
            <div class="text">the gradient finally reads right</div>
          </div>
        </div>
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>Wren</b><time>10/9/26, 20:51</time></div>
            <div class="text">loading it now, one sec</div>
            <div class="mention"><div class="text mentionline"><span class="pill">@Nova</span> the new palette is live</div></div>
            <div class="reaction me">🔥 2</div> <div class="reaction">😂 1</div>
          </div>
        </div>
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>Nova</b><span class="rolebadge">MEMBER</span><time>10/9/26, 20:57</time></div>
            <div class="text">yup — <a class="link" href="#">the changelog</a> has the details</div>
          </div>
        </div>
        <div class="divider">November 7, 2026</div>
        <div class="msg">
          <div class="avatar"></div>
          <div class="mbody">
            <div class="meta"><b>Nova</b><span class="rolebadge">MEMBER</span><time>11/7/26, 14:34</time></div>
            <div class="text"><a class="link" href="#">https://github.com/GeeNuTz/comfy-deep</a></div>
            <div class="card">
              <div class="thumb"></div>
              <div>
                <h4>Nova</h4>
                <p>Comfy Deep · one palette, two clients<br>Long-form text sits on the raised surface so it stays readable over the backdrop.</p>
              </div>
            </div>
            <div class="note">palette preview — layout is a mock</div>
          </div>
        </div>
      </div>
      <div class="composer">
        <div class="box">
          <span class="plus">+</span><span>Message #general</span><span class="tools">🖼 GIF 😊</span>
        </div>
      </div>
    </div>
    <div class="scroll"></div>
    <div class="members">
      <div class="role">Online — 3</div>
      <div class="member"><div class="avatar"></div><b>Nova</b><span class="tag">OWNER</span><span class="dot on"></span></div>
      <div class="member"><div class="avatar"></div><b>Kite</b><span class="rolebadge">MOD</span><span class="dot idle"></span></div>
      <div class="member"><div class="avatar"></div><b>Vela</b><span class="tag">bot</span><span class="dot dnd"></span></div>
      <div class="role">Offline — 3</div>
      <div class="member offline"><div class="avatar"></div><b>Juno</b><span class="dot off"></span></div>
      <div class="member offline"><div class="avatar"></div><b>Wren</b><span class="dot off"></span></div>
      <div class="member offline"><div class="avatar"></div><b>Pax</b><span class="dot off"></span></div>
    </div>
  </div>
</div>
</body>
</html>`;

function render({ title, subtitle, palette, template = MOCK }) {
  const vars = Object.entries(palette.vars)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
  return template.replaceAll("__TITLE__", title)
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
  out: "docs/preview-themes.html",
  title: "Comfy Deep — theme list preview",
  subtitle: "Settings - Themes",
  palette: mockVars(loadTheme(join(repoRoot, "ComfyDeep.theme.css"))),
  template: THEMES_MOCK,
});

for (const page of pages) {
  const html = render(page);
  writeFileSync(join(repoRoot, page.out), html);
  console.log(`wrote ${page.out} (${(html.length / 1024).toFixed(1)} kB)`);
}
