# Discord Themes

**One repository, one folder per theme. Each theme ships a desktop build (for Vesktop / Vencord)
and a mobile build (for Revenge), generated from the same palette.**

```
Aetheris/     Aetheris, Aetheris BG, Aetheris Deep + one Revenge manifest each
Comfy/        Comfy Deep + its Revenge manifest
```

## These themes are built on ClearVision — not standalone

To be plain about it: the desktop files are **customisations of ClearVision v7**, they do not
replace it. Every `.theme.css` here starts with

```css
@import url("https://clearvision.github.io/ClearVision-v7/main.css");
@import url("https://clearvision.github.io/ClearVision-v7/vencord.css");
```

and then overrides colour variables. So the split is:

| ClearVision v7 | This repository |
|---|---|
| layout, spacing, rounded rails, component styling — the interface itself | colour, canvas, type stack — no layout rules of its own |
| fetched by the client at runtime from `clearvision.github.io` | shipped as one file per build |

ClearVision is the ClearVision Team's code under Apache-2.0. This repo does not copy, fork or vendor
it — nothing of theirs lives in this checkout; the client downloads it when the theme loads. That is
also why a theme needs that host: with ClearVision unreachable the file still applies, but you get a
plain recoloured Discord without ClearVision's layout, not an error.

Mobile is the same idea one step removed: Revenge builds Discord's interface itself, and a theme
there is a JSON colour map (`spec: 2`). No ClearVision involved — which is why the mobile builds
carry only the palette, generated from the desktop stylesheet so the two can't drift.

| Theme | Folder | Desktop | Mobile | Palette |
|---|---|---|---|---|
| **Aetheris** | [`Aetheris/`](Aetheris/) | 3 builds: Aetheris, Aetheris BG, Aetheris Deep | 3 manifests, one per build | violet / indigo, AsterionVT's |
| **Comfy** | [`Comfy/`](Comfy/) | `ComfyDeep.theme.css` | `ComfyDeep-Revenge.json` | teal on near-black navy, from Comfy's `Deep` |

![Aetheris](Aetheris/docs/screenshots/aetheris.jpg)
![Comfy](Comfy/docs/screenshots/comfy-deep.jpg)

## Layout

```
<theme>/
  <Theme>.theme.css        the shipped desktop theme (ClearVision v7)
  <Theme>-Revenge.json     the shipped mobile theme (Revenge, spec 2)
  src/                     palette + template the two artifacts are generated from
  test/                    the contract: structure, contrast, drift
  tools/                   build / report / preview / verify
  docs/                    generated contrast report, previews, screenshots
  README.md CHANGELOG.md version.json package.json
tools/                     collection-level runner and publish gate
```

Each folder is self-contained: `cd <theme> && npm test` works on its own, and nothing in one theme
imports from another. The root only aggregates.

## Install

| Client | What to copy | Where |
|---|---|---|
| Vesktop / Vencord (Linux) | `<Theme>.theme.css` | `~/.config/Vencord/themes/` |
| Vesktop / Vencord (Windows) | `<Theme>.theme.css` | `%APPDATA%\Vencord\themes` |
| Vesktop (Flatpak) | `<Theme>.theme.css` | `~/.var/app/dev.vencord.Vesktop/config/Vencord/themes/` |
| Revenge (mobile) | `<Theme>-Revenge.json` | Settings → Revenge → Themes → **+** → paste a URL |

Then **Settings → Themes** on desktop and toggle it on. The list entry is the `@name` inside the
file, not the filename — so two files with the same `@name` are indistinguishable.

### Mobile without a public repo

Revenge installs a theme from a URL, and a private repo has no raw URL a phone can read. Serve the
release files from this machine instead — same Wi-Fi, nothing public:

```bash
npm run serve            # http://<your-lan-ip>:8099/  (npm run serve -- 9000 for another port)
```

Open that address on the phone, tap the theme, copy the link, paste it into
**Revenge → Themes → +**. The server only serves released `.theme.css` and `-Revenge.json` files,
read-only, and only inside the LAN — source, tests and docs return 404. Stop it with Ctrl-C once the
theme is installed; Revenge keeps its copy.

## Every theme is measured

Each theme ships a test suite that recomputes WCAG contrast for every text/surface pair against the
brightest pixel its own background can produce — a gradient is sampled, a wallpaper is bounded by
the theme's own `brightness()` filter. A pair under 4.5:1 fails the build. Reports live in
`<theme>/docs/CONTRAST.md` and are generated, never hand-written.

| Theme | Checks |
|---|---|
| Aetheris | 65 — three builds + three mobile manifests |
| Comfy Deep | 23 — stylesheet + mobile manifest |

## Development

```bash
npm test          # every theme's suite
npm run verify    # the publish gate: all suites, artifact drift, versions, secrets, git state
```

Per theme:

```bash
cd comfy-deep
npm run build     # src/ -> the shipped .css and .json
npm test
npm run report    # docs/CONTRAST.md
npm run preview   # docs/preview*.html behind the screenshots
npm run verify    # that theme's artifact gate
```

## Adding a theme

1. Copy the closest existing folder (it already has the template, tests, tools and CI wiring).
2. Replace `src/palettes/<name>.css` with the new palette and `src/variants.json` with its name,
   file name and description.
3. `npm run build`, `npm test`, `npm run report`, `npm run preview`.
4. Add a row to the table above and a folder link.
5. `cd .. && npm test && npm run verify` before committing.

## Credits

| Whose work | What |
|---|---|
| **AsterionVT** | The Aetheris palette and the original 4.0.0 theme (kept verbatim in `aetheris/docs/legacy/`). |
| **Comfy Themes** | The `Deep` colourscheme from [Comfy for Spicetify](https://github.com/Comfy-Themes/Spicetify). The Comfy Deep port is their design, not mine. |
| **ClearVision Team** | ClearVision v7 (Apache-2.0), the interface every desktop build is built on. Imported at runtime; not copied or vendored here. |
| **Quinxxxx** | The Meloso typeface used by Aetheris. |
| **Revenge** | The mobile client and its theme format, which this repo targets. |

## License

MIT for this collection's own code and docs — see [LICENSE](LICENSE). Palettes belong to their
authors (see Credits). ClearVision v7 is the ClearVision Team's, Apache-2.0, and is not
redistributed here. Nothing third-party is vendored in this repository.
