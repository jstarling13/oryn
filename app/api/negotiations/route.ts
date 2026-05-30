import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { draftNegotiationEmail } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { vendorId } = await req.json();

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, orgId: org.id },
    include: {
      benchmarks: { orderBy: { benchmarkedAt: "desc" }, take: 1 },
    },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const benchmark = vendor.benchmarks[0] ?? null;

  const emailBody = await draftNegotiationEmail(
    vendor.name,
    vendor.category,
    org.name,
    org.type,
    vendor.monthlyAmount,
    benchmark?.marketRateTypical ?? null,
    benchmark?.marketRateLow ?? null,
    benchmark?.marketRateHigh ?? null,
    vendor.contractEndDate ? vendor.contractEndDate.toISOString().split("T")[0] : null,
    vendor.notes
  );

  const draft = await prisma.negotiationDraft.create({
    data: {
      vendorId: vendor.id,
      orgId: org.id,
      emailBody,
      status: "DRAFTED",
    },
  });

  return NextResponse.json(draft, { status: 201 });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const drafts = await prisma.negotiationDraft.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: { vendor: { select: { name: true, category: true } } },
  });

  return NextResponse.json(drafts);
}
