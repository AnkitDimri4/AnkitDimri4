// node scripts/portfolio-activity.mjs
//
// The numbers and the day-by-day graph on the Portfolio card (readme-cards.mjs draws it): my commits on
// the portfolio's main branch, its merged pull requests, and the site's deployments on Vercel (all of
// them, as GitHub counts them, and the production ones that finished). The work happens in the private
// repository AnkitDimri4/Portfolio-app (its public copy is AnkitDimri4/Portfolio), so this reads GitHub
// through the gh CLI, signed in as AnkitDimri4 (in GitHub Actions, with the PORTFOLIO_STATS_TOKEN
// secret: .github/workflows/portfolio-card.yml). Days are in India's time. Writes
// assets/cards/portfolio-activity.json; run readme-cards.mjs after it.
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "AnkitDimri4";
const REPO = "Portfolio-app";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// India is UTC+5:30 all year
const dayInIndia = (iso) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);

const commits = gh("api", "--paginate", `repos/${OWNER}/${REPO}/commits?author=${OWNER}&per_page=100`, "--jq", ".[].commit.author.date")
  .split("\n")
  .filter(Boolean)
  .map(dayInIndia);

const mergedPullRequests = JSON.parse(
  gh("api", "graphql", "-f", `query=query { repository(owner: "${OWNER}", name: "${REPO}") { pullRequests(states: MERGED) { totalCount } } }`),
).data.repository.pullRequests.totalCount;

// Vercel records a GitHub deployment for each build it runs, preview or production (a skipped build has
// none), and its statuses say whether it finished
const deployments = [];
let production = 0;
const QUERY = `query($after: String) { repository(owner: "${OWNER}", name: "${REPO}") {
  deployments(first: 100, after: $after) {
    nodes { createdAt environment statuses(first: 10) { nodes { state } } }
    pageInfo { hasNextPage endCursor }
  } } }`;
for (let after = null; ; ) {
  const page = JSON.parse(gh("api", "graphql", "-f", `query=${QUERY}`, ...(after ? ["-f", `after=${after}`] : [])))
    .data.repository.deployments;
  for (const d of page.nodes) {
    deployments.push(dayInIndia(d.createdAt));
    if (d.environment === "Production" && d.statuses.nodes.some((s) => s.state === "SUCCESS")) production++;
  }
  if (!page.pageInfo.hasNextPage) break;
  after = page.pageInfo.endCursor;
}

const days = {};
for (const day of commits) (days[day] ??= { commits: 0, deployments: 0 }).commits++;
for (const day of deployments) (days[day] ??= { commits: 0, deployments: 0 }).deployments++;
const sorted = Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b)));

const activity = {
  repository: `${OWNER}/${REPO}`,
  publicCopy: `${OWNER}/Portfolio`,
  timeZone: "Asia/Kolkata",
  from: Object.keys(sorted)[0],
  to: dayInIndia(new Date().toISOString()),
  totals: {
    commits: commits.length,
    mergedPullRequests,
    deployments: deployments.length,
    productionDeploys: production,
    activeDays: Object.values(sorted).filter((d) => d.commits).length,
  },
  days: sorted,
};
writeFileSync(path.join(root, "assets", "cards", "portfolio-activity.json"), JSON.stringify(activity, null, 2) + "\n");
console.log(`assets/cards/portfolio-activity.json: ${JSON.stringify(activity.totals)}, ${activity.from} to ${activity.to}`);
