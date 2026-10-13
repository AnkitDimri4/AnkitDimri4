// node scripts/brain-map.mjs
//
// The README's brain map is a picture of the live brain map on my portfolio, taken in its capture
// view (?capture=light|dark), so the live page is the one place to change it. This writes
// assets/brain-map-light.png and assets/brain-map-dark.png (GitHub shows the one that matches the
// viewer's theme), refreshes the picture's description in README.md from the page's text, and draws
// the README's "Explore the live brain map" button (assets/live-button-light.png and -dark.png).
//
// .github/workflows/brain-map.yml runs this every day and commits any change; after changing the
// live page, run it from the Actions tab (or here) to update the README straight away.
// BRAIN_MAP_URL points it at another copy of the page, e.g. a local preview. Needs Node 22+ and
// Chrome or Edge (found on macOS, Windows and Linux; CHROME_PATH overrides).
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAIN_MAP_URL = process.env.BRAIN_MAP_URL || "https://portfolio-nine-orcin-33.vercel.app/brain-map/";
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
// CI runners can't give headless Chrome its sandbox; it only ever opens my own pages.
const CHROME_FLAGS = ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", ...(process.env.CI ? ["--no-sandbox"] : [])];

// The button's colours, from the brain map's palette.
const THEMES = {
  light: { card: "#f6f8fa", title: "#1f2328", accent: "#4d6378", ink: [0x3f, 0x48, 0x52] },
  dark: { card: "#161b22", title: "#e6edf3", accent: "#7d9ab5", ink: [0xc9, 0xd1, 0xd9] },
};

const logo = `data:image/png;base64,${readFileSync(path.join(root, "assets", "logo-source.png")).toString("base64")}`;
const font = pathToFileURL(path.join(root, "assets", "fonts", "geist.woff2")).href;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- The brain map: a picture of the live page, through Chrome's DevTools protocol.
const MAP_W = 1200;
const READY_MS = 90000; // the page waits up to 50 s for its live numbers (the API sleeps when idle)

async function captureLive(work) {
  const profile = mkdtempSync(path.join(work, "profile-"));
  const port = 9300 + Math.floor(Math.random() * 600);
  const chrome = spawn(CHROME, [...CHROME_FLAGS, `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank"], {
    stdio: "ignore",
  });
  let ws;
  try {
    let version;
    for (let i = 0; i < 75 && !version; i++) {
      await sleep(200);
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json(), () => null);
    }
    if (!version) throw new Error("Chrome didn't start.");
    ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const call = pending.get(msg.id);
      if (!call) return;
      pending.delete(msg.id);
      if (msg.error) call.reject(new Error(msg.error.message));
      else call.resolve(msg.result);
    };
    const send = (method, params = {}, sessionId) =>
      new Promise((resolve, reject) => {
        pending.set(++id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
      });

    const pages = {};
    for (const theme of Object.keys(THEMES)) {
      const { targetId } = await send("Target.createTarget", { url: "about:blank" });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      const page = (method, params) => send(method, params, sessionId);
      const evaluate = async (expression) =>
        (await page("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
      const size = (height) => page("Emulation.setDeviceMetricsOverride", { width: MAP_W, height, deviceScaleFactor: 2, mobile: false });

      await size(1000);
      const url = new URL(BRAIN_MAP_URL);
      url.searchParams.set("capture", theme);
      await page("Page.navigate", { url: url.href });
      const started = Date.now();
      while (!(await evaluate(`document.documentElement.hasAttribute("data-capture-ready")`).catch(() => false))) {
        if (Date.now() - started > READY_MS) throw new Error(`${url.href} never said it was ready: does that page have the capture view?`);
        await sleep(500);
      }
      // The picture is exactly the map: size the window to it, let the lines redraw, then take it.
      const height = await evaluate(`Math.ceil(document.querySelector(".map").getBoundingClientRect().bottom)`);
      await size(height);
      await sleep(400);
      const { data } = await page("Page.captureScreenshot", { format: "png" });
      writeFileSync(path.join(root, "assets", `brain-map-${theme}.png`), Buffer.from(data, "base64"));
      console.log(`wrote assets/brain-map-${theme}.png (${MAP_W} × ${height})`);
      pages[theme] = await evaluate(`JSON.stringify([...document.querySelectorAll(".map .card")].map((card) => ({
        title: card.querySelector("h2").textContent.trim(),
        lines: [...card.querySelectorAll(":scope > ul > li")].filter((li) => !li.hidden).map((li) => li.textContent.replace(/\\s+/g, " ").trim()),
      })))`);
    }
    return JSON.parse(pages.dark);
  } finally {
    ws?.close();
    chrome.kill();
    await sleep(300);
  }
}

// The picture's description in README.md says what the cards say.
function describe(cards) {
  const esc = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const alt = `Brain map of Ankit Dimri's work. ${cards.map((c) => `${c.title}: ${c.lines.join("; ")}.`).join(" ")}`;
  const file = path.join(root, "README.md");
  const readme = readFileSync(file, "utf8");
  const updated = readme.replace(/(<img src="assets\/brain-map-light\.png" alt=")[^"]*(")/, (_, start, end) => start + esc(alt) + end);
  if (updated === readme) return console.log("README.md: the description is up to date");
  writeFileSync(file, updated);
  console.log("README.md: refreshed the brain map's description");
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

// The button: a small local page, pictured with Chrome's --screenshot.
function shoot(work, name, html, width, height) {
  const file = path.join(work, `${name}.html`);
  writeFileSync(file, html);
  // A fresh Chrome profile per image: reusing one can hang while the previous Chrome is still closing.
  const profile = mkdtempSync(path.join(work, "profile-"));
  execFileSync(CHROME, [
    ...CHROME_FLAGS, `--user-data-dir=${profile}`, "--force-device-scale-factor=2", `--window-size=${width},${height}`,
    "--default-background-color=00000000", "--virtual-time-budget=4000",
    `--screenshot=${path.join(root, "assets", `${name}.png`)}`, pathToFileURL(file).href,
  ], { stdio: "pipe", timeout: 60000 });
  console.log(`wrote assets/${name}.png`);
}

const work = mkdtempSync(path.join(tmpdir(), "brain-map-"));
try {
  describe(await captureLive(work));
  for (const [name, theme] of Object.entries(THEMES)) shoot(work, `live-button-${name}`, buttonPage(theme), BTN_W, BTN_H);
} finally {
  rmSync(work, { recursive: true, force: true });
}
