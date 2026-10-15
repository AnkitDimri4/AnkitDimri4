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

// Every node of one of the repository's lists (GraphQL), a hundred at a time
const every = (list, args, fields) => {
  const nodes = [];
  const query = `query($after: String) { repository(owner: "${OWNER}", name: "${REPO}") {
    ${list}(${args}first: 100, after: $after) { nodes { ${fields} } pageInfo { hasNextPage endCursor } } } }`;
  for (let after = null; ; ) {
    const page = JSON.parse(gh("api", "graphql", "-f", `query=${query}`, ...(after ? ["-f", `after=${after}`] : []))).data.repository[list];
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return nodes;
    after = page.pageInfo.endCursor;
  }
};

// Merged pull requests, by the day they were merged
const merged = every("pullRequests", "states: MERGED, ", "mergedAt").map((pr) => dayInIndia(pr.mergedAt));

// Vercel records a GitHub deployment for each build it runs, preview or production (a skipped build has
// none), and its statuses say whether it finished
const builds = every("deployments", "", "createdAt environment statuses(first: 10) { nodes { state } }");
const deployments = builds.map((d) => dayInIndia(d.createdAt));
const production = builds.filter((d) => d.environment === "Production" && d.statuses.nodes.some((s) => s.state === "SUCCESS")).length;

const days = {};
const day = (date) => (days[date] ??= { commits: 0, pullRequests: 0, deployments: 0 });
for (const date of commits) day(date).commits++;
for (const date of merged) day(date).pullRequests++;
for (const date of deployments) day(date).deployments++;
const sorted = Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b)));

const activity = {
  repository: `${OWNER}/${REPO}`,
  publicCopy: `${OWNER}/Portfolio`,
  timeZone: "Asia/Kolkata",
  from: Object.keys(sorted)[0],
  to: dayInIndia(new Date().toISOString()),
  totals: {
    commits: commits.length,
    mergedPullRequests: merged.length,
    deployments: deployments.length,
    productionDeploys: production,
    activeDays: Object.values(sorted).filter((d) => d.commits).length,
  },
  days: sorted,
};
writeFileSync(path.join(root, "assets", "cards", "portfolio-activity.json"), JSON.stringify(activity, null, 2) + "\n");
console.log(`assets/cards/portfolio-activity.json: ${JSON.stringify(activity.totals)}, ${activity.from} to ${activity.to}`);
