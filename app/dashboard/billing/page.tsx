"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OrgBilling {
  plan: "CORE" | "PRO";
  status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED";
  trialEndsAt: string | null;
  stripeSubId: string | null;
}

function daysLeft(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [org, setOrg] = useState<OrgBilling | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding").then((r) => r.json()).then((data) => {
      if (data) setOrg({ plan: data.plan, status: data.status, trialEndsAt: data.trialEndsAt, stripeSubId: data.stripeSubId });
    });
  }, []);

  const openPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url } = await res.json();
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async (plan: "CORE" | "PRO") => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, annual }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  };

  const trialDays = daysLeft(org?.trialEndsAt ?? null);
  const isActive = org?.status === "ACTIVE";
  const isTrial = org?.status === "TRIAL";
  const isPastDue = org?.status === "PAST_DUE";

  const PLANS = [
    {
      plan: "CORE" as const,
      name: "Core",
      monthly: 99,
      description: "For businesses with up to 10 vendors",
      features: [
        "Up to 10 vendors tracked",
        "AI benchmark report for every vendor",
        "Negotiation email drafts",
        "Contract renewal alerts (60 days out)",
        "Copy-to-clipboard email send",
        "Email support",
      ],
    },
    {
      plan: "PRO" as const,
      name: "Pro",
      monthly: 199,
      description: "Unlimited vendors + 1-click direct send",
      features: [
        "Unlimited vendors",
        "Weekly benchmarking refresh",
        "One-click direct send to vendor email",
        "Contract alerts — 60 days out",
        "Priority benchmarking queue",
        "Priority support",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 h-14 flex items-center px-6 gap-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
        <span className="font-bold text-gray-900">Billing</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Billing & plan</h1>

        {/* Monthly / Annual toggle */}
        <div className="flex items-center gap-4 mb-8">
          <span className={`text-sm font-medium ${!annual ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-amber-600" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${annual ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? "text-gray-900" : "text-gray-400"}`}>
            Annual <span className="ml-1 text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">Save 20%</span>
          </span>
        </div>

        {/* Current status banner */}
        {org && (
          <div className={`rounded-xl p-5 mb-8 border ${
            isPastDue ? "bg-red-50 border-red-200" :
            isTrial ? "bg-amber-50 border-amber-200" :
            isActive ? "bg-green-50 border-green-200" :
            "bg-gray-50 border-gray-200"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Current plan: <span className="font-black">{org.plan}</span>
                  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                    isPastDue ? "bg-red-100 text-red-700" :
                    isTrial ? "bg-amber-100 text-amber-700" :
                    isActive ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{org.status.replace("_", " ")}</span>
                </p>
                {isTrial && trialDays !== null && (
                  <p className="text-sm text-amber-700 mt-1">
                    {trialDays > 0
                      ? `${trialDays} day${trialDays !== 1 ? "s" : ""} remaining in trial`
                      : "Trial has expired — add a card to continue"}
                  </p>
                )}
                {isPastDue && (
                  <p className="text-sm text-red-700 mt-1">Payment failed. Update your card to restore access.</p>
                )}
                {isActive && (
                  <p className="text-sm text-green-700 mt-1">Active subscription — your vendors are being monitored.</p>
                )}
              </div>
              {(isActive || isPastDue) && org.stripeSubId && (
                <button
                  onClick={openPortal}
                  disabled={loading}
                  className="text-sm font-medium text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-white transition-colors"
                >
                  Manage →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Plan cards — show all for trial/canceled; active users only see upgrades */}
        <div className="grid gap-6 mb-8">
          {PLANS.filter((p) => {
            if (!isActive) return true; // show all during trial / canceled
            // Active: only show plans that are a genuine upgrade (PRO > CORE)
            const rank: Record<string, number> = { CORE: 1, PRO: 2 };
            return (rank[p.plan] ?? 0) > (rank[org?.plan ?? ""] ?? 0);
          }).map((p) => {
            const displayPrice = annual ? Math.round(p.monthly * 0.8) : p.monthly;
            const annualTotal = annual ? displayPrice * 12 : null;
            return (
            <div key={p.plan} className={`bg-white border rounded-xl p-6 ${p.plan === "PRO" ? "border-amber-300 ring-1 ring-amber-200" : "border-gray-200"}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-lg">{p.name}</h3>
                    {p.plan === "PRO" && (
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">POPULAR</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">${displayPrice}<span className="text-base font-normal text-gray-500">/mo</span></p>
                    {annual && <span className="text-xs text-gray-400">${annualTotal}/yr</span>}
                  </div>
                  {annual && <p className="text-xs text-green-600 font-semibold">Save ${(p.monthly - displayPrice) * 12}/year vs monthly</p>}
                  <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                </div>
                <button
                  onClick={() => startCheckout(p.plan)}
                  disabled={loading}
                  className={`text-sm font-bold px-5 py-2.5 rounded-lg transition-colors ${
                    p.plan === "PRO"
                      ? "bg-amber-600 hover:bg-amber-700 text-white disabled:bg-amber-300"
                      : "border-2 border-amber-600 text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  {isTrial ? "Start plan" : "Subscribe"}
                </button>
              </div>
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );})}
        </div>

        {isActive && (
          <button
            onClick={openPortal}
            disabled={loading}
            className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-white transition-colors text-sm"
          >
            {loading ? "Loading…" : "Manage subscription / update payment method →"}
          </button>
        )}

        <p className="text-xs text-gray-400 text-center mt-3">
          Powered by Stripe. Cancel anytime. No long-term contracts.
        </p>
      </div>
    </div>
  );
}
