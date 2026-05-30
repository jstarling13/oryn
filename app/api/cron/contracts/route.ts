import { NextRequest, NextResponse } from "next/server";
import { runContractAlerts } from "@/lib/agents/contract-alert-agent";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runContractAlerts();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Contract alert cron error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
