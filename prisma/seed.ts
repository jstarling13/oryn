/**
 * Seed script — creates a demo org with vendors for local testing.
 * Run: npx tsx prisma/seed.ts
 *
 * Requires DATABASE_URL in .env.local and a real Clerk userId.
 * Get your userId from the Clerk dashboard → Users.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_CLERK_USER_ID = process.env.SEED_CLERK_USER_ID ?? "user_demo";

async function main() {
  console.log("Seeding demo data…");

  const org = await prisma.organization.upsert({
    where: { clerkUserId: DEMO_CLERK_USER_ID },
    create: {
      clerkUserId: DEMO_CLERK_USER_ID,
      name: "Joe's Diner",
      type: "restaurant",
      city: "Columbus, GA",
      monthlyRevenue: "50k_100k",
      plan: "CORE",
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      onboardingDone: true,
    },
    update: {},
  });

  console.log(`Org: ${org.name} (${org.id})`);

  const vendors = [
    { name: "Sysco Foods", category: "FOOD_BEVERAGE" as const, monthlyAmount: 8400, notes: "Net 30, rep is Mike Johnson" },
    { name: "Clean Team Services", category: "CLEANING" as const, monthlyAmount: 1200, notes: "Weekly cleaning, 3 visits" },
    { name: "Fresh Linen Co", category: "LINEN_LAUNDRY" as const, monthlyAmount: 680 },
    { name: "Toast POS", category: "POS_SOFTWARE" as const, monthlyAmount: 299, notes: "Annual contract, renews March 2026" },
    { name: "DoorDash", category: "DELIVERY_PLATFORM" as const, monthlyAmount: 1850, notes: "30% commission rate" },
  ];

  for (const v of vendors) {
    const vendor = await prisma.vendor.upsert({
      where: { id: `seed-${v.name.toLowerCase().replace(/\s/g, "-")}` },
      create: { id: `seed-${v.name.toLowerCase().replace(/\s/g, "-")}`, orgId: org.id, ...v },
      update: {},
    });

    // Add a benchmark for each vendor
    await prisma.vendorBenchmark.create({
      data: {
        vendorId: vendor.id,
        orgId: org.id,
        marketRateLow: v.monthlyAmount * 0.6,
        marketRateHigh: v.monthlyAmount * 0.85,
        marketRateTypical: v.monthlyAmount * 0.72,
        confidence: "MEDIUM",
        sourcesSummary: `Market research suggests typical rates for ${v.name.split(" ")[0]}-category vendors in this region range from ${Math.round(v.monthlyAmount * 0.6).toLocaleString()}–${Math.round(v.monthlyAmount * 0.85).toLocaleString()}/mo for similar-sized businesses.`,
        classification: "OVERPRICED",
      },
    });

    console.log(`  ✓ ${vendor.name} — $${v.monthlyAmount}/mo (OVERPRICED)`);
  }

  console.log("\nSeed complete. Open /dashboard to see demo data.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
