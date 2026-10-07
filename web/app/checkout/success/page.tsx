"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { OrderDTO } from "@/lib/types";
import { formatVND, PAYMENT_LABELS } from "@/lib/utils";

function SuccessInner() {
  const sp = useSearchParams();
  const code = sp.get("code") || (typeof window !== "undefined" ? sessionStorage.getItem("last_order_code") || "" : "");
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    fetch(`/api/orders/by-code/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => { setOrder(d.order ?? null); setLoading(false); });
  }, [code]);

  if (loading) return <p className="py-16 text-center text-gray-500">Loading order...</p>;
  if (!order) return (
    <div className="rounded-2xl border bg-white p-10 text-center">
      <p className="text-lg font-bold">No recent order found.</p>
      <Link href="/products" className="mt-3 inline-block rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white">Continue Shopping</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
        <h1 className="mt-3 text-2xl font-extrabold text-green-700">Order placed successfully.</h1>
        <p className="mt-1 text-sm text-gray-500">Payment successful. Thank you for shopping with Kirk's Ecommerce Shop!</p>
        <p className="mt-4 inline-block rounded-lg bg-gray-100 px-4 py-2 text-lg font-extrabold tracking-wide">{order.orderCode}</p>
        <div className="mt-4 space-y-1 text-left text-sm">
          <p className="flex justify-between"><span>Items</span><span>{order.items.reduce((s, i) => s + i.quantity, 0)}</span></p>
          <p className="flex justify-between"><span>Payment</span><span>{PAYMENT_LABELS[order.paymentMethod]} ({order.paymentStatus})</span></p>
          <p className="flex justify-between"><span>Status</span><span className="font-semibold text-[#0A3161]">{order.orderStatus}</span></p>
          <p className="flex justify-between"><span>Total</span><span className="font-bold text-red-600">{formatVND(order.totalAmount)}</span></p>
          <p><span className="font-medium">Ship to:</span> {order.shippingFullName}, {order.shippingPhone}, {order.shippingAddress}, {order.ward}, {order.district}, {order.city}</p>
        </div>
        <div className="mt-5 flex gap-2">
          <Link href={`/track-order?code=${order.orderCode}`} className="flex-1 rounded-lg bg-[#0A3161] py-2.5 text-sm font-bold text-white">Track Order</Link>
          <Link href="/orders" className="flex-1 rounded-lg border py-2.5 text-sm font-semibold">My Orders</Link>
          <Link href="/products" className="flex-1 rounded-lg border py-2.5 text-sm font-semibold">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center">Loading...</p>}>
      <SuccessInner />
    </Suspense>
  );
}
