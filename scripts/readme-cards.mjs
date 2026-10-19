// node scripts/readme-cards.mjs
//
// Draws the README's intro, work and project cards, the tech stack and the link buttons in the brain
// map's style, light and dark (GitHub shows the one that matches the viewer's theme):
//   assets/cards/intro-{light,dark}.png
//   assets/cards/work-filesure-{light,dark}.png
//   assets/cards/project-<slug>-{light,dark}.png (Portfolio's is wide, with its numbers, Lighthouse and a
//     day-by-day graph from assets/cards/portfolio-activity.json: node scripts/portfolio-activity.mjs
//     refreshes the numbers, node scripts/lighthouse.mjs the Lighthouse scores)
//   assets/cards/stack-{light,dark}.png
//   assets/cards/link-<slug>-{light,dark}.png
//
// To update: edit INTRO, WORK, PROJECTS, STACK or LINKS below, run this, commit the PNGs. Icons come from
// assets/cards/icons.json (Simple Icons, CC0, and Feather/Lucide/Tabler, MIT/ISC, with brand
// colours). Needs Chrome or Edge (found on macOS, Windows and Linux; CHROME_PATH overrides).
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Chrome on macOS, Windows or Linux, or Edge (same engine, same flags); CHROME_PATH overrides.
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const win = [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
  const candidates =
    {
      darwin: [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      ],
      win32: [
        ...win.map((dir) => path.join(dir, "Google", "Chrome", "Application", "chrome.exe")),
        ...win.map((dir) => path.join(dir, "Microsoft", "Edge", "Application", "msedge.exe")),
      ],
      linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
    }[process.platform] ?? [];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? "google-chrome";
}
const CHROME = findChrome();
if (!existsSync(CHROME)) {
  console.error(`Chrome or Edge not found ("${CHROME}"); install one, or set CHROME_PATH.`);
  process.exit(1);
}
const font = pathToFileURL(path.join(root, "assets", "fonts", "geist.woff2")).href;
const ICONS = JSON.parse(readFileSync(path.join(root, "assets", "cards", "icons.json"), "utf8"));
const ACTIVITY = JSON.parse(readFileSync(path.join(root, "assets", "cards", "portfolio-activity.json"), "utf8"));

// Who I am, at the top of the README.
const INTRO = {
  kind: "Software Engineer · Dehradun, India", title: "Hi, I'm Ankit 👋", status: "Open to new roles",
  text: "I like owning things end to end: the mobile app, the website, the APIs behind them and the cloud they run on. Here's the map of what I've built.",
  areas: [["mobile", "iOS & Android apps"], ["layout", "Websites"], ["server", "APIs"], ["cloud", "Cloud & DevOps"], ["sparkles", "Machine learning"]],
};

// My job, as a wide card. Only what is already public (the brain map, the app stores).
const WORK = {
  kind: "Work · Software Engineer · Apr – Oct 2026", title: "FileSure",
  text: "Built FileSure's iOS and Android app from scratch, rebuilt company screening for 3.8M companies on ClickHouse, and led the backend's move from AWS to GCP. Intern to Software Engineer in 3 months.",
  tech: [["react", "React Native"], ["nextjs", "Next.js"], ["nodejs", "Node.js"], ["mongodb", "MongoDB"], ["clickhouse", "ClickHouse"], ["gcp", "Google Cloud"], ["aws", "AWS"], ["jenkins", "Jenkins"]],
  foot: "1,299 contributions · private repositories", cta: "Open on the brain map",
};

