import type { ReactNode } from "react";
import Reveal from "./Reveal";

/** Consistent section heading: eyebrow + title + optional action link. */
export default function SectionHeading({
  eyebrow,
  title,
  action
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <Reveal>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#B31942]">{eyebrow}</p>
          )}
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
          <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#0A3161] to-[#B31942]" aria-hidden="true" />
        </div>
        {action}
      </div>
    </Reveal>
  );
}
