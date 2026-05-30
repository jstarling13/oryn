import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTrialNudge } from "@/lib/resend";
import { clerkClient } from "@clerk/nextjs/server";
import { estimateAnnualSavings } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find orgs whose trial ends in exactly 2 days (day 12 of 14-day trial)
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const twoDaysFromNowEnd = new Date(twoDaysFromNow.getTime() + 24 * 60 * 60 * 1000);

  const orgs = await prisma.organization.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { gte: twoDaysFromNow, lt: twoDaysFromNowEnd },
    },
    include: {
      vendors: {
        include: {
          benchmarks: { orderBy: { benchmarkedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const sent = [];
  const client = await clerkClient();

  for (const org of orgs) {
    try {
      const totalSavings = org.vendors.reduce((sum, v) => {
        return (
          sum +
          estimateAnnualSavings(
            v.monthlyAmount,
            v.benchmarks[0]?.marketRateTypical ?? null
          )
        );
      }, 0);

      const user = await client.users.getUser(org.clerkUserId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) continue;

      await sendTrialNudge(
        email,
        org.name,
        Math.round(totalSavings),
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
      );

      sent.push({ orgId: org.id, orgName: org.name, savingsFound: Math.round(totalSavings) });
    } catch (err) {
      console.error(`Trial nudge failed for org ${org.id}:`, err);
    }
  }

  return NextResponse.json({ nudgesSent: sent.length, details: sent });
}
