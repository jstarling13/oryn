import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AdminTriggerButton } from "./AdminTriggerButton";

async function getAdminData() {
  const orgs = await prisma.organization.findMany({
    include: {
      vendors: {
        include: { benchmarks: { orderBy: { benchmarkedAt: "desc" }, take: 1 } },
      },
      negotiationDrafts: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const activeOrgs = orgs.filter((o) => o.status === "ACTIVE");
  const mrr = activeOrgs.reduce((sum, o) => {
    return sum + (o.plan === "PRO" ? 199 : 99);
  }, 0);

  return { orgs, mrr };
}

export default async function AdminPage() {
  // Server-side admin guard — doesn't rely on JWT template having email
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(email)) redirect("/dashboard");

  const { orgs, mrr } = await getAdminData();

  const totalSavingsRealized = orgs.reduce((sum, o) => {
    return (
      sum +
      o.negotiationDrafts
        .filter((d) => d.status === "WON")
        .reduce((s, d) => s + (d.savedAmount ?? 0), 0)
    );
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 h-14 flex items-center px-6">
        <span className="font-bold text-gray-900">Oryn Admin</span>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "MRR", value: formatCurrency(mrr) },
            { label: "Total orgs", value: orgs.length },
            { label: "Active orgs", value: activeOrgs(orgs) },
            { label: "Savings realized (monthly)", value: formatCurrency(totalSavingsRealized) },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Orgs table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">All organizations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    "Org",
                    "Plan",
                    "Status",
                    "Vendors",
                    "Benchmarks",
                    "Negotiations",
                    "Savings reported",
                    "Last benchmark",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgs.map((org) => {
                  const totalBenchmarks = org.vendors.reduce(
                    (s, v) => s + v.benchmarks.length,
                    0
                  );
                  const lastBenchmark = org.vendors
                    .flatMap((v) => v.benchmarks)
                    .sort(
                      (a, b) =>
                        new Date(b.benchmarkedAt).getTime() -
                        new Date(a.benchmarkedAt).getTime()
                    )[0];
                  const savingsRealized = org.negotiationDrafts
                    .filter((d) => d.status === "WON")
                    .reduce((s, d) => s + (d.savedAmount ?? 0), 0);

                  return (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{org.name}</div>
                        <div className="text-xs text-gray-400">{org.city}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            org.plan === "PRO"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            org.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : org.status === "TRIAL"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{org.vendors.length}</td>
                      <td className="px-4 py-3 text-gray-700">{totalBenchmarks}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {org.negotiationDrafts.length}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {savingsRealized
                          ? formatCurrency(savingsRealized) + "/mo"
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {lastBenchmark
                          ? formatDate(lastBenchmark.benchmarkedAt)
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <AdminTriggerButton orgId={org.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function activeOrgs(orgs: { status: string }[]) {
  return orgs.filter((o) => o.status === "ACTIVE" || o.status === "TRIAL").length;
}

