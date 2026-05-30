import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const draft = await prisma.negotiationDraft.findFirst({
    where: { id, orgId: org.id },
  });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.negotiationDraft.update({
    where: { id },
    data: {
      emailBody: body.emailBody ?? draft.emailBody,
      status: body.status ?? draft.status,
      sentAt: body.sentAt ? new Date(body.sentAt) : draft.sentAt,
      outcome: body.outcome ?? draft.outcome,
      savedAmount: body.savedAmount !== undefined ? body.savedAmount : draft.savedAmount,
    },
  });

  return NextResponse.json(updated);
}
