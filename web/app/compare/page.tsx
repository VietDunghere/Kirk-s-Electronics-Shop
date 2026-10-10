"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatVND } from "@/lib/utils";
import { addProductToCart } from "@/lib/clientCart";
import { useToast } from "@/components/Toast";
import { stars } from "@/components/ProductCard";
import type { CompareResult } from "@/server/application/service/compareService";

const NEEDS = ["", "chơi game", "học tập / văn phòng", "quay chụp", "tiết kiệm", "làm việc di chuyển"];

function CompareInner() {
  const sp = useSearchParams();
  const ids = (sp.get("ids") || "").split(",").map(Number).filter(Boolean);
  const [need, setNeed] = useState("");
  const [data, setData] = useState<CompareResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const { toast } = useToast();
  const key = ids.join(",");

  const run = useCallback(async () => {
    setBusy(true); setError("");
    const r = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: key.split(",").map(Number), need }) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Could not compare."); setData(null); } else setData(d.comparison);
    setBusy(false);
  }, [key, need]);

  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key]);

  const add = async (p: CompareResult["products"][number]) => {
    const res = await addProductToCart(p.id, 1, p.stock);
    toast(res.message, res.ok ? "success" : "error");
  };

  const badge = (id: number) => {
    if (!data) return [];
    const b: string[] = [];
    if (data.best.cheapest === id) b.push("Rẻ nhất");
    if (data.best.topRated === id) b.push("Đánh giá cao nhất");
    if (data.best.bestSeller === id) b.push("Bán chạy nhất");
    if (data.best.bestValue === id) b.push("⭐ Đáng tiền nhất");
    return b;
  };

  const rows: { label: string; cell: (p: CompareResult["products"][number]) => React.ReactNode; win?: (p: CompareResult["products"][number]) => boolean }[] = data ? [
    { label: "Price", cell: (p) => formatVND(p.price), win: (p) => p.id === data.best.cheapest },
    { label: "Rating", cell: (p) => <span><span className="text-amber-500">{stars(p.rating)}</span> {p.rating.toFixed(1)}</span>, win: (p) => p.id === data.best.topRated },
    { label: "Sold", cell: (p) => p.sold, win: (p) => p.id === data.best.bestSeller },
    { label: "Stock", cell: (p) => (p.stock > 0 ? `${p.stock} left` : "Out of stock") },
    { label: "Category", cell: (p) => p.category },
    { label: "Description", cell: (p) => <span className="text-xs text-gray-600">{p.description}</span> }
  ] : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">🤖 AI product comparison</h1>
      <p className="mt-1 text-sm text-gray-500">Table from real shop data. The AI writes the verdict for your need.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input list="needs" value={need} onChange={(e) => setNeed(e.target.value)} placeholder="Your need, e.g. chơi game"
          className="w-64 rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
        <datalist id="needs">{NEEDS.filter(Boolean).map((n) => <option key={n} value={n} />)}</datalist>
        <button onClick={run} disabled={busy} className="rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white hover:bg-[#B31942] disabled:opacity-60">
          {busy ? "Thinking..." : "Compare for this need"}
        </button>
        <Link href="/products" className="text-sm font-semibold text-[#0A3161] hover:underline">+ Choose other products</Link>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error} <Link href="/products" className="font-semibold underline">Pick products</Link></p>}

      {data && (
        <>
          <div className="mt-4 rounded-xl border-l-4 border-[#B31942] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold">🤖 Verdict {data.usedAI ? "" : <span className="font-normal text-gray-400">(rule-based, no AI key)</span>}</p>
            <p className="mt-1 whitespace-pre-line text-sm">{data.verdict}</p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="w-28 p-3" />
                  {data.products.map((p) => (
                    <th key={p.id} className="p-3 align-top">
                      <Link href={`/products/${p.id}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" className="mx-auto h-28 w-28 rounded-lg object-cover" />
                        <p className="mt-2 font-semibold hover:text-[#B31942]">{p.name}</p>
                      </Link>
                      <div className="mt-1 flex flex-wrap justify-center gap-1">
                        {badge(p.id).map((b) => <span key={b} className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">{b}</span>)}
                      </div>
                      <button onClick={() => add(p)} disabled={p.stock <= 0}
                        className="mt-2 rounded-lg bg-[#0A3161] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#B31942] disabled:bg-gray-300">Add to Cart</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t">
                    <td className="p-3 font-semibold text-gray-600">{r.label}</td>
                    {data.products.map((p) => (
                      <td key={p.id} className={`p-3 text-center ${r.win?.(p) ? "bg-green-50 font-bold text-green-700" : ""}`}>{r.cell(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!data && !error && busy && <p className="py-10 text-center text-gray-500">Comparing...</p>}
    </div>
  );
}

export default function ComparePage() {
  return <Suspense fallback={<p className="py-10 text-center">Loading...</p>}><CompareInner /></Suspense>;
}
