"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderDTO } from "@/lib/types";
import OrderDetailView from "@/components/OrderDetailView";

function TrackInner() {
  const sp = useSearchParams();
  const initial = sp.get("code") || "";
  const [code, setCode] = useState(initial);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const lookup = async (c?: string) => {
    const target = (c ?? code).trim().toUpperCase();
    if (!target) { setError("Please enter an order ID."); setOrder(null); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/orders/by-code/${encodeURIComponent(target)}`);
      const d = await r.json();
      if (!r.ok) { setError("Order not found."); setOrder(null); setSearched(true); return; }
      setOrder(d.order);
      setCode(target);
      setSearched(true);
    } catch {
      setError("Order not found.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initial) lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Track Order</h1>
      <p className="mt-1 text-sm text-gray-500">Enter your order ID, e.g. ORD-2026-00001</p>
      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="mt-3 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ORD-2026-00001"
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-[#B31942]" />
        <button disabled={busy} className="rounded-lg bg-[#0A3161] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {busy ? "..." : "Track"}
        </button>
      </form>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {order && (
        <div className="mt-4"><OrderDetailView order={order} /></div>
      )}
      {!order && !error && !searched && (
        <div className="mt-4 rounded-xl border bg-white p-10 text-center text-sm text-gray-500">
          Your order timeline will appear here.
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center">Loading...</p>}>
      <TrackInner />
    </Suspense>
  );
}
