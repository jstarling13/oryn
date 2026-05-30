@AGENTS.md

# Oryn — Project Context

Oryn is a standalone AI SaaS that helps small businesses stop overpaying vendors.
It is NOT related to Vericount or any other project.

## What it does
- Tracks what a business pays each vendor
- Benchmarks those prices using Claude + web search
- Drafts negotiation emails for overpriced vendors
- Alerts on contract renewals 60 days out

## Stack
- Next.js 16 App Router (in `app/`)
- Tailwind CSS v4
- PostgreSQL + Prisma ORM (schema in `prisma/schema.prisma`)
- Clerk for auth (userId maps to `Organization.clerkUserId`)
- Stripe Billing — Core $99/mo, Pro $199/mo, 14-day trial
- Resend for transactional email
- Claude API (claude-sonnet-4-20250514) with web_search tool for benchmarking

## Key files
- `lib/claude.ts` — benchmark research + negotiation email drafting
- `lib/agents/benchmark-agent.ts` — runs for an org or all orgs
- `lib/agents/contract-alert-agent.ts` — daily contract expiry check
- `lib/agents/negotiation-agent.ts` — drafts + notifies
- `app/api/cron/benchmarks/route.ts` — weekly cron (POST, bearer auth)
- `app/api/cron/contracts/route.ts` — daily cron
- `app/api/cron/trial-nudge/route.ts` — day-12 trial nudge
- `app/api/webhooks/stripe/route.ts` — subscription lifecycle

## Auth pattern
Every authenticated API route does:
```ts
const { userId } = await auth();
const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
```

## Running locally
```
cp .env.example .env.local   # fill in keys
npm run db:push              # push schema to DB
npm run dev                  # start dev server
```

## Cron secrets
All cron routes require `Authorization: Bearer $CRON_SECRET` header.
Admin routes require the caller's Clerk email to be in `ADMIN_EMAILS` env var.
