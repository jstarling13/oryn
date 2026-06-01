import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createNegotiationDraft } from "@/lib/agents/negotiation-agent";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const { vendorId } = await req.json();

  // createNegotiationDraft handles drafting + sends "draft ready" Resend notification
  const draft = await createNegotiationDraft(vendorId, org.id);

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
