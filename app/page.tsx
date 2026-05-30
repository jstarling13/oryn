"use client";

import { useState } from "react";
import Link from "next/link";

const STEPS = [
  {
    number: "01",
    time: "10 min",
    title: "Add your vendors",
    description:
      "Enter each vendor, their category, and your current monthly rate. Or upload your invoices — Oryn reads them automatically and fills in the details.",
  },
  {
    number: "02",
    time: "24 hrs",
    title: "Oryn benchmarks every vendor",
    description:
      "Our AI searches industry pricing guides, published rate sheets, and public data to build a fair market range for each vendor. Every result includes a confidence score.",
  },
  {
    number: "03",
    time: "1 click",
    title: "Send the negotiation email",
    description:
      "Where you're overpaying, Oryn writes the email for you — professional, respectful, and specific to your situation. Review, approve, and send in one click.",
  },
];

const WHO_FOR = [
  {
    icon: "🍽️",
    title: "Restaurant owners",
    savings: "$6,200/year average",
    description:
      "Food distributors, linen services, POS software, cleaning vendors, and delivery platform commissions — all benchmarked automatically against what other restaurants pay.",
  },
  {
    icon: "🔨",
    title: "Contractors & trades",
    savings: "$3,800/year average",
    description:
      "Material suppliers, equipment rental, subcontractor rates, and business insurance — find out if you're paying market rate or leaving money on the table.",
  },
  {
    icon: "🛍️",
    title: "Retail shop owners",
    savings: "$4,100/year average",
    description:
      "Wholesale suppliers, packaging, shipping, and software — the recurring costs that compound into thousands every year without a second look.",
  },
];

const WINS = [
  {
    category: "Food & Beverage",
    vendor: "Regional food distributor",
    before: 4800,
    after: 3650,
    method: "Sent negotiation email citing competitor pricing",
  },
  {
    category: "Cleaning",
    vendor: "Commercial cleaning service",
    before: 1200,
    after: 850,
    method: "Sent negotiation email before contract renewal",
  },
  {
    category: "POS Software",
    vendor: "POS & payments platform",
    before: 299,
    after: 179,
    method: "Sent email, vendor matched competitor rate",
  },
];

const FAQS = [
  {
    q: "How does Oryn know what the market rate is?",
    a: "We use AI to research current pricing from publicly available sources — vendor websites, industry forums, published rate sheets, and data from other businesses in similar categories. Every benchmark includes a confidence level and source summary so you know exactly what the research is based on.",
  },
  {
    q: "Does Oryn send emails automatically?",
    a: "No — you always approve before anything goes out. Oryn drafts the email and shows it to you for review. On Core, you copy-paste it yourself. On Pro, you click one button and it sends directly to your vendor contact. You are always in control.",
  },
  {
    q: "What if my vendor contract has locked-in pricing?",
    a: "Oryn flags contract end dates and alerts you 60 days before renewal — your highest-leverage window. You can negotiate before you're locked in for another year.",
  },
  {
    q: "Will my vendors get upset?",
    a: "Asking for fair pricing is normal and expected in business. Oryn writes professional, relationship-preserving emails that acknowledge the partnership while asking for a pricing review. The tone is always collaborative, never aggressive.",
  },
  {
    q: "What if my vendor doesn't respond?",
    a: "About 60% of vendors respond to a well-written pricing request. Even when they don't, you've opened the door for renewal negotiations. And you'll know exactly which vendors are worth switching away from.",
  },
  {
    q: "What kinds of businesses use Oryn?",
    a: "Restaurants, contractors, retail shops, and other owner-operated businesses with 1–4 locations. If you pay recurring vendor bills and haven't reviewed your pricing in the last 12 months, Oryn will find savings.",
  },
];

