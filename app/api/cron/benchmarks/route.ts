import { NextRequest, NextResponse } from "next/server";
import { runBenchmarksForAll } from "@/lib/agents/benchmark-agent";

export async function POST(req: NextRequest) {
  // Verify Railway/cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runBenchmarksForAll();
    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("Cron benchmark error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