// In the resume's order. Each card links to its repository (or `site`, with its `cta`); `live` adds the
// "Live demo" mark, `highlight` an accent border, and `featured` draws it wide, with its numbers, Lighthouse
// on the live site and graphs (from portfolio-activity.json).
const PROJECTS = [
  {
    slug: "portfolio", kind: "Full stack · My site", title: "Portfolio", repo: "Portfolio", live: true,
    featured: true,
    text: "React + Express + PostgreSQL: a one-page resume builder (PDFs from ₹1), live GitHub and LeetCode stats, a live brain map and a Google Meet scheduler.",
    tech: [["react", "React"], ["vite", "Vite"], ["nodejs", "Node.js"], ["postgresql", "PostgreSQL"], ["calendar", "Google Calendar"]],
  },
  {
    slug: "hcp-crm", kind: "AI · Full stack", title: "AI-first HCP CRM", repo: "ai-first-hcp-interaction-crm", live: true,
    text: "Reps log doctor visits in plain English; a LangGraph agent with 5 tools fills in the record.",
    tech: [["langchain", "LangGraph"], ["fastapi", "FastAPI"], ["postgresql", "PostgreSQL"], ["react", "React"]],
  },
  {
    slug: "rn-wallet", kind: "Mobile · Full stack · ML", title: "RN-Wallet", repo: "RN-WALLET", live: false,
    text: "Expense tracker on Express + PostgreSQL; an ML service sorts transactions into categories.",
    tech: [["react", "React Native"], ["postgresql", "PostgreSQL"], ["redis", "Redis"], ["fastapi", "FastAPI"]],
  },
  {
    slug: "quickcart", kind: "Full stack · E-commerce", title: "QuickCart", repo: "quickcart-mern", live: true,
    text: "MERN store with JWT roles, Stripe payments, Cloudinary media and an admin dashboard.",
    tech: [["react", "React"], ["nodejs", "Node.js"], ["mongodb", "MongoDB"], ["stripe", "Stripe"]],
  },
  {
    // Not a repository of its own: it links to the live builder, and stands out like the work card
    slug: "resume-builder", kind: "Live tool · On my site", title: "Resume builder", site: "portfolio-nine-orcin-33.vercel.app", cta: "Try it", highlight: true,
    text: "Three templates, a live preview that keeps it to one page, an ATS check against a job posting, and the PDF by email, with no <span style=\"white-space: nowrap\">sign-up</span>.",
    tech: [["layout", "3 templates"], ["sparkles", "ATS check"], ["file", "One-page PDF"], ["gmail", "By email"]],
  },
];

const STACK = [
  { title: "Mobile", icon: "mobile", items: [["react", "React Native"], ["expo", "Expo"], ["apple", "iOS"], ["android", "Android"]] },
  { title: "Frontend", icon: "layout", items: [["react", "React"], ["nextjs", "Next.js"], ["typescript", "TypeScript"], ["javascript", "JavaScript"], ["redux", "Redux"], ["tailwind", "Tailwind"]] },
  { title: "Backend & APIs", icon: "server", items: [["nodejs", "Node.js"], ["express", "Express"], ["fastapi", "FastAPI"], ["django", "Django"], ["api", "REST APIs"]] },
  { title: "Data", icon: "database", items: [["mongodb", "MongoDB"], ["postgresql", "PostgreSQL"], ["clickhouse", "ClickHouse"], ["redis", "Redis"]] },
  { title: "Cloud & DevOps", icon: "cloud", items: [["gcp", "Google Cloud"], ["aws", "AWS"], ["cloudflare", "Cloudflare"], ["docker", "Docker"], ["kubernetes", "Kubernetes"], ["jenkins", "Jenkins"]] },
  { title: "ML & Tools", icon: "sparkles", items: [["python", "Python"], ["scikitlearn", "scikit-learn"], ["pandas", "Pandas"], ["git", "Git"], ["sentry", "Sentry"], ["claude", "Claude Code"]] },
];

