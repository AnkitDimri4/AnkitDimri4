// node scripts/lighthouse.mjs [--force]
//
// The Lighthouse tile on the Portfolio card (and on the site's own activity card): performance on the live
// site, on mobile and on desktop, measured with Lighthouse itself (through npx, in Chrome or Edge). One run
// can be a few points off, so it takes the median of three runs each, as Lighthouse CI does. It measures
// again only when the site has been deployed since the last time (portfolio-activity.mjs records the latest
// production deploy as `lastDeploy`), or with --force. If Lighthouse can't measure, the last scores stay.
// Writes `lighthouse` in assets/cards/portfolio-activity.json; run readme-cards.mjs after it.
import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://portfolio-nine-orcin-33.vercel.app/";
const LIGHTHOUSE = "lighthouse@13.5.0";
const RUNS = 3;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "assets", "cards", "portfolio-activity.json");
const activity = JSON.parse(readFileSync(file, "utf8"));

if (!process.argv.includes("--force") && activity.lighthouse?.deploy && activity.lighthouse.deploy === activity.lastDeploy) {
  console.log(`Lighthouse: already measured after the latest deploy (${activity.lastDeploy}).`);
  process.exit(0);
}

// Chrome on macOS, Windows or Linux, or Edge (same engine); CHROME_PATH overrides. As in readme-cards.mjs.
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

// One run's performance score, 0 to 100 (null when Lighthouse couldn't score the page)
function score(preset) {
  const args = [
    "--yes", LIGHTHOUSE, SITE, "--only-categories=performance", "--output=json", "--output-path=stdout", "--quiet",
    "--chrome-flags=--headless=new", ...(preset === "desktop" ? ["--preset=desktop"] : []),
  ];
  const options = {
    encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 180_000,
    stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, CHROME_PATH: CHROME },
  };
  // On Windows npx is npx.cmd, which only a shell starts (none of the arguments has a space)
  const report = process.platform === "win32" ? execSync(`npx ${args.join(" ")}`, options) : execFileSync("npx", args, options);
  const value = JSON.parse(report).categories?.performance?.score;
  return typeof value === "number" ? Math.round(value * 100) : null;
}

// The median of the runs that scored, or null when fewer than two did
function median(preset) {
  const scores = [];
  for (let run = 1; run <= RUNS; run++) {
    try {
      const value = score(preset);
      if (value !== null) scores.push(value);
    } catch (err) {
      console.error(`Lighthouse ${preset}, run ${run}: ${err.message.split("\n")[0]}`);
    }
  }
  console.log(`Lighthouse ${preset}: ${scores.join(", ") || "no score"}`);
  if (scores.length < 2) return null;
  scores.sort((a, b) => a - b);
  return scores[Math.floor((scores.length - 1) / 2)];
}

const mobile = median("mobile");
const desktop = median("desktop");
if (mobile === null || desktop === null) {
  console.log(`::warning::Lighthouse couldn't measure ${SITE}, so the card keeps its last scores.`);
} else {
  // India is UTC+5:30 all year
  const measured = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  activity.lighthouse = { mobile, desktop, measured, deploy: activity.lastDeploy ?? null };
  // `days` stays last, as portfolio-activity.mjs writes it
  const { days, ...rest } = activity;
  writeFileSync(file, JSON.stringify({ ...rest, days }, null, 2) + "\n");
  console.log(`assets/cards/portfolio-activity.json: Lighthouse ${mobile} on mobile, ${desktop} on desktop (${measured})`);
}
