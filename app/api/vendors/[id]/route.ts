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

  const vendor = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      name: body.name ?? vendor.name,
      category: body.category ?? vendor.category,
      monthlyAmount: body.monthlyAmount ?? vendor.monthlyAmount,
      contractEndDate: body.contractEndDate
        ? new Date(body.contractEndDate)
        : vendor.contractEndDate,
      notes: body.notes !== undefined ? body.notes : vendor.notes,
      contactEmail: body.contactEmail !== undefined ? body.contactEmail : vendor.contactEmail,
      contactName: body.contactName !== undefined ? body.contactName : vendor.contactName,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const vendor = await prisma.vendor.findFirst({ where: { id, orgId: org.id } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