const LINKS = [
  // Under the FileSure card
  { slug: "ios", icon: "appstore", label: "iOS app" },
  { slug: "android", icon: "googleplay", label: "Android app" },
  { slug: "website", icon: "globe", label: "Website" },
  { slug: "brainmap", icon: "brain", label: "Brain map" },
  // Find me (`w` widens a button for a longer label)
  { slug: "schedule", icon: "calendar", label: "Schedule a call", w: 196 },
  { slug: "portfolio", icon: "globe", label: "Portfolio" },
  { slug: "resume", icon: "file", label: "Resume" },
  { slug: "linkedin", icon: "linkedin", label: "LinkedIn" },
  { slug: "leetcode", icon: "leetcode", label: "LeetCode" },
  { slug: "email", icon: "gmail", label: "Email" },
];

// The brain map's palette.
const THEMES = {
  light: { card: "#f6f8fa", chip: "#ffffff", border: "#d0d7de", title: "#1f2328", text: "#59636e", accent: "#4d6378", dark: false },
  dark: { card: "#161b22", chip: "#0d1117", border: "#30363d", title: "#e6edf3", text: "#9198a1", accent: "#7d9ab5", dark: true },
};

// A brand colour that's too dark for the dark theme uses its lighter variant, or the text colour.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function colorOf(name, t) {
  const icon = ICONS[name];
  if (!icon.color) return t.accent;
  if (t.dark && icon.dark) return icon.dark;
  if (t.dark && luminance(icon.color) < 0.2) return t.title;
  return icon.color;
}
const iconHtml = (name, t, cls = "ic") => `<span class="${cls}" style="color:${colorOf(name, t)}">${ICONS[name].svg}</span>`;
const chips = (items, t) => items.map(([name, label]) => `<span class="chip">${iconHtml(name, t)}${label}</span>`).join("");

const base = (t, w, h) => `
  @font-face { font-family: "Geist"; src: url("${font}") format("woff2"); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: transparent; font-family: "Geist", -apple-system, sans-serif; }
  /* Headless Chrome keeps a minimum window width, so size everything to the body, not the window. */
  body { position: relative; }
  .ic { display: inline-flex; flex: none; }
  .ic svg { width: 1em; height: 1em; display: block; }
  .chip {
    display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
    border: 1px solid ${t.border}; background: ${t.chip}; color: ${t.title}; font-size: 12.5px; font-weight: 500; white-space: nowrap;
  }
  .chip .ic { font-size: 14px; }`;

