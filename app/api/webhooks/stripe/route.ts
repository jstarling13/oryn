import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        if (!orgId) break;

        const priceId = sub.items.data[0]?.price.id;
        const plan =
          priceId === process.env.STRIPE_PRO_PRICE_ID ? "PRO" : "CORE";
        const status =
          sub.status === "active"
            ? "ACTIVE"
            : sub.status === "past_due"
            ? "PAST_DUE"
            : sub.status === "canceled"
            ? "CANCELED"
            : "TRIAL";

        await prisma.organization.update({
          where: { id: orgId },
          data: {
            plan,
            status,
            stripeSubId: sub.id,
            stripeCustomerId:
              typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        if (!orgId) break;
        await prisma.organization.update({
          where: { id: orgId },
          data: { status: "CANCELED" },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId) break;

        const org = await prisma.organization.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { status: "PAST_DUE" },
          });

          // Send payment failed email
          const { sendPaymentFailed } = await import("@/lib/resend");
          const { clerkClient } = await import("@clerk/nextjs/server");
          const client = await clerkClient();
          const user = await client.users.getUser(org.clerkUserId);
          const email = user.emailAddresses[0]?.emailAddress;
          if (email) {
            await sendPaymentFailed(
              email,
              `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
            );
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId) break;

        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "ACTIVE" },
        });
        break;
      }
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
