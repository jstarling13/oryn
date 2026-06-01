import { Resend } from "resend";

// Gracefully degrade if RESEND_API_KEY is not set (dev / test environments)
export const resend = new Resend(process.env.RESEND_API_KEY ?? "re_missing_key");

// Resend requires a verified domain. Until oryn.ai is verified, set
// RESEND_FROM_EMAIL=onboarding@resend.dev in .env.local for testing.
export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Oryn <notifications@oryn.ai>";
const UNSUBSCRIBE_EMAIL = "unsubscribe@oryn.ai";

/** Shared headers required for CAN-SPAM / GDPR compliance */
const complianceHeaders = {
  "List-Unsubscribe": `<mailto:${UNSUBSCRIBE_EMAIL}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
};

const emailFooter = `<p style="color:#999;font-size:11px;margin-top:40px;border-top:1px solid #eee;padding-top:16px;">
  You received this email because you have an Oryn account.
  To stop receiving emails, reply with "unsubscribe" or email
  <a href="mailto:${UNSUBSCRIBE_EMAIL}" style="color:#999;">${UNSUBSCRIBE_EMAIL}</a>.
  <br/>Oryn · oryn.ai
</p>`;

export async function sendBenchmarkComplete(
  to: string,
  orgName: string,
  overpricedCount: number,
  totalSavings: number,
  dashboardUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Oryn report is ready — here's what we found`,
    html: benchmarkCompleteHtml(orgName, overpricedCount, totalSavings, dashboardUrl),
    headers: complianceHeaders,
  });
}

export async function sendNegotiationDraftReady(
  to: string,
  vendorName: string,
  draftUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your email to ${vendorName} is drafted and waiting for your review`,
    html: negotiationDraftHtml(vendorName, draftUrl),
    headers: complianceHeaders,
  });
}

export async function sendContractRenewalAlert(
  to: string,
  vendorName: string,
  daysUntilRenewal: number,
  dashboardUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your contract with ${vendorName} expires in ${daysUntilRenewal} days`,
    html: contractRenewalHtml(vendorName, daysUntilRenewal, dashboardUrl),
    headers: complianceHeaders,
  });
}

export async function sendTrialNudge(
  to: string,
  orgName: string,
  savingsFound: number,
  checkoutUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've identified $${savingsFound.toLocaleString()} in potential savings — keep Oryn running`,
    html: trialNudgeHtml(orgName, savingsFound, checkoutUrl),
    headers: complianceHeaders,
  });
}

export async function sendPaymentFailed(to: string, updateUrl: string) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Oryn: payment failed — please update your card`,
    html: paymentFailedHtml(updateUrl),
    headers: complianceHeaders,
  });
}

export async function sendWelcome(
  to: string,
  orgName: string,
  vendorCount: number,
  dashboardUrl: string
) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Welcome to Oryn — your first benchmark report is on its way`,
    html: welcomeHtml(orgName, vendorCount, dashboardUrl),
    headers: complianceHeaders,
  });
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #111;
  max-width: 560px;
  margin: 0 auto;
  padding: 40px 24px;
`;

function benchmarkCompleteHtml(
  orgName: string,
  overpricedCount: number,
  totalSavings: number,
  dashboardUrl: string
) {
  return `<div style="${baseStyles}">
    <h2 style="color:#D97706;margin-bottom:8px;">Your Oryn report is ready</h2>
    <p>Hi ${orgName},</p>
    <p>We finished benchmarking your vendors. Here's the summary:</p>
    <div style="background:#FEF3C7;border-left:4px solid #D97706;padding:16px;margin:24px 0;border-radius:4px;">
      <strong>${overpricedCount} vendor${overpricedCount !== 1 ? "s" : ""}</strong> where you may be overpaying<br/>
      <strong style="font-size:20px;">$${totalSavings.toLocaleString()}</strong> estimated annual savings identified
    </div>
    <a href="${dashboardUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View your report →</a>
    ${emailFooter}
  </div>`;
}

function negotiationDraftHtml(vendorName: string, draftUrl: string) {
  return `<div style="${baseStyles}">
    <h2 style="color:#D97706;">Your negotiation email is ready</h2>
    <p>We drafted a professional negotiation email to <strong>${vendorName}</strong>.</p>
    <p>Review it, make any edits you'd like, then send with one click.</p>
    <a href="${draftUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Review & send →</a>
    ${emailFooter}
  </div>`;
}

function contractRenewalHtml(
  vendorName: string,
  daysUntilRenewal: number,
  dashboardUrl: string
) {
  return `<div style="${baseStyles}">
    <h2 style="color:#D97706;">Contract renewal coming up</h2>
    <p>Your contract with <strong>${vendorName}</strong> expires in <strong>${daysUntilRenewal} days</strong>.</p>
    <p>This is the best time to negotiate — your leverage is highest before you renew. Log in to see your benchmark data and draft a negotiation email.</p>
    <a href="${dashboardUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">View benchmark & draft email →</a>
    ${emailFooter}
  </div>`;
}

function trialNudgeHtml(
  orgName: string,
  savingsFound: number,
  checkoutUrl: string
) {
  return `<div style="${baseStyles}">
    <h2 style="color:#D97706;">Your trial ends in 2 days</h2>
    <p>Hi ${orgName},</p>
    <p>Oryn has already found <strong>$${savingsFound.toLocaleString()} in potential annual savings</strong> for your business.</p>
    <p>Add a card to keep Oryn running and turn those savings into reality.</p>
    <a href="${checkoutUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Keep Oryn running →</a>
    <p style="color:#666;font-size:13px;margin-top:16px;">The average Oryn client saves $4,200/year. That&apos;s 42× return on a Core plan.</p>
    ${emailFooter}
  </div>`;
}

function paymentFailedHtml(updateUrl: string) {
  return `<div style="${baseStyles}">
    <h2>Payment failed</h2>
    <p>We weren't able to process your Oryn subscription payment.</p>
    <p>Please update your payment method to keep your account active and avoid losing access to your benchmark data and negotiation history.</p>
    <a href="${updateUrl}" style="display:inline-block;background:#111;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Update payment method →</a>
    ${emailFooter}
  </div>`;
}

function welcomeHtml(orgName: string, vendorCount: number, dashboardUrl: string) {
  return `<div style="${baseStyles}">
    <h2 style="color:#D97706;">Welcome to Oryn, ${orgName}!</h2>
    <p>You're all set. We've started benchmarking your <strong>${vendorCount} vendor${vendorCount !== 1 ? "s" : ""}</strong> against real market rates.</p>
    <div style="background:#FEF3C7;border-left:4px solid #D97706;padding:16px;margin:24px 0;border-radius:4px;">
      <strong>What happens next:</strong><br/>
      <ul style="margin:8px 0 0;padding-left:20px;line-height:1.8;">
        <li>We research current pricing for each of your vendors</li>
        <li>You'll get an email when your first benchmark report is ready</li>
        <li>For any overpriced vendors, we'll draft a negotiation email for you</li>
      </ul>
    </div>
    <p>The average Oryn client finds <strong>$4,200 in annual savings</strong>. Most of it comes in the first 2 weeks.</p>
    <a href="${dashboardUrl}" style="display:inline-block;background:#D97706;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Go to your dashboard →</a>
    <p style="color:#666;font-size:13px;margin-top:16px;">Reply to this email anytime if you have questions. We&apos;re here to help.</p>
    ${emailFooter}
  </div>`;
}
