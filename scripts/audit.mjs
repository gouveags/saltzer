import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["audit", "--prod", "--json"], {
  encoding: "utf8",
  shell: false,
});

if (result.error) throw result.error;

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  process.stderr.write(result.stderr || result.stdout || "Dependency audit returned no report.\n");
  process.exit(result.status || 1);
}

const vulnerabilities = report.metadata?.vulnerabilities;
if (!vulnerabilities) {
  process.stderr.write("Dependency audit returned an unexpected report.\n");
  process.exit(1);
}

const { info, low, moderate, high, critical } = vulnerabilities;
process.stdout.write(
  `Production dependency audit: ${critical} critical, ${high} high, ${moderate} moderate, ${low} low, ${info} info.\n`,
);

if (critical > 0 || high > 0) process.exit(1);
