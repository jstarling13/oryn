import { prisma } from "@/lib/prisma";
import { draftNegotiationEmail } from "@/lib/claude";
import { sendNegotiationDraftReady } from "@/lib/resend";
import { clerkClient } from "@clerk/nextjs/server";

export async function createNegotiationDraft(vendorId: string, orgId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, orgId },
    include: {
      benchmarks: { orderBy: { benchmarkedAt: "desc" }, take: 1 },
      org: true,
    },
  });

  if (!vendor) throw new Error("Vendor not found");

  const benchmark = vendor.benchmarks[0] ?? null;

  const emailBody = await draftNegotiationEmail(
    vendor.name,
    vendor.category,
    vendor.org.name,
    vendor.org.type,
    vendor.monthlyAmount,
    benchmark?.marketRateTypical ?? null,
    benchmark?.marketRateLow ?? null,
    benchmark?.marketRateHigh ?? null,
    vendor.contractEndDate
      ? vendor.contractEndDate.toISOString().split("T")[0]
      : null,
    vendor.notes
  );

  const draft = await prisma.negotiationDraft.create({
    data: {
      vendorId: vendor.id,
      orgId,
      emailBody,
      status: "DRAFTED",
    },
  });

  // Notify the user
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(vendor.org.clerkUserId);
    const email = user.emailAddresses[0]?.emailAddress;
    if (email) {
      await sendNegotiationDraftReady(
        email,
        vendor.name,
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      );
    }
  } catch (err) {
    console.error("Failed to send draft-ready email:", err);
  }

  return draft;
}
