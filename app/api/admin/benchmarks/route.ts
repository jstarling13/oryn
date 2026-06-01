import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { runBenchmarksForOrg } from "@/lib/agents/benchmark-agent";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());

  if (!adminEmails.includes(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orgId } = await req.json();
  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  // Fire-and-forget — benchmark runs take minutes per org and would timeout
  runBenchmarksForOrg(orgId).catch((err) =>
    console.error(`Admin benchmark failed for org ${orgId}:`, err)
  );

  return NextResponse.json({ queued: true, orgId });
}