const CARD_W = 440, CARD_H = 254;
function projectPage(p, t) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base(t, CARD_W, CARD_H)}
  .card {
    position: absolute; inset: 2px; display: grid; grid-template-rows: auto auto auto 1fr auto; gap: 8px;
    padding: 16px 20px 14px; border-radius: 14px; border: 1px solid ${p.highlight ? t.accent : t.border}; background: ${t.card};
    ${p.highlight ? `box-shadow: inset 0 0 0 4px color-mix(in srgb, ${t.accent} 8%, transparent);` : ""}
  }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .kind { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: ${t.accent}; }
  .go { font-size: 16px; color: ${t.accent}; }
  h3 { font-size: 21px; font-weight: 700; letter-spacing: -.01em; color: ${t.title}; }
  p { font-size: 13.5px; line-height: 1.45; color: ${t.text}; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; align-content: start; }
  .foot { display: flex; justify-content: space-between; align-items: center; padding-top: 9px; border-top: 1px solid ${t.border}; font-size: 12.5px; color: ${t.text}; }
  .foot span { display: inline-flex; align-items: center; gap: 6px; }
  .live { color: ${t.accent}; font-weight: 600; }
  .live i { width: 7px; height: 7px; border-radius: 50%; background: #3fb950; box-shadow: 0 0 0 3px rgba(63, 185, 80, .18); }
</style></head><body><div class="card">
  <div class="top"><span class="kind">${p.kind}</span>${iconHtml("external", t, "ic go")}</div>
  <h3>${p.title}</h3>
  <p>${p.text}</p>
  <div class="chips">${chips(p.tech, t)}</div>
  <div class="foot"><span>${p.site ? iconHtml("globe", t) + p.site : iconHtml("github", t) + p.repo}</span>${p.cta || p.live ? `<span class="live"><i></i>${p.cta ?? "Live demo"}</span>` : "<span></span>"}</div>
</div></body></html>`;
}

const FEATURE_W = 900, FEATURE_H = 428;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const num = (n) => n.toLocaleString("en-IN");
// A rate per active day (a day with a commit): whole numbers from 10, one decimal below
const perActiveDay = (n, a) => {
  const rate = n / a.totals.activeDays;
  return rate >= 10 ? String(Math.round(rate)) : rate.toFixed(1).replace(/\.0$/, "");
};
const dayLabel = (date) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
// The featured project: its numbers with their rates, then two graphs side by side: day by day, a calendar
// of my commits (GitHub's greens) with a ▲ on each day the site was deployed; month by month, bars for
// commits, merged pull requests and deployments.
function featuredPage(p, a, t) {
  const greens = t.dark ? ["#21262d", "#0e4429", "#006d32", "#26a641", "#39d353"] : ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const level = (n) => (n === 0 ? 0 : n <= 5 ? 1 : n <= 20 ? 2 : n <= 50 ? 3 : 4);
  const ink = t.dark ? "#f0f6fc" : "#1f2328";
  const purple = t.dark ? "#a371f7" : "#8250df";
  const rateColor = t.dark ? "#3fb950" : "#1a7f37";
  // the ▲ takes whichever of near-black and white contrasts more with that day's green (WCAG's formula)
  const rel = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const markOn = (fill) => ((rel(fill) + 0.05) / (rel("#1f2328") + 0.05) >= 1.05 / (rel(fill) + 0.05) ? "#1f2328" : "#ffffff");
  const DAY = 86_400_000;
  const first = Date.parse(`${a.from}T00:00:00Z`), last = Date.parse(`${a.to}T00:00:00Z`);
  const counts = (date) => ({ commits: 0, pullRequests: 0, deployments: 0, ...a.days[date] });

  // Day by day
  const start = first - new Date(first).getUTCDay() * DAY; // the Sunday on or before the first day
  const weeks = Math.floor((last - start) / DAY / 7) + 1;
  const CELL = 9.5, GAP = 2.5, STEP = CELL + GAP, LEFT = 25, TOP = 14;
  let cal = "";
  for (let w = 0, month = -1; w < weeks; w++) {
    const sunday = new Date(start + w * 7 * DAY);
    if (sunday.getUTCMonth() !== month) {
      month = sunday.getUTCMonth();
      if (w <= weeks - 2) cal += `<text x="${LEFT + w * STEP}" y="9">${MONTHS[month]}</text>`;
    }
    for (let d = 0; d < 7; d++) {
      const time = start + (w * 7 + d) * DAY;
      if (time > last) break;
      const day = counts(new Date(time).toISOString().slice(0, 10));
      const fill = greens[level(day.commits)];
      const x = LEFT + w * STEP, y = TOP + d * STEP;
      cal += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}"/>`;
      if (day.deployments) cal += `<path d="M${x + CELL / 2} ${y + 2.2}L${x + CELL - 1.9} ${y + CELL - 2.4}H${x + 1.9}Z" fill="${markOn(fill)}"/>`;
    }
  }
  for (const [d, label] of [[1, "Mon"], [3, "Wed"], [5, "Fri"]]) cal += `<text x="0" y="${TOP + d * STEP + 7.5}">${label}</text>`;
  const calW = LEFT + weeks * STEP - GAP, calH = TOP + 7 * STEP - GAP;
  const busiestDay = Object.keys(a.days).reduce((best, date) => (counts(date).commits > counts(best).commits ? date : best));

  // Month by month, as tall as the calendar: bars above, the months' names below
  const months = [];
  for (let m = Date.UTC(new Date(first).getUTCFullYear(), new Date(first).getUTCMonth(), 1); m <= last; ) {
    const d = new Date(m);
    const key = d.toISOString().slice(0, 7);
    const total = { label: MONTHS[d.getUTCMonth()], commits: 0, pullRequests: 0, deployments: 0 };
    for (const date of Object.keys(a.days)) if (date.startsWith(key)) for (const k of ["commits", "pullRequests", "deployments"]) total[k] += counts(date)[k];
    months.push(total);
    m = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  const SERIES = [["commits", greens[3]], ["pullRequests", purple], ["deployments", ink]];
  const SLOT = 40, BAR = 8.5, BAR_GAP = 2, BARS_TOP = 4, BARS_H = calH - BARS_TOP - 15;
  const max = Math.max(1, ...months.flatMap((m) => SERIES.map(([k]) => m[k])));
  let bars = "";
  months.forEach((m, i) => {
    const x0 = i * SLOT + (SLOT - (SERIES.length * BAR + (SERIES.length - 1) * BAR_GAP)) / 2;
    SERIES.forEach(([k, color], j) => {
      const h = m[k] ? Math.max(2.5, (m[k] / max) * BARS_H) : 1.5;
      bars += `<rect x="${x0 + j * (BAR + BAR_GAP)}" y="${BARS_TOP + BARS_H - h}" width="${BAR}" height="${h}" rx="2" fill="${m[k] ? color : t.border}"/>`;
    });
    bars += `<text x="${i * SLOT + SLOT / 2}" y="${calH - 2}" text-anchor="middle">${m.label}</text>`;
  });
  const barsW = months.length * SLOT;
  const busiestMonth = months.reduce((best, m) => (m.commits > best.commits ? m : best));

  const triangle = `<svg class="tri" viewBox="0 0 10 10"><path d="M5 1L9.5 9H.5Z" fill="${ink}"/></svg>`;
  const lighthouse = a.lighthouse ?? { mobile: "–", desktop: "–" };
  const tiles = [
    ["git", num(a.totals.commits), "commits", `${perActiveDay(a.totals.commits, a)} per active day`],
    ["github", num(a.totals.mergedPullRequests), "pull requests merged", `${perActiveDay(a.totals.mergedPullRequests, a)} per active day`],
    ["vercel", num(a.totals.deployments), `deployments, ${num(a.totals.productionDeploys)} to production`, `${perActiveDay(a.totals.deployments, a)} per active day`],
    ["lighthouse", `${lighthouse.mobile} · ${lighthouse.desktop}`, "Lighthouse, mobile · desktop", "on the live site"],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base(t, FEATURE_W, FEATURE_H)}
  .card {
    position: absolute; inset: 2px; display: grid; grid-template-rows: auto 1fr auto; gap: 14px;
    padding: 18px 24px 14px; border-radius: 14px; border: 1px solid ${t.accent}; background: ${t.card};
    box-shadow: inset 0 0 0 4px color-mix(in srgb, ${t.accent} 8%, transparent);
  }
  .head { display: grid; grid-template-columns: 1fr 372px; gap: 22px; }
  .about { display: grid; grid-template-rows: auto auto auto 1fr; gap: 7px; }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .kind { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: ${t.accent}; }
  .go { font-size: 16px; color: ${t.accent}; }
  h3 { font-size: 26px; font-weight: 700; letter-spacing: -.01em; color: ${t.title}; }
  p { font-size: 14px; line-height: 1.45; color: ${t.text}; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; align-content: start; }
  .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-content: start; }
  .tile { display: flex; flex-direction: column; gap: 2px; padding: 9px 12px; border-radius: 10px; border: 1px solid ${t.border}; background: ${t.chip}; }
  .tile b { display: inline-flex; align-items: center; gap: 7px; font-size: 21px; font-weight: 700; letter-spacing: -.01em; color: ${t.title}; }
  .tile b .ic { font-size: 15px; }
  .tile span { font-size: 11.5px; line-height: 1.35; color: ${t.text}; }
  .tile em { margin-top: auto; padding-top: 2px; font-style: normal; font-size: 11.5px; font-weight: 600; color: ${rateColor}; }
  .graphs { display: grid; grid-template-columns: ${calW}fr ${barsW}fr; gap: 30px; align-items: start; }
  .graph { display: grid; gap: 7px; }
  .graph-top { display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: ${t.text}; }
  .graph-top strong { font-size: 12.5px; font-weight: 600; color: ${t.title}; }
  .legend { display: inline-flex; align-items: center; gap: 4px; }
  .legend i { width: 10px; height: 10px; border-radius: 2.5px; display: inline-block; }
  .legend .key { margin-left: 7px; }
  .legend .tri { width: 10px; height: 10px; margin-left: 8px; }
  .graph svg.chart { width: 100%; height: auto; display: block; }
  .graph svg.chart text { font-size: 8.5px; fill: ${t.text}; }
  .note { font-size: 11.5px; color: ${t.text}; }
  .note b { font-weight: 600; color: ${t.title}; }
  .foot { display: flex; justify-content: space-between; align-items: center; padding-top: 9px; border-top: 1px solid ${t.border}; font-size: 12.5px; color: ${t.text}; }
  .foot span { display: inline-flex; align-items: center; gap: 6px; }
  .live { color: ${t.accent}; font-weight: 600; }
  .live i { width: 7px; height: 7px; border-radius: 50%; background: #3fb950; box-shadow: 0 0 0 3px rgba(63, 185, 80, .18); }
</style></head><body><div class="card">
  <div class="head">
    <div class="about">
      <div class="top"><span class="kind">${p.kind}</span>${iconHtml("external", t, "ic go")}</div>
      <h3>${p.title}</h3>
      <p>${p.text}</p>
      <div class="chips">${chips(p.tech, t)}</div>
    </div>
    <div class="tiles">${tiles.map(([icon, value, label, rate]) => `<div class="tile"><b>${iconHtml(icon, t)}${value}</b><span>${label}</span><em>${rate}</em></div>`).join("")}</div>
  </div>
  <div class="graphs">
    <div class="graph">
      <div class="graph-top"><strong>Day by day</strong><span class="legend">Less ${greens.map((c) => `<i style="background:${c}"></i>`).join("")} More ${triangle} deployed</span></div>
      <svg class="chart" viewBox="0 0 ${calW} ${calH}" role="img">${cal}</svg>
      <div class="note">Busiest day, <b>${dayLabel(busiestDay)}</b>: ${num(counts(busiestDay).commits)} commits · ${num(counts(busiestDay).pullRequests)} pull requests · ${num(counts(busiestDay).deployments)} deployments</div>
    </div>
    <div class="graph">
      <div class="graph-top"><strong>Month by month</strong><span class="legend">${SERIES.map(([k, c], i) => `<i class="${i ? "key" : ""}" style="background:${c}"></i>${{ commits: "commits", pullRequests: "PRs", deployments: "deploys" }[k]}`).join(" ")}</span></div>
      <svg class="chart" viewBox="0 0 ${barsW} ${calH}" role="img">${bars}</svg>
      <div class="note">Busiest month, <b>${busiestMonth.label}</b>: ${num(busiestMonth.commits)} commits · ${num(busiestMonth.pullRequests)} PRs · ${num(busiestMonth.deployments)} deploys</div>
    </div>
  </div>
  <div class="foot"><span>${iconHtml("github", t)}${p.repo} · ${a.totals.activeDays} active days since ${MONTHS[new Date(first).getUTCMonth()]} ${new Date(first).getUTCFullYear()}</span>${p.live ? `<span class="live"><i></i>Live demo</span>` : "<span></span>"}</div>
</div></body></html>`;
}

const INTRO_W = 900, INTRO_H = 196;
function introPage(t) {
  const i = INTRO;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base(t, INTRO_W, INTRO_H)}
  .card {
    position: absolute; inset: 2px; display: grid; align-content: center; gap: 10px;
    padding: 18px 24px; border-radius: 14px; border: 1px solid ${t.border}; background: ${t.card};
  }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .kind { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: ${t.accent}; }
  .status {
    display: inline-flex; align-items: center; gap: 7px; padding: 4px 11px; border-radius: 999px;
    border: 1px solid ${t.border}; background: ${t.chip}; font-size: 12px; font-weight: 600; color: ${t.title};
  }
  .status i { width: 7px; height: 7px; border-radius: 50%; background: #3fb950; box-shadow: 0 0 0 3px rgba(63, 185, 80, .18); }
  h3 { font-size: 26px; font-weight: 700; letter-spacing: -.01em; color: ${t.title}; }
  p { font-size: 14.5px; line-height: 1.5; color: ${t.text}; max-width: 760px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
</style></head><body><div class="card">
  <div class="top"><span class="kind">${i.kind}</span><span class="status"><i></i>${i.status}</span></div>
  <h3>${i.title}</h3>
  <p>${i.text}</p>
  <div class="chips">${chips(i.areas, t)}</div>
</div></body></html>`;
}

