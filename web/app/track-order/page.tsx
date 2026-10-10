"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderDTO } from "@/lib/types";
import { DELIVERY_INFO } from "@/lib/utils";
import OrderDetailView from "@/components/OrderDetailView";

type DeliveryKey = keyof typeof DELIVERY_INFO;

function TrackInner() {
  const sp = useSearchParams();
  const initial = sp.get("code") || "";
  const [code, setCode] = useState(initial);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [mine, setMine] = useState<OrderDTO[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const lookup = useCallback(async (c: string) => {
    const target = c.trim().toUpperCase();
    if (!target) { setError("Please enter an order ID."); setOrder(null); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/orders/by-code/${encodeURIComponent(target)}`, { cache: "no-store" });
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
  }, []);

  // The logged-in customer's orders (newest first): pick which one to follow. Guests just use the order ID box.
  const loadMine = useCallback(async () => {
    try {
      const r = await fetch("/api/orders", { cache: "no-store" });
      if (!r.ok) return [];
      const d = await r.json();
      const list: OrderDTO[] = d.orders ?? [];
      setMine(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    (async () => {
      const list = await loadMine();
      if (initial) lookup(initial);
      else if (list.length) lookup(list[0].orderCode); // no code given: follow the newest order
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the statuses in the order list fresh while a drone / car delivery is moving
  const moving = mine.some((o) => o.tracking && !o.tracking.delivered);
  useEffect(() => {
    if (!moving) return;
    const t = setInterval(loadMine, 5000);
    return () => clearInterval(t);
  }, [moving, loadMine]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Track Order</h1>

      {mine.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-sm font-semibold">Your orders ({mine.length})</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {mine.map((o) => {
              const active = order?.orderCode === o.orderCode;
              const method = DELIVERY_INFO[o.deliveryMethod as DeliveryKey];
              return (
                <button
                  key={o.id}
                  onClick={() => lookup(o.orderCode)}
                  className={`min-w-44 shrink-0 rounded-xl border-2 p-3 text-left text-sm transition ${active ? "border-[#0A3161] bg-[#E8EDF3]" : "border-gray-200 bg-white hover:border-gray-300"}`}
                >
                  <span className="block font-mono text-xs font-bold">{o.orderCode}</span>
                  <span className="mt-1 block font-semibold text-[#0A3161]">{o.orderStatus}</span>
                  <span className="block text-xs text-gray-500">
                    {method?.icon} {method?.label ?? "Standard delivery"}
                  </span>
                  <span className="block text-xs text-gray-400">{new Date(o.createdAt).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 text-sm text-gray-500">Or enter an order ID, e.g. ORD-2026-00001</p>
      <form onSubmit={(e) => { e.preventDefault(); lookup(code); }} className="mt-2 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="ORD-2026-00001"
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-[#B31942]" />
        <button disabled={busy} className="rounded-lg bg-[#0A3161] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {busy ? "..." : "Track"}
        </button>
      </form>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {order && (
        <div className="mt-4"><OrderDetailView key={order.orderCode} order={order} /></div>
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
