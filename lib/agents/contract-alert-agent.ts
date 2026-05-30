import { prisma } from "@/lib/prisma";
import { sendContractRenewalAlert } from "@/lib/resend";
import { clerkClient } from "@clerk/nextjs/server";

export async function runContractAlerts() {
  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const vendors = await prisma.vendor.findMany({
    where: {
      contractEndDate: { gte: now, lte: in60Days },
      org: { status: { in: ["TRIAL", "ACTIVE"] } },
    },
    include: { org: true },
  });

  const sent = [];

  for (const vendor of vendors) {
    const daysUntilRenewal = Math.ceil(
      (vendor.contractEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const recentAlert = await prisma.contractAlert.findFirst({
      where: {
        vendorId: vendor.id,
        alertSentAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentAlert) continue;

    try {
      const client = await clerkClient();
      const user = await client.users.getUser(vendor.org.clerkUserId);
      const email = user.emailAddresses[0]?.emailAddress;

      if (email) {
        await sendContractRenewalAlert(
          email,
          vendor.name,
          daysUntilRenewal,
          `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        );

        await prisma.contractAlert.create({
          data: {
            vendorId: vendor.id,
            orgId: vendor.orgId,
            daysUntilRenewal,
          },
        });

        sent.push({ vendorId: vendor.id, vendorName: vendor.name, daysUntilRenewal });
      }
    } catch (err) {
      console.error(`Contract alert failed for vendor ${vendor.id}:`, err);
    }
  }

  return { alertsSent: sent.length, details: sent };
}
