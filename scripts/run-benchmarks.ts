/**
 * Railway cron script — runs weekly benchmarks for all active orgs.
 * Schedule: 0 3 * * 1 (every Monday at 3am UTC)
 *
 * Usage:
 *   npx tsx scripts/run-benchmarks.ts
 *
 * Or POST /api/cron/benchmarks with Authorization: Bearer $CRON_SECRET
 */

import { runBenchmarksForAll } from "../lib/agents/benchmark-agent";

async function main() {
  console.log(`[${new Date().toISOString()}] Starting weekly benchmark run`);
  try {
    const results = await runBenchmarksForAll();
    console.log("Results:", JSON.stringify(results, null, 2));
    console.log(`[${new Date().toISOString()}] Benchmark run complete`);
  } catch (err) {
    console.error("Benchmark run failed:", err);
    process.exit(1);
  }
}

main();
