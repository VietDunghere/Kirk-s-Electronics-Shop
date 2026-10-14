"use client";
import Link from "next/link";
import Reveal from "./Reveal";

const CATEGORY_META: Record<string, { icon: string; blurb: string }> = {
  Electronics: { icon: "🖥️", blurb: "Monitors, tablets & more" },
  Phones: { icon: "📱", blurb: "Flagships & everyday phones" },
  Laptops: { icon: "💻", blurb: "Work, study & creator picks" },
  Accessories: { icon: "🎧", blurb: "Audio, wearables & extras" },
  Gaming: { icon: "🎮", blurb: "Gear, VR & battlestations" },
  PC: { icon: "🖥️", blurb: "Parts & ready-built rigs" }
};

/** Category cards with soft shadows, subtle borders and smooth hover lift.
 *  Same links as before (/products?category=...) — visual change only. */
export default function CategoryGrid({ categories }: { categories: string[] }) {
  return (
    <Reveal>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {categories.map((c, i) => {
          const meta = CATEGORY_META[c] ?? { icon: "📦", blurb: "Explore the range" };
          return (
            <Reveal key={c} delay={Math.min(i * 60, 300)} className="h-full">
              <Link
                href={`/products?category=${encodeURIComponent(c)}`}
                className="group flex h-full flex-col items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-center shadow-[0_1px_2px_rgba(10,49,97,0.05)] backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-[#B31942]/30 hover:shadow-[0_16px_32px_-16px_rgba(10,49,97,0.30)] sm:p-5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#F8FAFC] text-2xl ring-1 ring-inset ring-[#0A3161]/10 transition duration-200 group-hover:from-[#0A3161] group-hover:to-[#B31942] group-hover:ring-transparent [&>span]:transition">
                  <span aria-hidden="true">{meta.icon}</span>
                </span>
                <span className="mt-1 text-sm font-bold text-slate-900 group-hover:text-[#B31942]">{c}</span>
                <span className="text-[11px] leading-snug text-slate-500">{meta.blurb}</span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </Reveal>
  );
}
