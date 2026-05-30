import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe, PLANS, createStripeCustomer, createCheckoutSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { plan, annual = false } = body;
  if (!plan || !PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const name = user?.fullName ?? user?.firstName ?? "Oryn User";

  let org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripeCustomer(email, name);
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const planData = PLANS[plan as keyof typeof PLANS];
  const priceId = (annual && planData.annualPriceId) ? planData.annualPriceId : planData.priceId;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const session = await createCheckoutSession(
    customerId,
    priceId,
    org.id,
    `${baseUrl}/dashboard?checkout=success`,
    `${baseUrl}/dashboard/billing`
  );

  return NextResponse.json({ url: session.url });
}
