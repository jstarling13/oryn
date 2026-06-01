import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { runBenchmarkForVendor } from "@/lib/agents/benchmark-agent";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const vendor = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  // Run in background — runBenchmarkForVendor creates the BENCHMARKING
  // placeholder first so the dashboard auto-refresh sees it immediately.
  runBenchmarkForVendor(vendor, org).catch((err) =>
    console.error("Re-benchmark failed for vendor", id, err)
  );

  return NextResponse.json({ queued: true });
}
