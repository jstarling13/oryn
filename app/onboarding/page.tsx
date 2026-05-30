"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { VENDOR_CATEGORIES, BUSINESS_TYPES, MONTHLY_REVENUE_RANGES } from "@/lib/utils";

interface VendorInput {
  id: string;
  name: string;
  category: string;
  monthlyAmount: string;
  contractEndDate: string;
  notes: string;
  contactEmail: string;
  contactName: string;
}

function makeVendor(): VendorInput {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    category: "",
    monthlyAmount: "",
    contractEndDate: "",
    notes: "",
    contactEmail: "",
    contactName: "",
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [businessName, setBusinessName] = useState(
    user?.fullName ?? user?.firstName ?? ""
  );
  const [businessType, setBusinessType] = useState("");
  const [city, setCity] = useState("");
  const [monthlyRevenue, setMonthlyRevenue] = useState("");

  // Step 2
  const [vendors, setVendors] = useState<VendorInput[]>([makeVendor()]);

  // Step 3 — upload
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  const addVendor = () => {
    if (vendors.length < 10) setVendors([...vendors, makeVendor()]);
  };

  const removeVendor = (id: string) =>
    setVendors(vendors.filter((v) => v.id !== id));

  const updateVendor = (id: string, field: keyof VendorInput, value: string) =>
    setVendors(vendors.map((v) => (v.id === id ? { ...v, [field]: value } : v)));

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).slice(0, 5);
      if (!files.length) return;
      setUploading(true);
      setUploadMsg("");
      try {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const data = await res.json();
        if (data.vendors?.length) {
          const extracted: VendorInput[] = data.vendors.map(
            (v: { name: string; category: string; amount: number }) => ({
              id: Math.random().toString(36).slice(2),
              name: v.name ?? "",
              category: v.category ?? "",
              monthlyAmount: v.amount ? String(v.amount) : "",
              contractEndDate: "",
              notes: "Extracted from invoice",
            })
          );
          setVendors((prev) => {
            const blank = prev.filter((v) => !v.name);
            const filled = prev.filter((v) => v.name);
            return [...filled, ...extracted, ...blank].slice(0, 10);
          });
          setUploadMsg(
            `Found ${extracted.length} vendor${extracted.length !== 1 ? "s" : ""} in your invoices.`
          );
        } else {
          setUploadMsg("No vendors found — please add them manually below.");
        }
      } catch {
        setUploadMsg("Upload failed. Please add vendors manually.");
      } finally {
        setUploading(false);
      }
    },
    []
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const validVendors = vendors.filter((v) => v.name && v.category && v.monthlyAmount);
    if (!validVendors.length) {
      setError("Add at least one vendor to continue.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          businessType,
          city,
          monthlyRevenue,
          vendors: validVendors.map((v) => ({
            name: v.name,
            category: v.category,
            monthlyAmount: parseFloat(v.monthlyAmount),
            contractEndDate: v.contractEndDate || null,
            notes: v.notes || null,
            contactEmail: v.contactEmail || null,
            contactName: v.contactName || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 h-14 flex items-center px-6">
        <span className="font-bold text-gray-900">Oryn</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`h-0.5 w-12 transition-colors ${
                    step > s ? "bg-amber-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Business Info */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Tell us about your business
            </h1>
            <p className="text-gray-500 mb-8">
              This helps us calibrate benchmarks for your industry and region.
            </p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Joe's Diner"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Business type
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">Select type…</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Approximate monthly revenue
                </label>
                <select
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">Select range…</option>
                  {MONTHLY_REVENUE_RANGES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                if (!businessName || !businessType || !city || !monthlyRevenue) {
                  setError("Please fill in all fields.");
                  return;
                }
                setError("");
                setStep(2);
              }}
              className="mt-8 w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Continue →
            </button>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Step 2 — Add Vendors */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Add your vendors
            </h1>
            <p className="text-gray-500 mb-8">
              Add 3–10 vendors. You can add more from your dashboard anytime.
            </p>
            <div className="space-y-4">
              {vendors.map((vendor, idx) => (
                <div
                  key={vendor.id}
                  className="bg-white border border-gray-200 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-500">
                      Vendor {idx + 1}
                    </span>
                    {vendors.length > 1 && (
                      <button
                        onClick={() => removeVendor(vendor.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={vendor.name}
                        onChange={(e) => updateVendor(vendor.id, "name", e.target.value)}
                        placeholder="Vendor name (e.g. Sysco)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <select
                        value={vendor.category}
                        onChange={(e) =>
                          updateVendor(vendor.id, "category", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      >
                        <option value="">Category…</option>
                        {VENDOR_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          value={vendor.monthlyAmount}
                          onChange={(e) =>
                            updateVendor(vendor.id, "monthlyAmount", e.target.value)
                          }
                          placeholder="Monthly amount"
                          className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div>
                      <input
                        type="date"
                        value={vendor.contractEndDate}
                        onChange={(e) =>
                          updateVendor(vendor.id, "contractEndDate", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={vendor.notes}
                        onChange={(e) =>
                          updateVendor(vendor.id, "notes", e.target.value)
                        }
                        placeholder="Notes (optional)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        value={vendor.contactEmail}
                        onChange={(e) =>
                          updateVendor(vendor.id, "contactEmail", e.target.value)
                        }
                        placeholder="Vendor email (for direct send)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={vendor.contactName}
                        onChange={(e) =>
                          updateVendor(vendor.id, "contactName", e.target.value)
                        }
                        placeholder="Contact name (optional)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {vendors.length < 10 && (
                <button
                  onClick={addVendor}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                  + Add another vendor
                </button>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => {
                  const valid = vendors.filter(
                    (v) => v.name && v.category && v.monthlyAmount
                  );
                  if (!valid.length) {
                    setError("Add at least one complete vendor.");
                    return;
                  }
                  setError("");
                  setStep(3);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Continue →
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Step 3 — Upload invoices */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Have invoices? Upload them.
            </h1>
            <p className="text-gray-500 mb-8">
              Upload up to 5 PDF invoices and we&apos;ll extract vendor names and
              amounts automatically.
            </p>
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-amber-400 transition-colors">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-gray-600 mb-4">
                Drag & drop PDFs here, or click to select
              </p>
              <label className="cursor-pointer bg-amber-50 border border-amber-200 text-amber-700 font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-amber-100 transition-colors">
                {uploading ? "Uploading…" : "Choose PDFs"}
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              {uploadMsg && (
                <p className="mt-4 text-sm text-amber-700 font-medium">{uploadMsg}</p>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              This step is optional — you can skip it and add vendors manually.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {loading ? "Setting up…" : "Confirm & start benchmarking →"}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {/* Step 4 — Confirmation */}
        {step === 4 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              🎯
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              You&apos;re all set!
            </h1>
            <p className="text-gray-600 mb-2">
              We&apos;ve started benchmarking your vendors.
            </p>
            <p className="text-gray-500 text-sm mb-10">
              We&apos;ll have your first benchmark report ready within 24 hours and
              send you an email when it&apos;s done.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              Go to dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