const WORK_W = 900, WORK_H = 236;
function workPage(t) {
  const w = WORK;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base(t, WORK_W, WORK_H)}
  .card {
    position: absolute; inset: 2px; display: grid; grid-template-rows: auto auto auto 1fr auto; gap: 9px;
    padding: 16px 22px 14px; border-radius: 14px; border: 1px solid ${t.accent}; background: ${t.card};
    box-shadow: inset 0 0 0 4px color-mix(in srgb, ${t.accent} 8%, transparent);
  }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .kind { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: ${t.accent}; }
  .go { font-size: 16px; color: ${t.accent}; }
  h3 { font-size: 24px; font-weight: 700; letter-spacing: -.01em; color: ${t.title}; }
  p { font-size: 14px; line-height: 1.45; color: ${t.text}; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; align-content: start; }
  .foot { display: flex; justify-content: space-between; align-items: center; padding-top: 9px; border-top: 1px solid ${t.border}; font-size: 12.5px; color: ${t.text}; }
  .foot span { display: inline-flex; align-items: center; gap: 6px; }
  .cta { color: ${t.accent}; font-weight: 600; }
</style></head><body><div class="card">
  <div class="top"><span class="kind">${w.kind}</span>${iconHtml("external", t, "ic go")}</div>
  <h3>${w.title}</h3>
  <p>${w.text}</p>
  <div class="chips">${chips(w.tech, t)}</div>
  <div class="foot"><span>${iconHtml("github", t)}${w.foot}</span><span class="cta">${iconHtml("brain", t)}${w.cta}</span></div>
