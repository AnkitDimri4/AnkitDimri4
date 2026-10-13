// node scripts/brain-map.mjs
//
// Draws the "brain map" on the profile README: the brain-and-circuit logo in the middle, with
// circuit lines out to a card for each area of work. Writes assets/brain-map-light.png and
// assets/brain-map-dark.png (GitHub shows the one that matches the viewer's theme).
//
// To update: edit CARDS below, run this, commit the two PNGs. Needs Google Chrome
// (set CHROME_PATH if it isn't in /Applications).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1200;
const H = 700;
const CARD_W = 360;

// Card positions are the card's top-left corner; `to: "top"` takes the line in from above.
// Lines in a card may use <b> for emphasis.
const CARDS = [
  { x: 24, y: 36, icon: "briefcase", title: "FileSure · 2026", lines: [
    "Intern → <b>Software Engineer</b> in 3 months",
    "Ran the company's tech with the founder",
    "Releases, incidents and <b>21</b> runbooks",
  ] },
  { x: 24, y: 258, icon: "search", title: "Search & Data", lines: [
    "<b>3.8M</b>-company screening rebuilt in 6 days",
    "<b>60 s</b> timeouts → answers in seconds",
    "<b>146</b> sub-sectors, measured precision",
  ] },
  { x: 24, y: 470, icon: "mentor", title: "Mentoring", lines: [
    "<b>25,000+</b> learners helped",
    "3 years as a mentor at Tutedude",
    "Full-stack · DSA · ML · React Native",
  ] },
  { x: W - 24 - CARD_W, y: 36, icon: "mobile", title: "Mobile", lines: [
    "iOS & Android apps <b>built from scratch</b>",
    "Google Play <b>1.0.7 → 1.0.13</b>",
    "App Store <b>1.0.9 → 1.0.13</b>",
    "<b>80+</b> over-the-air updates",
  ] },
  { x: W - 24 - CARD_W, y: 280, icon: "cloud", title: "Cloud & DevOps", lines: [
    "Led the backend move <b>AWS → GCP</b>",
    "Gated Jenkins CI/CD with rollbacks",
    "Search for <b>3.67M</b> companies, <b>8.7M</b> directors",
  ] },
  { x: W - 24 - CARD_W, y: 492, icon: "code", title: "Web & APIs", lines: [
    "Next.js · React · Node.js · Express",
    "Name → CIN/DIN lookup API",
    "MongoDB · PostgreSQL · ClickHouse",
  ] },
  { x: (W - CARD_W) / 2, y: 548, to: "top", icon: "projects", title: "Side projects", lines: [
    "QuickCart · RN-Wallet",
    "AI-first HCP CRM · Portfolio",
  ] },
];

const CENTER = { x: W / 2, y: 290, r: 112 };

const THEMES = {
  light: {
    bg: "#ffffff", dots: "rgba(31,35,40,.09)", glow: "rgba(77,99,120,.10)",
    card: "#f6f8fa", border: "#d0d7de", title: "#1f2328", text: "#59636e", strong: "#1f2328",
    accent: "#4d6378", ink: [0x3f, 0x48, 0x52],
  },
  dark: {
    bg: "#0d1117", dots: "rgba(240,246,252,.07)", glow: "rgba(125,154,181,.14)",
    card: "#161b22", border: "#30363d", title: "#e6edf3", text: "#9198a1", strong: "#e6edf3",
    accent: "#7d9ab5", ink: [0xc9, 0xd1, 0xd9],
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
  projects: "<svg stroke=\"currentColor\" fill=\"none\" stroke-width=\"2\" viewBox=\"0 0 24 24\" stroke-linecap=\"round\" stroke-linejoin=\"round\" color=\"currentColor\" style=\"color:currentColor\" height=\"20\" width=\"20\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5\"></path><circle cx=\"13\" cy=\"12\" r=\"2\"></circle><path d=\"M18 19c-2.8 0-5-2.2-5-5v8\"></path><circle cx=\"20\" cy=\"19\" r=\"2\"></circle></svg>",
};

const logo = `data:image/png;base64,${readFileSync(path.join(root, "assets", "logo-source.png")).toString("base64")}`;
const font = pathToFileURL(path.join(root, "assets", "fonts", "geist.woff2")).href;

// Where each line meets its card: the side card's title row, or the bottom card's top edge.
function anchor(card) {
  if (card.to === "top") return { x: card.x + CARD_W / 2, y: card.y, bottom: true };
  const left = card.x + CARD_W / 2 < CENTER.x;
  return { x: left ? card.x + CARD_W : card.x, y: card.y + 30, bottom: false };
}

function connector(card, t) {
  const a = anchor(card);
  const dx = a.x - CENTER.x, dy = a.y - CENTER.y, len = Math.hypot(dx, dy);
  const s = { x: CENTER.x + (dx / len) * CENTER.r, y: CENTER.y + (dy / len) * CENTER.r };
  const d = a.bottom
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
  ${CARDS.map((c) => `<div class="card" style="left:${c.x}px;top:${c.y}px">
    <h3>${ICONS[c.icon]}${c.title}</h3>
    <ul>${c.lines.map((l) => `<li>${l}</li>`).join("")}</ul>
  </div>`).join("")}
  <div class="center">
    <canvas id="logo" width="213" height="149"></canvas>
    <strong>Ankit Dimri</strong><span>Software Engineer</span>
  </div>
</div>
<script>
  // Keep the logo's dark strokes, drop its background, and recolour it for this theme.
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
</script></body></html>`;
}

const work = mkdtempSync(path.join(tmpdir(), "brain-map-"));
try {
  for (const [name, theme] of Object.entries(THEMES)) {
    const html = path.join(work, `${name}.html`);
    const png = path.join(root, "assets", `brain-map-${name}.png`);
    writeFileSync(html, page(theme));
    execFileSync(CHROME, [
      "--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${path.join(work, "profile")}`,
      "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${W},${H}`,
      "--virtual-time-budget=4000", `--screenshot=${png}`, pathToFileURL(html).href,
    ], { stdio: "pipe" });
    console.log(`wrote assets/brain-map-${name}.png`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
