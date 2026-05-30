import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { runBenchmarksForOrg } from "@/lib/agents/benchmark-agent";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const vendors = await prisma.vendor.findMany({
    where: { orgId: org.id },
    orderBy: { addedAt: "desc" },
    include: { benchmarks: { orderBy: { benchmarkedAt: "desc" }, take: 1 } },
  });

  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  // Check vendor limit for Core plan
  if (org.plan === "CORE") {
    const count = await prisma.vendor.count({ where: { orgId: org.id } });
    if (count >= 10) {
      return NextResponse.json(
        { error: "Core plan limit: 10 vendors. Upgrade to Pro for unlimited vendors." },
        { status: 403 }
      );
    }
  }

  const body = await req.json();
  const { name, category, monthlyAmount, contractEndDate, notes, contactEmail, contactName } = body;

  const vendor = await prisma.vendor.create({
    data: {
      orgId: org.id,
      name,
      category,
      monthlyAmount,
      contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
      notes: notes ?? null,
      contactEmail: contactEmail ?? null,
      contactName: contactName ?? null,
    },
  });

  // Trigger benchmark for new vendor
  runBenchmarksForOrg(org.id).catch(console.error);

  return NextResponse.json(vendor, { status: 201 });
}
