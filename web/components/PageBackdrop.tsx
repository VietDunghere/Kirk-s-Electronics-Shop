"use client";

/** Ambient background for the whole site: off-white to light-blue base (on body)
 *  plus very subtle navy / violet / burgundy glows and a dotted grid.
 *  Fixed, pointer-transparent, and hidden from assistive tech. Purely visual —
 *  no layout, route, or business-logic impact. */
export default function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* ambient glows — navy top-left, violet top-right, burgundy bottom */}
      <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#0A3161]/[0.07] blur-3xl" />
      <div className="absolute -top-24 right-[-8rem] h-[24rem] w-[24rem] rounded-full bg-violet-400/[0.08] blur-3xl" />
      <div className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[30rem] rounded-full bg-[#B31942]/[0.05] blur-3xl" />
      {/* dotted grid, faded toward the edges */}
      <div className="dot-grid dot-grid-fade absolute inset-x-0 top-0 h-[42rem] opacity-60" />
    </div>
  );
}
