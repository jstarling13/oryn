/**
 * Railway cron script — sends contract renewal alerts daily.
 * Schedule: 0 9 * * * (every day at 9am UTC)
 *
 * Usage:
 *   npx tsx scripts/run-contract-alerts.ts
 *
 * Or POST /api/cron/contracts with Authorization: Bearer $CRON_SECRET
 */

import { runContractAlerts } from "../lib/agents/contract-alert-agent";

async function main() {
  console.log(`[${new Date().toISOString()}] Running contract renewal alerts`);
  try {
    const result = await runContractAlerts();
    console.log(`Sent ${result.alertsSent} alert(s):`, result.details);
    console.log(`[${new Date().toISOString()}] Done`);
  } catch (err) {
    console.error("Contract alert run failed:", err);
    process.exit(1);
  }
}

main();
