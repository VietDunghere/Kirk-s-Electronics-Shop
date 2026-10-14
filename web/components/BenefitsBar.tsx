import Reveal from "./Reveal";

/** Compact shopping-benefits strip. Wording is neutral / descriptive of the
 *  demo (simulated checkout, order tracking) — no unsupported promises. */
const BENEFITS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v8H3zM14 10h4l3 3v2h-7zM6 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm12 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </svg>
    ),
    title: "Shipping options",
    text: "Standard, drone & autonomous-car delivery at checkout"
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3zM9 12l2 2 4-4" />
      </svg>
    ),
    title: "Simulated secure checkout",
    text: "Card validation or e-wallet confirmation — demo only"
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" />
      </svg>
    ),
    title: "Live order tracking",
    text: "Follow every order by code on a real-time map"
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-5-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 3V6a2 2 0 012-2z" />
      </svg>
    ),
    title: "AI shopping assistant",
    text: "Chat, compare & build full setups by budget"
  }
];

export default function BenefitsBar() {
  return (
    <Reveal>
      <section aria-label="Shopping benefits" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_1px_2px_rgba(10,49,97,0.05)] backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#0A3161]/20 hover:shadow-[0_10px_24px_-12px_rgba(10,49,97,0.25)]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A3161] to-[#1A4A8A] text-white">
              {b.icon}
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900">{b.title}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{b.text}</span>
            </span>
          </div>
        ))}
      </section>
    </Reveal>
  );
}
