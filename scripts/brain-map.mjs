// node scripts/brain-map.mjs
//
// Draws the "brain map" on the profile README: the brain-and-circuit logo in the middle, with
// circuit lines out to a card for each area of work. Writes assets/brain-map-light.png and
// assets/brain-map-dark.png (GitHub shows the one that matches the viewer's theme), plus the
// README's "Explore the live brain map" button, assets/live-button-light.png and -dark.png.
// The top card draws my FileSure contribution graph from assets/work-contributions.json
// (date → contributions, copied from my work account's public graph).
//
// To update: edit CARDS below, run this, commit the PNGs. Needs Google Chrome
// (set CHROME_PATH if it isn't in /Applications).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1200;
const H = 980;
const CARD_W = 360;
const TOP_W = 420; // the activity card on top
const TOP_H = 256;

// Card positions are the card's top-left corner; `to: "top"` takes the line in from above and
// `to: "bottom"` from below. Lines in a card may use <b> for emphasis.
const CARDS = [
  { x: (W - TOP_W) / 2, y: 24, w: TOP_W, h: TOP_H, to: "bottom", icon: "commits", title: "GitHub activity at FileSure", heatmap: true, lines: [
    "<b>1,299</b> contributions in <b>83</b> active days",
    "Busiest day <b>77</b> · mirrored to my main graph",
  ] },
  { x: 24, y: 330, icon: "briefcase", title: "FileSure · 2026", lines: [
    "Intern → <b>Software Engineer</b> in 3 months",
    "Ran the company's tech with the founder",
    "Releases, incidents and <b>21</b> runbooks",
  ] },
  { x: 24, y: 552, icon: "search", title: "Search & Data", lines: [
    "<b>3.8M</b>-company screening rebuilt in 6 days",
    "<b>60 s</b> timeouts → answers in seconds",
    "<b>146</b> sub-sectors, measured precision",
  ] },
  { x: 24, y: 764, icon: "mentor", title: "Mentoring", lines: [
    "<b>25,000+</b> learners helped",
    "3+ years at Tutedude, part-time",
    "Full-stack · DSA · ML · React Native",
  ] },
  { x: W - 24 - CARD_W, y: 330, icon: "mobile", title: "Mobile", lines: [
    "iOS & Android apps <b>built from scratch</b>",
    "Google Play <b>1.0.7 → 1.0.13</b>",
    "App Store <b>1.0.9 → 1.0.13</b>",
    "<b>80+</b> over-the-air updates",
  ] },
  { x: W - 24 - CARD_W, y: 574, icon: "cloud", title: "Cloud & DevOps", lines: [
    "Led the backend move <b>AWS → GCP</b>",
    "Gated Jenkins CI/CD with rollbacks",
    "Search for <b>3.67M</b> companies, <b>8.7M</b> directors",
  ] },
  { x: W - 24 - CARD_W, y: 786, icon: "code", title: "Web & APIs", lines: [
    "Next.js · React · Node.js · Express",
    "Developer API: name → CIN/DIN lookup",
    "MongoDB · PostgreSQL · ClickHouse",
  ] },
  { x: (W - CARD_W) / 2, y: 842, to: "top", icon: "projects", title: "Side projects", lines: [
    "QuickCart · RN-Wallet",
    "AI-first HCP CRM · Portfolio",
  ] },
];

const CENTER = { x: W / 2, y: 584, r: 112 };

