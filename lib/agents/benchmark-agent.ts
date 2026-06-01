import { prisma } from "@/lib/prisma";
import { runBenchmarkResearch } from "@/lib/claude";
import { sendBenchmarkComplete } from "@/lib/resend";
import { clerkClient } from "@clerk/nextjs/server";
import type { Vendor, Organization } from "@prisma/client";

/**
 * Benchmark a single vendor (fire-and-forget friendly).
 * Creates a BENCHMARKING placeholder first so the UI reacts immediately,
 * then writes the final result.
 */
export async function runBenchmarkForVendor(
  vendor: Vendor,
  org: Pick<Organization, "id" | "city" | "type">
) {
  // Mark in-progress so dashboard auto-refresh picks it up
  await prisma.vendorBenchmark.create({
    data: { vendorId: vendor.id, orgId: org.id, classification: "BENCHMARKING" },
  });

  const result = await runBenchmarkResearch(
    vendor.name,
    vendor.category,
    org.city,
    vendor.monthlyAmount,
    org.type
  );

  return prisma.vendorBenchmark.create({
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
}

export async function runBenchmarksForOrg(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { vendors: true },
  });

  if (!org) throw new Error(`Org ${orgId} not found`);

  const results = [];

  for (const vendor of org.vendors) {
    try {
      await prisma.vendorBenchmark.upsert({
        where: {
          id: (
            await prisma.vendorBenchmark.findFirst({
              where: { vendorId: vendor.id },
              orderBy: { benchmarkedAt: "desc" },
            })
          )?.id ?? "nonexistent",
        },
        create: {
          vendorId: vendor.id,
          orgId: org.id,
          classification: "BENCHMARKING",
        },
        update: {
          classification: "BENCHMARKING",
          benchmarkedAt: new Date(),
        },
      });

      const result = await runBenchmarkResearch(
        vendor.name,
        vendor.category,
        org.city,
        vendor.monthlyAmount,
        org.type
      );

      const benchmark = await prisma.vendorBenchmark.create({
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

      results.push({ vendor, benchmark, success: true });
    } catch (err) {
      console.error(`Benchmark failed for vendor ${vendor.id}:`, err);
      results.push({ vendor, success: false, error: err });
    }
  }

  const overpricedVendors = results.filter(
    (r) =>
      r.success &&
      (r.benchmark?.classification === "OVERPRICED" ||
        r.benchmark?.classification === "ELEVATED")
  );

  const totalSavings = overpricedVendors.reduce((sum, r) => {
    if (!r.benchmark?.marketRateTypical) return sum;
    const annual = (r.vendor.monthlyAmount - r.benchmark.marketRateTypical) * 12;
    return sum + Math.max(0, annual);
  }, 0);

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(org.clerkUserId);
    const email = user.emailAddresses[0]?.emailAddress;
    if (email) {
      await sendBenchmarkComplete(
        email,
        org.name,
        overpricedVendors.length,
        Math.round(totalSavings),
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      );
    }
  } catch (err) {
    console.error("Failed to send benchmark email:", err);
  }

  return {
    orgId,
    vendorsProcessed: results.length,
    overpricedCount: overpricedVendors.length,
    estimatedAnnualSavings: Math.round(totalSavings),
  };
}

export async function runBenchmarksForAll() {
  const orgs = await prisma.organization.findMany({
    where: { status: { in: ["TRIAL", "ACTIVE"] } },
    select: { id: true },
  });

  const results = [];
  for (const org of orgs) {
    try {
      const result = await runBenchmarksForOrg(org.id);
      results.push({ ...result, success: true });
    } catch (err) {
      results.push({ orgId: org.id, success: false, error: String(err) });
    }
  }
  return results;
}
