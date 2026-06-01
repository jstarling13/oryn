"use client";

export function AdminTriggerButton({ orgId }: { orgId: string }) {
  async function trigger() {
    await fetch("/api/admin/benchmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    alert("Benchmarks triggered for org.");
  }

  return (
    <button
      type="button"
      onClick={trigger}
      className="text-xs text-amber-600 hover:text-amber-700 font-medium border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors"
    >
      Re-run benchmarks
    </button>
  );
}