</div></body></html>`;
}

const STACK_W = 860, STACK_H = 334;
function stackPage(t) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base(t, STACK_W, STACK_H)}
  .grid { position: absolute; inset: 2px; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; gap: 14px; }
  .group { display: grid; align-content: start; gap: 12px; padding: 14px 16px; border-radius: 14px; border: 1px solid ${t.border}; background: ${t.card}; }
  h4 { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 650; color: ${t.title}; }
  h4 .ic { font-size: 17px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
</style></head><body><div class="grid">
  ${STACK.map((g) => `<div class="group"><h4>${iconHtml(g.icon, t)}${g.title}</h4><div class="chips">${chips(g.items, t)}</div></div>`).join("")}
</div></body></html>`;
}

const BTN_W = 164, BTN_H = 48;
function linkPage(l, t) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${base(t, l.w ?? BTN_W, BTN_H)}
  .btn {
    position: absolute; inset: 2px; display: flex; align-items: center; justify-content: center; gap: 9px;
    border-radius: 999px; border: 1.5px solid ${t.border}; background: ${t.card};
    font-size: 15px; font-weight: 600; color: ${t.title};
  }
  .btn .ic { font-size: 17px; }
  .btn .go { font-size: 13px; color: ${t.accent}; margin-left: -3px; }
