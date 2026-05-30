# Oryn

Oryn is an AI agent that helps small businesses stop overpaying their vendors. It tracks vendor payments, benchmarks prices against market rates using live AI research, identifies where you're overpaying, and automatically drafts negotiation emails the owner can review and send in one click.

**Stack:** Next.js 14 App Router · Tailwind CSS · PostgreSQL · Prisma · Clerk · Stripe · Resend · Claude API (with web search)

---

## Local setup

### 1. Clone and install

```bash
git clone <repo>
cd oryn
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local` — see comments in the file. You need:
- **Clerk** — create app at https://dashboard.clerk.com
- **Stripe** — create products/prices at https://dashboard.stripe.com, run `stripe listen` for webhooks
- **Anthropic** — get key at https://console.anthropic.com (needs `web_search` tool access)
- **Resend** — create account at https://resend.com, verify your domain
- **PostgreSQL** — Railway, Supabase, or local Postgres

### 3. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 4. Create Stripe products

Create two products in Stripe Dashboard:
- **Oryn Core** — $99/month recurring → copy price ID to `STRIPE_CORE_PRICE_ID`
- **Oryn Pro** — $199/month recurring → copy price ID to `STRIPE_PRO_PRICE_ID`

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Testing the benchmarking agent locally

The benchmark agent calls Claude with web search and may take 30–60 seconds per vendor.

```bash
# Make sure .env.local is set, then:
npx tsx scripts/run-benchmarks.ts
```

Or test a single org via API:
```bash
curl -X POST http://localhost:3000/api/admin/benchmarks \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-clerk-session-cookie>" \
  -d '{"orgId": "your-org-id"}'
```

The agent will:
1. Pull all vendors for the org
2. Call Claude with web_search for each vendor's category + city
3. Parse market rate data into `VendorBenchmark` rows
4. Send a benchmark-complete email via Resend

---

## Testing the negotiation email agent locally

Trigger from the dashboard by clicking **"Draft email"** on an Overpriced or Elevated vendor, or via API:

```bash
curl -X POST http://localhost:3000/api/negotiations \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-clerk-session-cookie>" \
  -d '{"vendorId": "your-vendor-id"}'
```

The agent:
1. Pulls vendor details + benchmark data
2. Calls Claude with a negotiator system prompt
3. Returns a ≤200-word professional email
4. Stores it in `NegotiationDraft` with status `DRAFTED`

---

## All environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Base URL (http://localhost:3000 in dev) |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/onboarding` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` output |
| `STRIPE_CORE_PRICE_ID` | Stripe price ID for $99/mo |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for $199/mo |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `RESEND_API_KEY` | Resend API key |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `CRON_SECRET` | Random string for cron auth |

---

## Railway cron setup

Deploy to Railway and add two cron services pointing at your app URL:

| Cron | Schedule | Endpoint |
|---|---|---|
| Weekly benchmarks | `0 3 * * 1` | `POST /api/cron/benchmarks` |
| Daily contract alerts | `0 9 * * *` | `POST /api/cron/contracts` |

Each cron must send:
```
Authorization: Bearer $CRON_SECRET
```

In Railway: add a **Cron** service → set the command to:
```bash
curl -X POST $NEXT_PUBLIC_APP_URL/api/cron/benchmarks \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Week 1 roadmap — first 3 trial users

**Goal:** sign up 3 restaurant owners in your city on free trials.

**Pitch script** (in person or DM):

> "Hey — I built a tool called Oryn that tells you if Sysco or your other vendors are overcharging you. It researches market rates automatically and writes the negotiation email for you. Takes 10 minutes to set up and the trial is free. Want me to show you what it finds on your account?"

**Where to find them:**
1. Walk into 3 restaurants you know and ask for the owner (not the manager)
2. Local Facebook restaurant owner groups
3. Your local chamber of commerce members list

**What to watch in week 1:**
- Do they complete onboarding? (If not, the 4-step flow is too long — cut it)
- Do they open the benchmark report email?
- Do they click "Draft email" on an overpriced vendor?
- Do they actually send the email? (This is the core value moment)

If they get to "Draft email" and send it, Oryn is working.
If they don't get past onboarding, fix onboarding first.

