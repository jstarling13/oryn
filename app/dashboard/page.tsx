"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  daysUntil,
  getClassificationColor,
  getClassificationLabel,
  estimateAnnualSavings,
  VENDOR_CATEGORIES,
} from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────── */

interface Benchmark {
  id: string;
  marketRateLow: number | null;
  marketRateHigh: number | null;
  marketRateTypical: number | null;
  confidence: string | null;
  sourcesSummary: string | null;
  classification: string;
  benchmarkedAt: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  monthlyAmount: number;
  contactEmail: string | null;
  contactName: string | null;
  contractEndDate: string | null;
  notes: string | null;
  addedAt: string;
  benchmarks: Benchmark[];
}

interface NegotiationDraft {
  id: string;
  vendorId: string;
  emailBody: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  outcome: string | null;
  savedAmount: number | null;
  vendor: { name: string };
}

interface OrgData {
  id: string;
  name: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  vendors: Vendor[];
  negotiationDrafts: NegotiationDraft[];
}

/* ─── Helpers ───────────────────────────────────────────────── */

function catLabel(cat: string) {
  return VENDOR_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

/* ─── Animated counter ──────────────────────────────────────── */

function AnimatedNumber({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const step = target / 40;
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setValue(Math.round(cur));
      if (cur >= target) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [target]);
  return <span>{prefix}{value.toLocaleString()}{suffix}</span>;
}

/* ─── Opportunity banner ────────────────────────────────────── */

function OpportunityBanner({
  topVendor,
  totalMonthlyOverpay,
  onAction,
}: {
  topVendor: Vendor | null;
  totalMonthlyOverpay: number;
  onAction: (v: Vendor) => void;
}) {
  if (!topVendor || totalMonthlyOverpay === 0) return null;
  const annualOverpay = totalMonthlyOverpay * 12;

  return (
    <div className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-2xl p-6 text-white mb-6 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-amber-100 text-sm font-medium mb-1">You are currently overpaying</p>
          <p className="text-4xl font-bold tracking-tight">
            <AnimatedNumber target={annualOverpay} prefix="$" suffix="/yr" />
          </p>
          <p className="text-amber-100 text-sm mt-1">
            That&apos;s{" "}
            <strong className="text-white">{formatCurrency(totalMonthlyOverpay)}/month</strong>{" "}
            you could keep. Every month you wait, that money is gone.
          </p>
        </div>
        <div className="flex-shrink-0">
          <p className="text-amber-100 text-xs mb-2 font-medium">BIGGEST OPPORTUNITY</p>
          <button
            onClick={() => onAction(topVendor)}
            className="bg-white text-amber-700 font-bold px-6 py-3 rounded-xl hover:bg-amber-50 transition-colors text-sm whitespace-nowrap shadow"
          >
            Fix {topVendor.name} now →
          </button>
          <p className="text-amber-100 text-xs mt-1.5 text-center">
            Save ~{formatCurrency(estimateAnnualSavings(topVendor.monthlyAmount, topVendor.benchmarks[0]?.marketRateTypical ?? null))}/yr
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Progress bar ──────────────────────────────────────────── */

function OptimizationProgress({ vendors }: { vendors: Vendor[] }) {
  if (!vendors.length) return null;
  const benchmarked = vendors.filter((v) => v.benchmarks[0]?.classification && v.benchmarks[0].classification !== "BENCHMARKING");
  const optimized = vendors.filter(
    (v) => v.benchmarks[0]?.classification === "FAIR" ||
      (v.benchmarks.length > 0 && v.benchmarks.some((b) => b.classification === "WON" as string))
  );
  const pct = benchmarked.length ? Math.round((optimized.length / benchmarked.length) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Vendor optimization progress</p>
          <p className="text-xs text-gray-400 mt-0.5">{optimized.length} of {benchmarked.length} vendors at fair market rate</p>
        </div>
        <span className="text-2xl font-bold text-amber-600">{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className="bg-amber-500 h-2.5 rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Edit vendor modal ─────────────────────────────────────── */

function EditVendorModal({ vendor, onClose, onSaved }: { vendor: Vendor; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: vendor.name,
    category: vendor.category,
    monthlyAmount: String(vendor.monthlyAmount),
    contactEmail: vendor.contactEmail ?? "",
    contactName: vendor.contactName ?? "",
    contractEndDate: vendor.contractEndDate ? vendor.contractEndDate.split("T")[0] : "",
    notes: vendor.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          monthlyAmount: parseFloat(form.monthlyAmount),
          contactEmail: form.contactEmail || null,
          contactName: form.contactName || null,
          contractEndDate: form.contractEndDate || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setLoading(false); }
  };

  const deleteVendor = async () => {
    if (!confirm(`Delete ${vendor.name}? This cannot be undone.`)) return;
    setLoading(true);
    await fetch(`/api/vendors/${vendor.id}`, { method: "DELETE" });
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit vendor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Vendor name" className="input" />
          <select value={form.category} onChange={e => set("category", e.target.value)} className="input bg-white">
            <option value="">Category…</option>
            {VENDOR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
            <input type="number" value={form.monthlyAmount} onChange={e => set("monthlyAmount", e.target.value)} placeholder="Monthly amount" className="input pl-7" />
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">VENDOR CONTACT (optional — enables 1-click send)</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Contact name" className="input text-sm" />
              <input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="Contact email" className="input text-sm" />
            </div>
          </div>
          <input type="date" value={form.contractEndDate} onChange={e => set("contractEndDate", e.target.value)} className="input text-gray-600" />
          <input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Notes (optional)" className="input" />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={deleteVendor} disabled={loading} className="px-4 py-2.5 border border-red-200 text-red-600 text-sm rounded-xl hover:bg-red-50 transition-colors">Delete</button>
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={loading} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            {loading ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Vendor card ───────────────────────────────────────────── */

function VendorCard({
  vendor,
  onDraftEmail,
  onMarkWon,
  onEdit,
}: {
  vendor: Vendor;
  onDraftEmail: (v: Vendor) => void;
  onMarkWon: (v: Vendor) => void;
  onEdit: (v: Vendor) => void;
}) {
  const latest = vendor.benchmarks[0] ?? null;
  const classification = latest?.classification ?? "BENCHMARKING";
  const days = daysUntil(vendor.contractEndDate);
  const annualSavings = estimateAnnualSavings(vendor.monthlyAmount, latest?.marketRateTypical ?? null);
  const overpayPct = latest?.marketRateTypical
    ? Math.round(((vendor.monthlyAmount - latest.marketRateTypical) / latest.marketRateTypical) * 100)
    : 0;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md ${
      classification === "OVERPRICED" ? "border-red-200" :
      classification === "ELEVATED" ? "border-yellow-200" :
      classification === "FAIR" ? "border-green-200" : "border-gray-200"
    }`}>
      {/* Color top bar */}
      <div className={`h-1 w-full ${
        classification === "OVERPRICED" ? "bg-red-400" :
        classification === "ELEVATED" ? "bg-yellow-400" :
        classification === "FAIR" ? "bg-green-400" :
        classification === "BENCHMARKING" ? "bg-blue-300 animate-pulse" : "bg-gray-200"
      }`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-2">
            <h3 className="font-bold text-gray-900 text-base truncate">{vendor.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{catLabel(vendor.category)}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getClassificationColor(classification)}`}>
              {getClassificationLabel(classification)}
            </span>
            <button onClick={() => onEdit(vendor)} title="Edit vendor" className="text-gray-300 hover:text-gray-500 p-1 rounded transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>

        {/* THE MONEY — most prominent element */}
        {annualSavings > 0 ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4 text-center">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">You could save</p>
            <p className="text-3xl font-bold text-red-700">{formatCurrency(annualSavings)}</p>
            <p className="text-xs text-red-500 mt-0.5">per year — {overpayPct}% above market</p>
          </div>
        ) : classification === "FAIR" ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-4 text-center">
            <p className="text-2xl font-bold text-green-700">✓ Fair price</p>
            <p className="text-xs text-green-600 mt-0.5">Within market range</p>
          </div>
        ) : classification === "BENCHMARKING" ? (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm font-medium text-blue-700 animate-pulse">Researching market rates…</p>
            <p className="text-xs text-blue-400 mt-1">Usually takes a few minutes</p>
          </div>
        ) : null}

        {/* Rate comparison */}
        <div className="space-y-1.5 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">You pay</span>
            <span className="font-semibold text-gray-900">{formatCurrency(vendor.monthlyAmount)}/mo</span>
          </div>
          {latest?.marketRateTypical && (
            <div className="flex justify-between">
              <span className="text-gray-500">Market rate</span>
              <span className="text-gray-700">{formatCurrency(latest.marketRateTypical)}/mo</span>
            </div>
          )}
          {latest?.marketRateLow && latest?.marketRateHigh && (
            <div className="flex justify-between">
              <span className="text-gray-500">Market range</span>
              <span className="text-gray-500 text-xs">{formatCurrency(latest.marketRateLow)}–{formatCurrency(latest.marketRateHigh)}</span>
            </div>
          )}
        </div>

        {/* Contract warning */}
        {vendor.contractEndDate && days !== null && days <= 60 && (
          <div className={`text-xs px-3 py-2 rounded-lg mb-3 flex items-center gap-2 ${
            days <= 14 ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-700"
          }`}>
            <span>⚠</span>
            <span>Contract ends in <strong>{days} days</strong> — negotiate now</span>
          </div>
        )}

        {/* Sources */}
        {latest?.sourcesSummary && (
          <p className="text-xs text-gray-400 mb-4 leading-relaxed line-clamp-2 italic">
            {latest.sourcesSummary}
          </p>
        )}

        {/* Action */}
        {(classification === "OVERPRICED" || classification === "ELEVATED") && (
          <button
            onClick={() => onDraftEmail(vendor)}
            className="w-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-sm"
          >
            ✉ Draft negotiation email
          </button>
        )}
        {classification === "FAIR" && (
          <p className="text-center text-xs text-green-600 py-2 font-medium">This vendor is priced fairly — no action needed.</p>
        )}
        {classification === "UNKNOWN" && (
          <p className="text-center text-xs text-gray-400 py-2">Insufficient public data for this vendor</p>
        )}
        {/* Re-benchmark link */}
        {classification !== "BENCHMARKING" && (
          <button
            onClick={() => onMarkWon(vendor)}
            className="w-full mt-2 text-xs text-gray-400 hover:text-amber-600 py-1 transition-colors"
          >
            ↻ Re-run benchmark
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Add vendor modal ──────────────────────────────────────── */

function AddVendorModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", category: "", monthlyAmount: "", contactEmail: "", contactName: "", contractEndDate: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.category || !form.monthlyAmount) { setError("Name, category, and amount are required."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, category: form.category,
          monthlyAmount: parseFloat(form.monthlyAmount),
          contactEmail: form.contactEmail || null,
          contactName: form.contactName || null,
          contractEndDate: form.contractEndDate || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onAdded(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add vendor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="space-y-3">
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Vendor name (e.g. Sysco)" className="input" />
          <select value={form.category} onChange={e => set("category", e.target.value)} className="input bg-white">
            <option value="">Category…</option>
            {VENDOR_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
            <input type="number" value={form.monthlyAmount} onChange={e => set("monthlyAmount", e.target.value)} placeholder="Monthly amount" className="input pl-7" />
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">VENDOR CONTACT (optional — enables 1-click send)</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.contactName} onChange={e => set("contactName", e.target.value)} placeholder="Contact name" className="input text-sm" />
              <input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} placeholder="Contact email" className="input text-sm" />
            </div>
          </div>
          <input type="date" value={form.contractEndDate} onChange={e => set("contractEndDate", e.target.value)} className="input text-gray-600" />
          <input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Notes (optional)" className="input" />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
            {loading ? "Adding…" : "Add & benchmark →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Negotiation modal ─────────────────────────────────────── */

function NegotiationModal({ draft, vendor, onClose, onUpdate }: {
  draft: NegotiationDraft;
  vendor: Vendor | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [body, setBody] = useState(draft.emailBody);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [wonAmount, setWonAmount] = useState("");
  const [showWonForm, setShowWonForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sentDirect, setSentDirect] = useState(false);

  const patch = async (data: object) => {
    await fetch(`/api/negotiations/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  };

  const markSent = async () => {
    setSaving(true);
    await patch({ emailBody: body, status: "SENT", sentAt: new Date().toISOString() });
    setSaving(false); onUpdate(); onClose();
  };

  const sendDirect = async () => {
    if (!vendor?.contactEmail) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/negotiations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, emailBody: body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Send failed" }));
        setSendError(err.error ?? "Send failed");
        return;
      }
      setSentDirect(true); onUpdate();
    } catch {
      setSendError("Network error — check your connection and try again.");
    } finally { setSending(false); }
  };

  const markWon = async () => {
    const newMonthly = wonAmount ? parseFloat(wonAmount) : null;
    // savedAmount = monthly savings = old rate − new rate
    const savedAmount = (newMonthly !== null && vendor?.monthlyAmount)
      ? Math.max(0, vendor.monthlyAmount - newMonthly)
      : null;
    await patch({ status: "WON", outcome: "Price reduction secured", savedAmount });
    onUpdate(); onClose();
  };

  const copy = () => { navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Negotiation email — {draft.vendor.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Edit, then send. Professional and non-confrontational.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {sentDirect && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
              <p className="font-bold text-green-800">✓ Email sent to {vendor?.contactEmail}</p>
              <p className="text-sm text-green-600 mt-1">When they respond with a lower price, mark it as won below.</p>
            </div>
          )}
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={13}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          {vendor?.contactEmail && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              <span className="text-green-600">●</span>
              Will send to: <strong className="text-gray-700">{vendor.contactName ? `${vendor.contactName} <${vendor.contactEmail}>` : vendor.contactEmail}</strong>
            </div>
          )}
          {sendError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              ⚠ {sendError}
            </div>
          )}
          {showWonForm && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-sm font-bold text-green-800 mb-1">🎉 Record your win</p>
              {vendor?.monthlyAmount && (
                <p className="text-xs text-green-700 mb-2">Old rate: {formatCurrency(vendor.monthlyAmount)}/mo — enter what you&apos;re paying now</p>
              )}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                  <input type="number" value={wonAmount} onChange={e => setWonAmount(e.target.value)} placeholder="New monthly amount" className="input pl-7" />
                </div>
                <button onClick={markWon} className="bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">Save win</button>
              </div>
              {wonAmount && vendor?.monthlyAmount && (
                <p className="text-xs text-green-700 mt-2 font-medium">
                  Monthly savings: {formatCurrency(Math.max(0, vendor.monthlyAmount - parseFloat(wonAmount || "0")))}/mo
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 p-6 border-t border-gray-100">
          <button onClick={copy} className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            {copied ? "✓ Copied!" : "Copy"}
          </button>
          {vendor?.contactEmail ? (
            <button onClick={sendDirect} disabled={sending || sentDirect} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
              {sending ? "Sending…" : sentDirect ? "✓ Sent!" : `Send to ${vendor.contactEmail} →`}
            </button>
          ) : (
            <button onClick={markSent} disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              {saving ? "Saving…" : "Mark as sent"}
            </button>
          )}
          <button onClick={() => setShowWonForm(!showWonForm)} className="border-2 border-green-400 text-green-700 text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-green-50 transition-colors">
            🎉 I got a lower price
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats card ────────────────────────────────────────────── */

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? "bg-amber-600 border-amber-600 text-white" : "bg-white border-gray-200"}`}>
      <div className={`text-2xl font-bold ${accent ? "text-white" : "text-gray-900"}`}>{value}</div>
      <div className={`text-xs font-medium mt-0.5 ${accent ? "text-amber-100" : "text-gray-500"}`}>{label}</div>
      {sub && <div className={`text-xs mt-1 ${accent ? "text-amber-200" : "text-gray-400"}`}>{sub}</div>}
    </div>
  );
}

/* ─── CSV Import ────────────────────────────────────────────── */

function CSVImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; amount: number; category: string }[]>([]);
  const [error, setError] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/csv", { method: "POST", body: form });
      const data = await res.json();
      setResult(data.vendors ?? []);
    } catch { setError("Failed to parse file."); } finally { setLoading(false); }
  };

  const importAll = async () => {
    setLoading(true);
    for (const v of result) {
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v.name, category: v.category || "OTHER", monthlyAmount: v.amount }),
      });
    }
    setLoading(false); onImported(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Import from bank statement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <p className="text-sm text-gray-500 mb-5">Export a CSV from your bank or QuickBooks and we&apos;ll detect your recurring vendor payments automatically.</p>
        {!result.length ? (
          <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center cursor-pointer hover:border-amber-400 transition-colors">
            <span className="text-4xl mb-3">📊</span>
            <span className="text-sm font-medium text-gray-700">Upload CSV file</span>
            <span className="text-xs text-gray-400 mt-1">Bank export, QuickBooks, or any transaction CSV (.csv)</span>
            <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={handleFile} disabled={loading} />
            {loading && <span className="text-sm text-amber-600 mt-3 animate-pulse">Analyzing transactions…</span>}
          </label>
        ) : (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-3">Found {result.length} recurring vendor{result.length !== 1 ? "s" : ""}:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.map((v, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                  <span className="font-medium text-gray-900">{v.name}</span>
                  <span className="text-amber-700 font-semibold">{formatCurrency(v.amount)}/mo</span>
                </div>
              ))}
            </div>
            <button onClick={importAll} disabled={loading} className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              {loading ? "Importing…" : `Import all ${result.length} vendors & start benchmarking →`}
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

/* ─── Main dashboard ────────────────────────────────────────── */

export default function DashboardPage() {
  const { isLoaded } = useAuth();
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams?.get("checkout") === "success";
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckoutBanner, setShowCheckoutBanner] = useState(checkoutSuccess);
  const [activeTab, setActiveTab] = useState<"vendors" | "negotiations">("vendors");
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [draftingFor, setDraftingFor] = useState<string | null>(null);
  const [activeDraft, setActiveDraft] = useState<NegotiationDraft | null>(null);
  const [activeDraftVendor, setActiveDraftVendor] = useState<Vendor | null>(null);

  const fetchOrg = useCallback(async () => {
    const res = await fetch("/api/onboarding");
    if (res.ok) setOrg(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { if (isLoaded) fetchOrg(); }, [isLoaded, fetchOrg]);

  // Auto-refresh every 20s while any vendor is still benchmarking
  useEffect(() => {
    const hasBenchmarking = org?.vendors.some(
      (v) => v.benchmarks[0]?.classification === "BENCHMARKING" || v.benchmarks.length === 0
    );
    if (!hasBenchmarking) return;
    const t = setInterval(fetchOrg, 20000);
    return () => clearInterval(t);
  }, [org, fetchOrg]);

  const handleDraftEmail = async (vendor: Vendor) => {
    setDraftingFor(vendor.id);
    try {
      const res = await fetch("/api/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });
      if (!res.ok) {
        console.error("Failed to create negotiation draft:", await res.text());
        return;
      }
      const draft = await res.json();
      await fetchOrg();
      setActiveDraft({ ...draft, vendor: { name: vendor.name } });
      setActiveDraftVendor(vendor);
    } catch (err) {
      console.error("Draft email error:", err);
    } finally { setDraftingFor(null); }
  };

  const handleRebenchmark = async (vendor: Vendor) => {
    await fetch(`/api/vendors/${vendor.id}/benchmark`, { method: "POST" });
    fetchOrg();
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading your data…</p>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Finish setup first</h2>
          <p className="text-gray-500 mb-6">Add your vendors and Oryn will find where you&apos;re overpaying.</p>
          <Link href="/onboarding" className="bg-amber-600 text-white px-8 py-3 rounded-xl font-bold inline-block">
            Set up Oryn →
          </Link>
        </div>
      </div>
    );
  }

  /* Derived stats */
  const benchmarkedVendors = org.vendors.filter((v) => v.benchmarks[0]?.classification && v.benchmarks[0].classification !== "BENCHMARKING");
  const overpricedVendors = org.vendors.filter((v) => ["OVERPRICED", "ELEVATED"].includes(v.benchmarks[0]?.classification ?? ""));
  const totalMonthlyOverpay = overpricedVendors.reduce((sum, v) => {
    return sum + Math.max(0, v.monthlyAmount - (v.benchmarks[0]?.marketRateTypical ?? v.monthlyAmount));
  }, 0);
  const totalAnnualSavings = totalMonthlyOverpay * 12;
  const topVendor = [...overpricedVendors].sort((a, b) =>
    estimateAnnualSavings(b.monthlyAmount, b.benchmarks[0]?.marketRateTypical ?? null) -
    estimateAnnualSavings(a.monthlyAmount, a.benchmarks[0]?.marketRateTypical ?? null)
  )[0] ?? null;
  const wonNegotiations = org.negotiationDrafts.filter((d) => d.status === "WON");
  const totalRealizedMonthly = wonNegotiations.reduce((s, d) => s + (d.savedAmount ?? 0), 0);
  const trialDays = daysUntil(org.trialEndsAt);
  const showTrialBanner = org.status === "TRIAL" && trialDays !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topnav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-black text-gray-900 text-lg tracking-tight">Oryn</Link>
            <div className="hidden sm:flex gap-1">
              {(["vendors", "negotiations"] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                  {tab}
                  {tab === "negotiations" && org.negotiationDrafts.length > 0 && (
                    <span className="ml-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{org.negotiationDrafts.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCSVImport(true)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hidden sm:block">
              Import CSV
            </button>
            <button onClick={() => setShowAddVendor(true)} className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors">
              + Add vendor
            </button>
            <Link href="/dashboard/billing" className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hidden sm:block">
              {org.plan}
            </Link>
          </div>
        </div>
      </nav>

      {/* Checkout success banner */}
      {showCheckoutBanner && (
        <div className="bg-green-600 text-white text-sm text-center py-3 px-4 flex items-center justify-center gap-3">
          <span>🎉 You&apos;re subscribed! Your plan is now active.</span>
          <button onClick={() => setShowCheckoutBanner(false)} className="text-green-200 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {/* Trial banner — always visible during trial */}
      {showTrialBanner && (
        <div className={`text-sm text-center py-2.5 px-4 ${trialDays !== null && trialDays <= 3 ? "bg-red-600 text-white" : "bg-amber-50 border-b border-amber-200 text-amber-900"}`}>
          {trialDays !== null && trialDays <= 0
            ? <>Trial expired. <Link href="/dashboard/billing" className="underline font-bold">Add a card to keep your data →</Link></>
            : trialDays !== null && trialDays <= 3
            ? <>⚠ Trial ends in <strong>{trialDays} day{trialDays !== 1 ? "s" : ""}</strong>.{totalAnnualSavings > 0 && <> You&apos;ve found <strong>{formatCurrency(totalAnnualSavings)}/yr</strong> in savings.</>}{" "}<Link href="/dashboard/billing" className="underline font-bold">Start your plan now →</Link></>
            : <>{totalAnnualSavings > 0 ? <><strong>{formatCurrency(totalAnnualSavings)}/yr</strong> in savings identified so far in your trial.</> : <>Your free trial is running. Add your vendors to find where you&apos;re overpaying.</>} <Link href="/dashboard/billing" className="underline font-semibold">{trialDays} days left — see plans →</Link></>
          }
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* The big opportunity — only show if there's money on the table */}
        {activeTab === "vendors" && totalAnnualSavings > 0 && (
          <OpportunityBanner
            topVendor={topVendor}
            totalMonthlyOverpay={totalMonthlyOverpay}
            onAction={handleDraftEmail}
          />
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Potential annual savings" value={formatCurrency(totalAnnualSavings)} sub={`${overpricedVendors.length} vendors overpriced`} accent={totalAnnualSavings > 0} />
          <StatCard label="Vendors tracked" value={org.vendors.length} sub={`${benchmarkedVendors.length} benchmarked`} />
          <StatCard label="Negotiations won" value={wonNegotiations.length} sub={wonNegotiations.length > 0 ? `${formatCurrency(totalRealizedMonthly)}/mo saved` : "Send your first email"} />
          <StatCard label="Monthly savings locked in" value={formatCurrency(totalRealizedMonthly)} sub={`${formatCurrency(totalRealizedMonthly * 12)}/yr annualized`} />
        </div>

        {/* Optimization progress */}
        {activeTab === "vendors" && <OptimizationProgress vendors={org.vendors} />}

        {/* Vendors tab */}
        {activeTab === "vendors" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">
                {overpricedVendors.length > 0
                  ? `${overpricedVendors.length} vendor${overpricedVendors.length !== 1 ? "s" : ""} need your attention`
                  : "Your vendors"}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setShowCSVImport(true)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 sm:hidden">CSV</button>
              </div>
            </div>

            {org.vendors.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-16 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No vendors yet</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Add your first vendor and Oryn will research whether you&apos;re paying a fair price.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => setShowAddVendor(true)} className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold">Add vendor manually</button>
                  <button onClick={() => setShowCSVImport(true)} className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium">Import from bank statement</button>
                </div>
              </div>
            ) : (
              /* Sort: overpriced first, then elevated, then benchmarking, then fair */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...org.vendors]
                  .sort((a, b) => {
                    const order: Record<string, number> = { OVERPRICED: 0, ELEVATED: 1, BENCHMARKING: 2, UNKNOWN: 3, FAIR: 4 };
                    return (order[a.benchmarks[0]?.classification ?? "UNKNOWN"] ?? 3) - (order[b.benchmarks[0]?.classification ?? "UNKNOWN"] ?? 3);
                  })
                  .map((v) => (
                    <VendorCard
                      key={v.id}
                      vendor={v}
                      onDraftEmail={handleDraftEmail}
                      onMarkWon={handleRebenchmark}
                      onEdit={setEditingVendor}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Negotiations tab */}
        {activeTab === "negotiations" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Negotiation history</h2>
              {org.negotiationDrafts.length > 0 && (
                <p className="text-xs text-gray-400">{wonNegotiations.length} won · {formatCurrency(totalRealizedMonthly * 12)}/yr locked in</p>
              )}
            </div>
            {org.negotiationDrafts.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl py-16 text-center px-6">
                <div className="text-5xl mb-4">✉️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No negotiations yet</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  Go to Vendors, find an overpriced vendor, and click &ldquo;Draft negotiation email&rdquo;. We&apos;ll write it for you in seconds.
                </p>
                <button
                  onClick={() => setActiveTab("vendors")}
                  className="bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold"
                >
                  View overpriced vendors →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {["Vendor", "Status", "Sent", "Monthly saved", ""].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {org.negotiationDrafts.map((d) => {
                      const v = org.vendors.find((vv) => vv.id === d.vendorId) ?? null;
                      return (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <span className="font-semibold text-gray-900">{d.vendor.name}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              d.status === "WON" ? "bg-green-100 text-green-800" :
                              d.status === "SENT" ? "bg-blue-100 text-blue-800" :
                              d.status === "NO_RESPONSE" ? "bg-gray-100 text-gray-600" :
                              "bg-yellow-100 text-yellow-800"
                            }`}>{d.status.replace("_", " ")}</span>
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{d.sentAt ? formatDate(d.sentAt) : "—"}</td>
                          <td className="px-5 py-3 font-semibold text-green-700">{d.savedAmount ? formatCurrency(d.savedAmount) + "/mo" : "—"}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {d.status === "SENT" && (
                                <button
                                  onClick={() => { setActiveDraft({ ...d, vendor: { name: d.vendor.name } }); setActiveDraftVendor(v); }}
                                  className="text-xs text-green-600 hover:text-green-700 font-bold border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-50"
                                >
                                  🎉 Got a lower price
                                </button>
                              )}
                              <button
                                onClick={() => { setActiveDraft({ ...d, vendor: { name: d.vendor.name } }); setActiveDraftVendor(v); }}
                                className="text-amber-600 hover:text-amber-700 font-semibold text-xs"
                              >View →</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drafting overlay */}
      {draftingFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm">
            <div className="text-5xl mb-4 animate-bounce">✍️</div>
            <p className="font-bold text-gray-900 text-lg">Writing your negotiation email…</p>
            <p className="text-sm text-gray-400 mt-2">Claude is researching the vendor and crafting a professional email</p>
          </div>
        </div>
      )}

      {showAddVendor && <AddVendorModal onClose={() => setShowAddVendor(false)} onAdded={fetchOrg} />}
      {showCSVImport && <CSVImportModal onClose={() => setShowCSVImport(false)} onImported={fetchOrg} />}
      {editingVendor && <EditVendorModal vendor={editingVendor} onClose={() => setEditingVendor(null)} onSaved={fetchOrg} />}
      {activeDraft && (
        <NegotiationModal
          draft={activeDraft}
          vendor={activeDraftVendor}
          onClose={() => { setActiveDraft(null); setActiveDraftVendor(null); }}
          onUpdate={fetchOrg}
        />
      )}

    </div>
  );
}