const THEMES = {
  light: {
    bg: "#ffffff", dots: "rgba(31,35,40,.09)", glow: "rgba(77,99,120,.10)",
    card: "#f6f8fa", border: "#d0d7de", title: "#1f2328", text: "#59636e", strong: "#1f2328",
    accent: "#4d6378", ink: [0x3f, 0x48, 0x52],
    heat: ["#e6e9ed", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
  dark: {
    bg: "#0d1117", dots: "rgba(240,246,252,.07)", glow: "rgba(125,154,181,.14)",
    card: "#161b22", border: "#30363d", title: "#e6edf3", text: "#9198a1", strong: "#e6edf3",
    accent: "#7d9ab5", ink: [0xc9, 0xd1, 0xd9],
    heat: ["#21262d", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
};

// Lucide icons (ISC licence), inlined so this script needs only Node and Chrome.
const ICONS = {
  briefcase: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"></path><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\"></rect></svg>",
  mobile: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"></rect><path d=\"M12 18h.01\"></path></svg>",
  search: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"11\" cy=\"11\" r=\"8\"></circle><path d=\"m21 21-4.3-4.3\"></path></svg>",
  cloud: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"17\" r=\"3\"></circle><path d=\"M4.2 15.1A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.2\"></path><path d=\"m15.7 18.4-.9-.3\"></path><path d=\"m9.2 15.9-.9-.3\"></path><path d=\"m10.6 20.7.3-.9\"></path><path d=\"m13.1 14.2.3-.9\"></path><path d=\"m13.6 20.7-.4-1\"></path><path d=\"m10.8 14.3-.4-1\"></path><path d=\"m8.3 18.6 1-.4\"></path><path d=\"m14.7 15.8 1-.4\"></path></svg>",
  code: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><polyline points=\"16 18 22 12 16 6\"></polyline><polyline points=\"8 6 2 12 8 18\"></polyline></svg>",
  mentor: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\"></path><path d=\"M22 10v6\"></path><path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\"></path></svg>",
  commits: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"12\" cy=\"12\" r=\"3\"></circle><line x1=\"3\" x2=\"9\" y1=\"12\" y2=\"12\"></line><line x1=\"15\" x2=\"21\" y1=\"12\" y2=\"12\"></line></svg>",
  projects: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5\"></path><circle cx=\"13\" cy=\"12\" r=\"2\"></circle><path d=\"M18 19c-2.8 0-5-2.2-5-5v8\"></path><circle cx=\"20\" cy=\"19\" r=\"2\"></circle></svg>",
};

const logo = `data:image/png;base64,${readFileSync(path.join(root, "assets", "logo-source.png")).toString("base64")}`;
const font = pathToFileURL(path.join(root, "assets", "fonts", "geist.woff2")).href;
const contributions = JSON.parse(readFileSync(path.join(root, "assets", "work-contributions.json"), "utf8"));

// "25 Apr" from "2026-04-25".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (iso) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

// The contribution graph: a column per week (Sunday on top), shaded by quartile of the active days.
// It runs from my first contribution to my last day at FileSure (31 Oct 2026).
function heatmap(t) {
  const days = Object.keys(contributions).sort();
  const active = Object.values(contributions).filter(Boolean).sort((a, b) => a - b);
  const cut = [0.25, 0.5, 0.75].map((f) => active[Math.floor(active.length * f)]);
  const level = (n) => (n === 0 ? 0 : 1 + cut.filter((c) => n > c).length);
  const P = 11.5, C = 9, TOP = 14;
  const first = new Date(`${days[0]}T00:00:00Z`);
  let cells = "", labels = `<text x="0" y="9">Apr</text>`;
  for (const iso of days) {
    const d = new Date(`${iso}T00:00:00Z`);
    const i = Math.round((d - first) / 864e5), col = Math.floor(i / 7), row = i % 7;
    cells += `<rect x="${col * P}" y="${TOP + row * P}" width="${C}" height="${C}" rx="2" fill="${t.heat[level(contributions[iso])]}"/>`;
    if (d.getUTCDate() <= 7 && row === 0) labels += `<text x="${col * P}" y="9">${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}</text>`;
  }
  const cols = Math.ceil(days.length / 7);
  const scale = t.heat.map((c) => `<i style="background:${c}"></i>`).join("");
  return `<svg class="heat" viewBox="0 0 ${cols * P - (P - C)} ${TOP + 7 * P - (P - C)}">${labels}${cells}</svg>
    <p class="when"><span>${dayLabel(days.find((d) => contributions[d]))} – ${dayLabel(days.at(-1))} ${days.at(-1).slice(0, 4)}</span><span class="scale">Less ${scale} More</span></p>`;
}

// Where each line meets its card: the side card's title row, the bottom card's top edge, or
// the top card's bottom edge.
function anchor(card) {
  const w = card.w ?? CARD_W;
  if (card.to === "top") return { x: card.x + w / 2, y: card.y, vertical: true };
  if (card.to === "bottom") return { x: card.x + w / 2, y: card.y + card.h, vertical: true };
  const left = card.x + w / 2 < CENTER.x;
  return { x: left ? card.x + w : card.x, y: card.y + 30, vertical: false };
}

function connector(card, t) {
  const a = anchor(card);
  const dx = a.x - CENTER.x, dy = a.y - CENTER.y, len = Math.hypot(dx, dy);
  const s = { x: CENTER.x + (dx / len) * CENTER.r, y: CENTER.y + (dy / len) * CENTER.r };
  const d = a.vertical
    ? `M${s.x},${s.y} C${s.x},${(s.y + a.y) / 2} ${a.x},${(s.y + a.y) / 2} ${a.x},${a.y}`
    : `M${s.x},${s.y} C${(s.x + a.x) / 2},${s.y} ${(s.x + a.x) / 2},${a.y} ${a.x},${a.y}`;
  const dot = (p) => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${t.bg}" stroke="${t.accent}" stroke-width="2"/>`;
  return `<path d="${d}" fill="none" stroke="${t.accent}" stroke-width="2" stroke-opacity=".75"/>${dot(s)}${dot(a)}`;
}

function page(t) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Brain map</title><style>
  @font-face { font-family: "Geist"; src: url("${font}") format("woff2"); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: ${t.bg}; }
  .map {
    position: relative; width: ${W}px; height: ${H}px; font-family: "Geist", -apple-system, sans-serif;
    background:
      radial-gradient(360px 300px at ${CENTER.x}px ${CENTER.y}px, ${t.glow}, transparent 70%),
      radial-gradient(${t.dots} 1.1px, transparent 1.3px) 0 0 / 22px 22px,
      ${t.bg};
  }
  svg.lines { position: absolute; inset: 0; }
  .card {
    position: absolute; width: ${CARD_W}px; padding: 14px 18px 16px;
    background: ${t.card}; border: 1px solid ${t.border}; border-radius: 12px;
  }
  .card h3 { display: flex; align-items: center; gap: 9px; font-size: 17px; font-weight: 650; color: ${t.title}; }
  .card h3 svg { color: ${t.accent}; flex: none; }
  .card ul { list-style: none; margin-top: 9px; display: grid; gap: 5px; }
  .card li { position: relative; padding-left: 15px; font-size: 14px; line-height: 1.4; color: ${t.text}; }
  .card li::before { content: ""; position: absolute; left: 0; top: .58em; width: 6px; height: 6px; border-radius: 50%; background: ${t.accent}; opacity: .8; }
  .card b { color: ${t.strong}; font-weight: 650; }
  .heat { display: block; width: 100%; height: auto; margin-top: 14px; }
  .heat text { font-size: 8px; fill: ${t.text}; }
  .when { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 12px; color: ${t.text}; }
  .scale { display: inline-flex; align-items: center; gap: 3px; }
  .scale i { width: 9px; height: 9px; border-radius: 2px; }
  .center {
    position: absolute; left: ${CENTER.x - CENTER.r}px; top: ${CENTER.y - CENTER.r}px;
    width: ${CENTER.r * 2}px; height: ${CENTER.r * 2}px; border-radius: 50%;
    background: ${t.bg}; border: 2px solid ${t.accent};
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  }
  .center canvas { width: 118px; height: 83px; }
  .center strong { margin-top: 8px; font-size: 19px; font-weight: 700; color: ${t.title}; }
  .center span { font-size: 13px; color: ${t.text}; margin-top: 2px; }
</style></head><body><div class="map">
  <svg class="lines" width="${W}" height="${H}">${CARDS.map((c) => connector(c, t)).join("")}</svg>
  ${CARDS.map((c) => `<div class="card" style="left:${c.x}px;top:${c.y}px;width:${c.w ?? CARD_W}px${c.h ? `;height:${c.h}px` : ""}">
    <h3>${ICONS[c.icon]}${c.title}</h3>
    <ul>${c.lines.map((l) => `<li>${l}</li>`).join("")}</ul>
    ${c.heatmap ? heatmap(t) : ""}
  </div>`).join("")}
  <div class="center">
    <canvas id="logo" width="213" height="149"></canvas>
    <strong>Ankit Dimri</strong><span>Software Engineer</span>
  </div>
</div>
${logoScript(t)}</body></html>`;
}

// Keep the logo's dark strokes, drop its background, and recolour it for this theme.
function logoScript(t) {
  return `<script>
  const img = new Image();
  img.onload = () => {
    const c = document.getElementById("logo"), ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const x = (i / 4) % c.width, y = Math.floor(i / 4 / c.width);
      const lum = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
      let a = Math.max(0, Math.min(1, (0.86 - lum) / (0.86 - 0.52)));
      if (x >= 112 && y >= 112) a = 0;
      [p[i], p[i + 1], p[i + 2]] = ${JSON.stringify(t.ink)};
      p[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(d, 0, 0);
  };
  img.src = "${logo}";
</script>`;
}

// The README's link to the live page: a pill button in the same style, on a transparent background.
const BTN_W = 460;
const BTN_H = 66;

function buttonPage(t) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Live brain map button</title><style>
  @font-face { font-family: "Geist"; src: url("${font}") format("woff2"); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${BTN_W}px; height: ${BTN_H}px; overflow: hidden; background: transparent; }
  .btn {
    position: absolute; inset: 3px; display: flex; align-items: center; justify-content: center; gap: 12px;
    border-radius: 999px; border: 1.5px solid ${t.accent}; background: ${t.card};
    font-family: "Geist", -apple-system, sans-serif; font-size: 19px; font-weight: 600; color: ${t.title};
  }
  .btn canvas { width: 52px; height: 36px; }
  .btn span { color: ${t.accent}; font-size: 21px; margin-left: -2px; }
</style></head><body>
  <div class="btn"><canvas id="logo" width="213" height="149"></canvas>Explore the live brain map<span>↗</span></div>
${logoScript(t)}</body></html>`;
}

const work = mkdtempSync(path.join(tmpdir(), "brain-map-"));
function shoot(name, html, width, height, transparent) {
  const file = path.join(work, `${name}.html`);
  writeFileSync(file, html);
  // A fresh Chrome profile per image: reusing one can hang while the previous Chrome is still closing.
  const profile = mkdtempSync(path.join(work, "profile-"));
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`,
    "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${width},${height}`,
    ...(transparent ? ["--default-background-color=00000000"] : []),
    "--virtual-time-budget=4000", `--screenshot=${path.join(root, "assets", `${name}.png`)}`, pathToFileURL(file).href,
  ], { stdio: "pipe", timeout: 60000 });
  console.log(`wrote assets/${name}.png`);
}

try {
  for (const [name, theme] of Object.entries(THEMES)) {
    shoot(`brain-map-${name}`, page(theme), W, H, false);
    shoot(`live-button-${name}`, buttonPage(theme), BTN_W, BTN_H, true);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
