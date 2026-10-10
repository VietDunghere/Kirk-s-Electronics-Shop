"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { COMPARE_MAX, readCompare, writeCompare } from "@/lib/clientCart";

/** Floating tray: products ticked with "Compare" on the cards, with a link to the AI comparison page. */
export default function CompareBar() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    const sync = () => setIds(readCompare());
    sync();
    window.addEventListener("compare-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("compare-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (ids.length === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg">
      <span className="text-sm font-semibold">⚖ Compare ({ids.length}/{COMPARE_MAX})</span>
      {ids.length >= 2 ? (
        <Link href={`/compare?ids=${ids.join(",")}`} className="rounded-lg bg-[#0A3161] px-3 py-1.5 text-sm font-bold text-white hover:bg-[#B31942]">
          AI compare
        </Link>
      ) : (
        <span className="text-xs text-gray-500">choose at least 2</span>
      )}
      <button onClick={() => writeCompare([])} className="text-xs font-semibold text-gray-500 hover:text-red-600">Clear</button>
    </div>
  );
}
