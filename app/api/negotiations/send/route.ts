import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { resend, FROM_EMAIL } from "@/lib/resend";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await req.json();
  const draftId: string = body.draftId ?? body.negotiationId;
  const bodyOverride: string | undefined = body.emailBody;
  if (!draftId) return NextResponse.json({ error: "draftId is required" }, { status: 400 });

  const draft = await prisma.negotiationDraft.findFirst({
    where: { id: draftId, orgId: org.id },
    include: {
      vendor: { select: { name: true, contactEmail: true, contactName: true } },
    },
  });

  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (!draft.vendor.contactEmail) {
    return NextResponse.json({ error: "No contact email on file for this vendor" }, { status: 400 });
  }

  // Parse subject and body from the draft (format: "Subject: ...\n\n[body]")
  const rawBody = bodyOverride ?? draft.emailBody;
  const lines = rawBody.split("\n");
  let subject = `Pricing discussion — ${org.name}`;
  let bodyStart = 0;
  if (lines[0].toLowerCase().startsWith("subject:")) {
    subject = lines[0].replace(/^subject:\s*/i, "").trim();
    bodyStart = lines.findIndex((l, i) => i > 0 && l.trim() === "") + 1;
    if (bodyStart <= 0) bodyStart = 1;
  }
  const bodyText = lines.slice(bodyStart).join("\n").trim();

  // Convert plain text to simple HTML paragraphs
  const bodyHtml = bodyText
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:560px;margin:0 auto;padding:40px 24px;">
${bodyHtml}
</div>`;

  const to = draft.vendor.contactName
    ? `${draft.vendor.contactName} <${draft.vendor.contactEmail}>`
    : draft.vendor.contactEmail;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    replyTo: org.ownerEmail ?? undefined,
    subject,
    html,
  });

  await prisma.negotiationDraft.update({
    where: { id: draftId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      ...(bodyOverride ? { emailBody: bodyOverride } : {}),
    },
  });

  return NextResponse.json({ success: true });
}