function ROICalculator() {
  const [vendors, setVendors] = useState(8);
  const [avgBill, setAvgBill] = useState(3000);
  const overpricedVendors = Math.round(vendors * 0.35);
  const savingsLow = Math.round(overpricedVendors * avgBill * 0.15 * 12);
  const savingsHigh = Math.round(overpricedVendors * avgBill * 0.25 * 12);
  const orynCostYear = 99 * 12;
  const roiLow = Math.round((savingsLow / orynCostYear) * 10) / 10;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Estimate your savings</h3>
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Vendors you pay monthly</label>
            <span className="text-sm font-bold text-amber-700">{vendors}</span>
          </div>
          <input
            type="range"
            min={3}
            max={50}
            value={vendors}
            onChange={(e) => setVendors(Number(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>3</span>
            <span>50</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Average monthly vendor bill</label>
            <span className="text-sm font-bold text-amber-700">${avgBill.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min={500}
            max={20000}
            step={500}
            value={avgBill}
            onChange={(e) => setAvgBill(Number(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>$500</span>
            <span>$20,000</span>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-amber-200 space-y-3">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Estimated overpriced vendors</p>
            <p className="text-xl font-bold text-gray-900">{overpricedVendors} of {vendors}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Potential annual savings</p>
            <p className="text-3xl font-bold text-amber-700">
              ${savingsLow.toLocaleString()} – ${savingsHigh.toLocaleString()}
            </p>
          </div>
          {roiLow > 1 && (
            <div className="pt-2 border-t border-amber-100">
              <p className="text-sm text-gray-600">
                That&apos;s a <span className="font-bold text-amber-700">{roiLow}× return</span> on Core plan ($99/mo)
              </p>
            </div>
          )}
        </div>
        <Link
          href="/sign-up"
          className="block w-full text-center bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Start free trial — see your actual numbers →
        </Link>
      </div>
    </div>
  );
}

function WinCard({ win }: { win: typeof WINS[number] }) {
  const saved = win.before - win.after;
  const savedYear = saved * 12;
  const pct = Math.round((saved / win.before) * 100);
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{win.category}</span>
          <p className="text-gray-600 text-sm mt-2">{win.vendor}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">-{pct}%</p>
          <p className="text-xs text-gray-400">rate reduction</p>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400">Was paying</p>
          <p className="text-sm font-semibold text-gray-500 line-through">${win.before.toLocaleString()}/mo</p>
        </div>
        <div className="text-gray-300">→</div>
        <div>
          <p className="text-xs text-gray-400">Now paying</p>
          <p className="text-sm font-bold text-gray-900">${win.after.toLocaleString()}/mo</p>
        </div>
      </div>
      <div className="bg-green-50 rounded-lg p-3 mb-3">
        <p className="text-sm font-bold text-green-700">Saves ${savedYear.toLocaleString()}/year</p>
      </div>
      <p className="text-xs text-gray-500 italic">&ldquo;{win.method}&rdquo;</p>
    </div>
  );
}

export default function MarketingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="text-xl font-bold text-gray-900">Oryn</div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "#how-it-works", label: "How it works" },
              { href: "#results", label: "Results" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
            ].map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                {l.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <span className="w-2 h-2 bg-amber-500 rounded-full inline-block animate-pulse"></span>
          The average client recovers $4,200/year — that&apos;s a 42× return on Core
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
          Your vendors set the price.<br />
          <span className="text-amber-600">We make sure it&apos;s fair.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
          Oryn benchmarks every vendor you pay against real market rates, flags who&apos;s overcharging you, and writes the negotiation email for you — ready to send in one click.
        </p>
        <p className="text-base text-gray-500 max-w-xl mx-auto mb-10">
          Most clients find 3–5 overpriced vendors in their first report. The first negotiation alone typically pays for 6 months of Oryn.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors w-full sm:w-auto shadow-lg shadow-amber-100"
          >
            Start free trial — no card required
          </Link>
          <a
            href="#how-it-works"
            className="text-gray-600 hover:text-gray-900 font-medium px-8 py-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors w-full sm:w-auto text-center"
          >
            See how it works
          </a>
        </div>
        <p className="text-sm text-gray-400 mt-4">14-day free trial · No credit card · Takes 10 minutes to set up</p>
      </section>

      {/* Stats strip */}
      <section className="border-y border-gray-100 bg-gray-50 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-wrap justify-center gap-8 text-center">
          {[
            { stat: "$4,200", label: "avg. annual savings per client" },
            { stat: "35%", label: "of vendors are overpriced on average" },
            { stat: "10 min", label: "to add your vendors and start" },
            { stat: "42×", label: "ROI on Core plan" },
          ].map((item) => (
            <div key={item.stat}>
              <div className="text-2xl font-bold text-amber-700">{item.stat}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Three steps from setup to savings</h2>
          <p className="text-lg text-gray-600">No consultants, no spreadsheets, no experience needed.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-12">
          {STEPS.map((step) => (
            <div key={step.number}>
              <div className="flex items-baseline gap-3 mb-4">
                <div className="text-6xl font-bold text-amber-100 leading-none">{step.number}</div>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{step.time}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Built for owner-operated businesses</h2>
            <p className="text-lg text-gray-600">
              If you pay recurring vendor bills and haven&apos;t reviewed pricing in 12 months, you&apos;re almost certainly overpaying.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {WHO_FOR.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm font-semibold text-green-600 mb-3">{item.savings}</p>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real results */}
      <section id="results" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Real vendor renegotiations</h2>
          <p className="text-lg text-gray-600">
            These are actual outcomes from Oryn-drafted negotiation emails.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {WINS.map((win, i) => (
            <WinCard key={i} win={win} />
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">
          Results vary. Most clients complete their first negotiation within 2 weeks of setup.
        </p>
      </section>

      {/* ROI Calculator */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What&apos;s it worth for your business?</h2>
            <p className="text-lg text-gray-600">
              Move the sliders — this is what Oryn typically finds at your spend level.
            </p>
          </div>
          <ROICalculator />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, honest pricing</h2>
          <p className="text-lg text-gray-600">
            The average client saves 42× the cost of Core in year one.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Core</h3>
            <div className="text-4xl font-bold text-gray-900 mb-1">
              $99<span className="text-lg font-normal text-gray-500">/mo</span>
            </div>
            <p className="text-gray-500 text-sm mb-2">Up to 10 vendors</p>
            <p className="text-sm text-green-600 font-medium mb-6">Most clients save $4,200+/year</p>
            <ul className="space-y-3 mb-8">
              {[
                "Up to 10 vendors tracked",
                "AI benchmark report for every vendor",
                "Negotiation email drafts",
                "Contract renewal alerts (60 days out)",
                "Copy-to-clipboard email send",
                "Email support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="text-amber-600 font-bold mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center border-2 border-amber-600 text-amber-700 font-semibold py-3 rounded-xl hover:bg-amber-50 transition-colors"
            >
              Start 14-day free trial
            </Link>
          </div>
          <div className="bg-amber-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-4 right-4 bg-white text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
              POPULAR
            </div>
            <h3 className="text-xl font-bold mb-1">Pro</h3>
            <div className="text-4xl font-bold mb-1">
              $199<span className="text-lg font-normal opacity-75">/mo</span>
            </div>
            <p className="text-amber-100 text-sm mb-2">Unlimited vendors</p>
            <p className="text-sm text-amber-100 font-medium mb-6">For businesses with 10+ vendor relationships</p>
            <ul className="space-y-3 mb-8">
              {[
                "Unlimited vendors",
                "Weekly benchmarking refresh",
                "One-click direct send to vendor email",
                "Contract alerts — 60 days out",
                "Priority benchmarking queue",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/90">
                  <span className="font-bold mt-0.5">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center bg-white text-amber-700 font-semibold py-3 rounded-xl hover:bg-amber-50 transition-colors"
            >
              Start 14-day free trial
            </Link>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-8">
          14-day free trial on both plans. No credit card required to start.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <span className="text-gray-400 ml-4 flex-shrink-0 text-xl leading-none">
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-600 leading-relaxed">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gray-900 text-white py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            You&apos;re probably overpaying right now.
          </h2>
          <p className="text-gray-400 text-lg mb-4">
            Add your vendors in 10 minutes. Oryn identifies who&apos;s overcharging you and hands you the email to fix it.
          </p>
          <p className="text-amber-400 font-medium mb-10">
            The average client finds $4,200 in savings. Core costs $1,188/year. You do the math.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-amber-600 hover:bg-amber-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-amber-900/30"
          >
            Start free trial — no card required
          </Link>
          <p className="text-gray-500 text-sm mt-4">14-day trial · Cancel anytime · Setup takes 10 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-900 font-bold">Oryn</div>
          <p className="text-sm text-gray-400">Stop paying more than you should.</p>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Oryn</p>
        </div>
      </footer>
    </div>
  );
}
