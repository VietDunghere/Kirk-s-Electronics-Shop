"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderDTO } from "@/lib/types";
import { formatVND, PAYMENT_LABELS } from "@/lib/utils";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/orders", { cache: "no-store" });
      if (r.status === 401) { router.push("/login?redirect=/orders"); return; }
      const d = await r.json();
      setOrders(d.orders ?? []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <p className="py-16 text-center text-gray-500">Loading orders...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">My Orders</h1>
      {!orders.length ? (
        <div className="mt-4 rounded-xl border bg-white p-10 text-center text-gray-500">
          You have no orders yet.
          <div><Link href="/products" className="mt-3 inline-block rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white">Shop now</Link></div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-xl border bg-white p-4 hover:border-[#B31942]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-extrabold text-[#0A3161]">{o.orderCode}</p>
                <span className="rounded-full bg-[#E8EDF3] px-3 py-1 text-xs font-bold text-[#0A3161]">{o.orderStatus}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()} · {PAYMENT_LABELS[o.paymentMethod]} · {o.paymentStatus}</p>
              <p className="mt-1 text-sm">{o.items.reduce((s, i) => s + i.quantity, 0)} item(s) — <b className="text-red-600">{formatVND(o.totalAmount)}</b></p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
