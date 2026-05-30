import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { runBenchmarkResearch } from "@/lib/claude";

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

  // Create a "benchmarking in progress" record immediately so the UI updates
  await prisma.vendorBenchmark.create({
    data: {
      vendorId: vendor.id,
      orgId: org.id,
      classification: "BENCHMARKING",
    },
  });

  // Run research in background, don't await
  (async () => {
    try {
      const result = await runBenchmarkResearch(
        vendor.name,
        vendor.category,
        org.city,
        vendor.monthlyAmount,
        org.type
      );
      await prisma.vendorBenchmark.create({
        data: {
          vendorId: vendor.id,
          orgId: org.id,
          marketRateLow: result.marketRateLow,
          marketRateHigh: result.marketRateHigh,
          marketRateTypical: result.marketRateTypical,
          confidence: result.confidence,
          sourcesSummary: result.sourcesSummary,
          classification: result.classification,
          rawResearch: result.rawResearch,
        },
      });
    } catch (err) {
      console.error("Re-benchmark failed for vendor", id, err);
    }
  })();

  return NextResponse.json({ queued: true });
}