</style></head><body>
  <div class="btn">${iconHtml(l.icon, t)}${l.label}${iconHtml("external", t, "ic go")}</div>
</body></html>`;
}

const work = mkdtempSync(path.join(tmpdir(), "readme-cards-"));
// `node scripts/readme-cards.mjs project-portfolio` draws only the images whose names start with that:
// the Portfolio card workflow redraws just that card
const ONLY = process.argv[2];
function shoot(name, html, width, height) {
  if (ONLY && !name.startsWith(ONLY)) return;
  const file = path.join(work, `${name}.html`);
  writeFileSync(file, html);
  // A fresh Chrome profile per image: reusing one can hang while the previous Chrome is still closing.
  const profile = mkdtempSync(path.join(work, "profile-"));
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-first-run", `--user-data-dir=${profile}`,
    "--hide-scrollbars", "--force-device-scale-factor=2", `--window-size=${width},${height}`,
    "--default-background-color=00000000", "--virtual-time-budget=3000",
    `--screenshot=${path.join(root, "assets", "cards", `${name}.png`)}`, pathToFileURL(file).href,
  ], { stdio: "pipe", timeout: 60000 });
  console.log(`wrote assets/cards/${name}.png`);
}

try {
  for (const [theme, t] of Object.entries(THEMES)) {
    shoot(`intro-${theme}`, introPage(t), INTRO_W, INTRO_H);
    shoot(`work-filesure-${theme}`, workPage(t), WORK_W, WORK_H);
    for (const p of PROJECTS) {
      if (p.featured) shoot(`project-${p.slug}-${theme}`, featuredPage(p, ACTIVITY, t), FEATURE_W, FEATURE_H);
      else shoot(`project-${p.slug}-${theme}`, projectPage(p, t), CARD_W, CARD_H);
    }
    shoot(`stack-${theme}`, stackPage(t), STACK_W, STACK_H);
    for (const l of LINKS) shoot(`link-${l.slug}-${theme}`, linkPage(l, t), l.w ?? BTN_W, BTN_H);
  }
  // The featured card's description in README.md says what it shows, with the same numbers
  const featured = PROJECTS.find((p) => p.featured);
  if (featured && (!ONLY || `project-${featured.slug}`.startsWith(ONLY))) {
    const a = ACTIVITY.totals;
    const since = new Date(`${ACTIVITY.from}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    const alt = `${featured.title}: ${featured.text} ${num(a.commits)} commits, ${num(a.mergedPullRequests)} pull requests merged, ` +
      `${num(a.deployments)} deployments (${num(a.productionDeploys)} to production), Lighthouse ${ACTIVITY.lighthouse?.mobile} on mobile and ` +
      `${ACTIVITY.lighthouse?.desktop} on desktop. Graphs of my commits and the site's deployments, day by day and month by month: ` +
      `${a.activeDays} active days since ${since}, with ${perActiveDay(a.commits, ACTIVITY)} commits, ${perActiveDay(a.mergedPullRequests, ACTIVITY)} ` +
      `pull requests and ${perActiveDay(a.deployments, ACTIVITY)} deployments per active day. Live demo.`;
    const readmeFile = path.join(root, "README.md");
    const readme = readFileSync(readmeFile, "utf8");
    const next = readme.replace(new RegExp(`(project-${featured.slug}-light\\.png" alt=")[^"]*(")`), (_, open, close) => open + alt.replaceAll('"', "&quot;") + close);
    if (next !== readme) {
      writeFileSync(readmeFile, next);
      console.log(`updated the ${featured.title} card's description in README.md`);
    }
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
