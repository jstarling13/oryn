import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { runBenchmarksForOrg } from "@/lib/agents/benchmark-agent";
import { sendWelcome } from "@/lib/resend";

// GET — fetch the current user's org (used by dashboard)
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({
    where: { clerkUserId: userId },
    include: {
      vendors: {
        orderBy: { addedAt: "desc" },
        include: {
          benchmarks: { orderBy: { benchmarkedAt: "desc" }, take: 1 },
        },
      },
      negotiationDrafts: {
        orderBy: { createdAt: "desc" },
        include: { vendor: { select: { name: true } } },
      },
    },
  });

  if (!org) return NextResponse.json(null, { status: 200 });
  return NextResponse.json(org);
}

// POST — complete onboarding: create org + vendors + kick off benchmarks
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const body = await req.json();
  const { businessName, businessType, city, monthlyRevenue, vendors } = body;

  if (!businessName || !businessType || !city || !monthlyRevenue) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({
    where: { clerkUserId: userId },
  });
  if (existing?.onboardingDone) {
    return NextResponse.json({ error: "Onboarding already completed" }, { status: 400 });
  }

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Core plan allows up to 10 vendors; onboarding starts on CORE
  const vendorList = (vendors ?? []).slice(0, 10);

  type VendorInput = {
    name: string;
    category: string;
    monthlyAmount: number;
    contractEndDate?: string | null;
    notes?: string | null;
    contactEmail?: string | null;
    contactName?: string | null;
  };

  // Atomic: if vendor creation fails the org is NOT persisted (user can retry)
  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.upsert({
      where: { clerkUserId: userId },
      create: {
        clerkUserId: userId,
        name: businessName,
        type: businessType,
        city,
        monthlyRevenue,
        trialEndsAt,
        onboardingDone: true,
      },
      update: {
        name: businessName,
        type: businessType,
        city,
        monthlyRevenue,
        trialEndsAt,
        onboardingDone: true,
      },
    });

    if (vendorList.length) {
      await tx.vendor.createMany({
        data: vendorList.map((v: VendorInput) => ({
          orgId: created.id,
          name: v.name,
          category: v.category,
          monthlyAmount: v.monthlyAmount,
          contractEndDate: v.contractEndDate ? new Date(v.contractEndDate) : null,
          notes: v.notes ?? null,
          contactEmail: v.contactEmail ?? null,
          contactName: v.contactName ?? null,
        })),
      });
    }

    return created;
  });

  const vendorCount = vendorList.length;

  // Fire welcome email and benchmarks in background
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://oryn.ai";
  const ownerEmail = user?.emailAddresses[0]?.emailAddress;
  if (ownerEmail) {
    sendWelcome(ownerEmail, org.name, vendorCount, `${appUrl}/dashboard`).catch(console.error);
    // Store ownerEmail on org for later use (nudge, billing emails)
    prisma.organization.update({ where: { id: org.id }, data: { ownerEmail, ownerName: user?.fullName ?? user?.firstName ?? null } }).catch(console.error);
  }

  runBenchmarksForOrg(org.id).catch((e) =>
    console.error("Background benchmark failed:", e)
  );

  return NextResponse.json({ success: true, orgId: org.id });
}
