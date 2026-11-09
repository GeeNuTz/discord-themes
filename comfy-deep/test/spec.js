// The contract: which pairs must stay readable, and what "readable" means.
//
// `min` is the WCAG 2.1 AA floor for the pair's text size:
//   4.5  normal text (timestamps, placeholders, labels, channel names)
//   3.0  large/bold text and UI glyph boundaries
//   7.0  the main reading surfaces, where long-form text lives
//
// Every entry names the surface it sits on. Adding a colour to the theme means
// adding its pair here; test/theme.test.js fails if a pair cannot be resolved.

export const AA = { normal: 4.5, large: 3.0, body: 7.0 };

export const PAIRS = [
  // --- Canvas text -------------------------------------------------------
  { fg: "--text-default", bg: "--background-primary", min: AA.body, label: "message text on the chat canvas" },
  { fg: "--text-normal", bg: "--background-primary", min: AA.body, label: "body text on the chat canvas" },
  { fg: "--text-normal", bg: "--background-secondary", min: AA.body, label: "body text on the sidebar" },
  { fg: "--header-primary", bg: "--background-secondary", min: AA.body, label: "channel title on the sidebar" },
  { fg: "--normal-text", bg: "--peak", min: AA.body, label: "text directly on the gradient" },

  // --- Secondary text ----------------------------------------------------
  { fg: "--text-muted", bg: "--background-primary", min: AA.normal, label: "timestamps on the canvas" },
  { fg: "--text-muted", bg: "--bg-surface-overlay", min: AA.normal, label: "timestamps in a popout" },
  { fg: "--text-subtle", bg: "--background-secondary", min: AA.normal, label: "secondary labels in the sidebar" },
  { fg: "--text-muted", bg: "--comfy-input", min: AA.normal, label: "composer placeholder" },
  { fg: "--text-default", bg: "--comfy-input", min: AA.body, label: "composer text" },

  // --- Channel list ------------------------------------------------------
  { fg: "--channel-normal", bg: "--background-secondary", min: AA.normal, label: "channel name" },
  { fg: "--channel-muted", bg: "--background-secondary", min: AA.normal, label: "muted channel name" },
  { fg: "--channel-unread", bg: "--background-secondary", min: AA.normal, label: "unread channel name" },
  { fg: "--channel-selected", bg: "--channel-selected-bg", min: AA.normal, label: "selected pill label" },

  // --- Interactive & semantic -------------------------------------------
  { fg: "--text-link", bg: "--background-primary", min: AA.normal, label: "links" },
  { fg: "--text-danger", bg: "--background-primary", min: AA.normal, label: "danger text" },
  { fg: "--text-feedback-positive", bg: "--background-primary", min: AA.normal, label: "positive feedback" },
  { fg: "--text-feedback-warning", bg: "--background-primary", min: AA.normal, label: "warning feedback" },
  { fg: "--status-offline", bg: "--background-secondary", min: AA.normal, label: "offline member name" },
  { fg: "--interactive-normal", bg: "--background-secondary", min: AA.normal, label: "icon default" },
  { fg: "--interactive-hover", bg: "--background-secondary", min: AA.normal, label: "icon hover" },
  { fg: "--interactive-muted", bg: "--background-secondary", min: AA.normal, label: "icon muted" },

  // --- Labels on filled surfaces (white text) ---------------------------
  { fg: "--comfy-on-accent", bg: "--brand-360", min: AA.normal, label: "brand button label" },
  { fg: "--comfy-on-accent", bg: "--comfy-accent-fill", min: AA.normal, label: "accent fill label" },
  { fg: "--comfy-on-accent", bg: "--comfy-danger-fill", min: AA.normal, label: "destructive button label" },
  { fg: "--comfy-on-accent", bg: "--comfy-success-fill", min: AA.normal, label: "confirm button label" },
  { fg: "--comfy-mention-text", bg: "--comfy-accent-fill", min: AA.normal, label: "inline mention pill" },
];

// Colours that would mean palette leakage: a neighbour theme or Discord's own
// blurple surviving into a teal build. Each is a bug, not a style choice.
export const FOREIGN_COLOURS = [
  { value: "#5865f2", why: "Discord blurple: a brand-* ramp was left unmapped" },
  { value: "#8957ff", why: "Aetheris violet: the sibling theme leaked in" },
  { value: "#9360f0", why: "Aetheris accent: the sibling theme leaked in" },
  { value: "#080228", why: "Aetheris canvas: the sibling theme leaked in" },
  { value: "#7150eb", why: 'the old purple "red": danger lost its meaning' },
];

// ClearVision v7 settings this theme must supply, or the framework falls back to
// Sapphire defaults (blue).
export const CLEARVISION_CONTRACT = [
  "--main-color",
  "--hover-color",
  "--success-color",
  "--danger-color",
  "--online-color",
  "--idle-color",
  "--dnd-color",
  "--streaming-color",
  "--offline-color",
  "--background-shading-percent",
  "--background-image",
  "--background-position",
  "--background-size",
  "--background-attachment",
  "--background-filter",
  "--user-popout-image",
  "--user-popout-position",
  "--user-popout-size",
  "--user-popout-attachment",
  "--user-popout-filter",
  "--user-modal-image",
  "--user-modal-position",
  "--user-modal-size",
  "--user-modal-attachment",
  "--user-modal-filter",
  "--main-font",
  "--code-font",
  "--channel-normal",
  "--channel-muted",
  "--channel-hover",
  "--channel-selected",
  "--channel-selected-bg",
  "--channel-unread",
  "--channel-unread-hover",
  "--focus-color",
];

// Discord / ClearVision own these; the theme may read them without defining them.
export const EXTERNAL_VARIABLES = ["--saturation-factor"];

// The canvas must stay dark enough for the text ramp to be honest.
export const PEAK_LUMINANCE_LIMIT = 0.05;

// A wallpaper build bounds the image instead of choosing it: the brightest pixel
// any photo can produce after --background-filter. 0.35 keeps brightness() at or
// below roughly 0.7, which the panel alphas are tuned against.
export const WALLPAPER_BRIGHTNESS_LIMIT = 0.35;
