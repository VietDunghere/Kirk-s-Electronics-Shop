"use client";
import { useState } from "react";
import Link from "next/link";
import { formatVND } from "@/lib/utils";
import { addProductToCart } from "@/lib/clientCart";
import { useToast } from "@/components/Toast";
import type { BundleResult } from "@/server/application/service/bundleService";

const USAGES = [
  { value: "", label: "Auto-detect from my text" },
  { value: "gaming", label: "🎮 Gaming setup" },
  { value: "study", label: "📚 Study / office" },
  { value: "creator", label: "🎬 Video & photo creator" },
  { value: "mobile", label: "📱 Mobile & accessories" },
  { value: "entertainment", label: "🍿 Home entertainment" }
];
const EXAMPLES = ["setup gaming 30 triệu", "build PC gaming 45 triệu", "laptop cho sinh viên 25 triệu", "quay chụp du lịch 40 triệu", "giải trí xem phim 15 triệu"];

export default function BundlePage() {
  const [text, setText] = useState("");
  const [usage, setUsage] = useState("");
  const [budget, setBudget] = useState("");
  const [data, setData] = useState<BundleResult | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();
  const option = data?.options[tab];

  const build = async (t = text) => {
    setBusy(true); setError("");
    const r = await fetch("/api/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t, usage: usage || undefined, budget: budget ? Number(budget) * 1_000_000 : undefined })
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error || "Could not build the set."); setData(null); return; }
    setData(d.bundle);
    setTab(0);
  };

  const addAll = async () => {
    const option = data?.options[tab];
    if (!option) return;
    setAdding(true);
    let ok = 0;
    for (const i of option.items) {
      const res = await addProductToCart(i.product.id, 1, i.product.stock);
      if (res.ok) ok++;
    }
    setAdding(false);
    toast(ok === option.items.length ? `Added ${ok} products to your cart.` : `Added ${ok}/${option.items.length} products (some failed).`, ok ? "success" : "error");
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">🤖 AI setup builder</h1>
      <p className="mt-1 text-sm text-gray-500">Tell us what you need and your budget. We pick a full set from the shop&apos;s real products.</p>

      <form onSubmit={(e) => { e.preventDefault(); build(); }} className="mt-4 space-y-3 rounded-xl border bg-white p-4">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder='e.g. "setup gaming 30 triệu"'
          className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:border-[#B31942]" />
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} onClick={() => { setText(ex); build(ex); }}
              className="rounded-full border px-3 py-1 text-xs font-medium hover:border-[#B31942] hover:text-[#B31942]">{ex}</button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select value={usage} onChange={(e) => setUsage(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            {USAGES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Budget (million VND), optional"
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          <button disabled={busy} className="rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white hover:bg-[#B31942] disabled:opacity-60">
            {busy ? "Building..." : "Build my set"}
          </button>
        </div>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border-l-4 border-[#B31942] bg-white p-4 shadow-sm">
            <p className="text-sm font-bold">🤖 {data.usageLabel} {data.usedAI ? "" : <span className="font-normal text-gray-400">(rule-based, no AI key)</span>}</p>
            <p className="mt-1 text-sm">{data.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.options.map((o, i) => (
              <button key={o.id} onClick={() => setTab(i)}
                className={`rounded-xl border-2 px-4 py-2 text-left text-sm transition ${tab === i ? "border-[#0A3161] bg-[#E8EDF3]" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <span className="block text-xs font-bold uppercase text-[#B31942]">Set {i + 1} · {o.source === "ai" ? "🤖 AI" : "template"}</span>
                <span className="block font-semibold">{o.label}</span>
                <span className="block text-xs text-gray-500">{formatVND(o.total)} · {o.items.length} items</span>
              </button>
            ))}
          </div>

          {option && (
            <>
              {option.why && <p className="rounded-lg bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">🤖 {option.why}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                {option.items.map((i) => (
                  <div key={i.product.id} className="flex gap-3 rounded-xl border bg-white p-3">
                    <Link href={`/products/${i.product.id}`} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.product.image} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    </Link>
                    <div className="min-w-0 text-sm">
                      <p className="text-xs font-bold uppercase text-[#0A3161]">{i.slot}{i.core ? "" : " · optional"}</p>
                      <Link href={`/products/${i.product.id}`} className="line-clamp-2 font-semibold hover:text-[#B31942]">{i.product.name}</Link>
                      <p className="font-extrabold text-red-600">{formatVND(i.product.price)}</p>
                      <p className="text-xs text-gray-500">★ {i.product.rating.toFixed(1)} · {i.product.stock} in stock</p>
                    </div>
                  </div>
                ))}
              </div>

              {option.notes.map((n) => <p key={n} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{n}</p>)}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
                <div className="text-sm">
                  <p>Set {tab + 1} total: <b className="text-lg text-red-600">{formatVND(option.total)}</b> / budget {formatVND(data.budget)}</p>
                  <p className="text-gray-500">Remaining: {formatVND(option.remaining)}</p>
                </div>
                <button onClick={addAll} disabled={adding}
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                  {adding ? "Adding..." : `🛒 Add Set ${tab + 1} to cart`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
