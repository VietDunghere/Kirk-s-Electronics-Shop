"use client";
import { useEffect, useState } from "react";
import type { OrderDTO } from "@/lib/types";
import { formatVND, PAYMENT_LABELS, DELIVERY_INFO } from "@/lib/utils";
import OrderStatusTimeline from "./OrderStatusTimeline";
import DeliveryTracker from "./DeliveryTracker";

type DeliveryKey = keyof typeof DELIVERY_INFO;

export default function OrderDetailView({ order: initial }: { order: OrderDTO }) {
  const [order, setOrder] = useState(initial);
  useEffect(() => setOrder(initial), [initial]);

  // drone / autonomous-car orders: refresh the simulated tracking every 3 s until delivered
  const live = !!order.tracking && !order.tracking.delivered;
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(async () => {
      try {
        const d = await fetch(`/api/orders/by-code/${encodeURIComponent(order.orderCode)}`, { cache: "no-store" }).then((r) => r.json());
        if (d.order) setOrder((prev) => ({ ...prev, orderStatus: d.order.orderStatus, tracking: d.order.tracking }));
      } catch { /* keep the last known position */ }
    }, 3000);
    return () => clearInterval(timer);
  }, [live, order.orderCode]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-extrabold">{order.orderCode}</h1>
          <span className="rounded-full bg-[#E8EDF3] px-3 py-1 text-xs font-bold text-[#0A3161]">{order.orderStatus}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">Placed: {new Date(order.createdAt).toLocaleString()}</p>
        {order.tracking && (
          <p className="mt-1 text-sm font-semibold text-[#B31942]">
            {DELIVERY_INFO[order.tracking.method].icon} {DELIVERY_INFO[order.tracking.method].label}
          </p>
        )}
        <div className="mt-4"><OrderStatusTimeline status={order.orderStatus} /></div>
      </div>
      {order.tracking && <DeliveryTracker tracking={order.tracking} address={[order.shippingAddress, order.ward, order.district, order.city].filter(Boolean).join(", ")} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="font-bold">Products</h2>
          <div className="mt-2 space-y-2">
            {order.items.map((i) => (
              <p key={i.id} className="flex justify-between gap-2">
                <span>{i.productName} × {i.quantity}</span>
                <span className="font-semibold">{formatVND(i.price * i.quantity)}</span>
              </p>
            ))}
          </div>
          <div className="mt-2 space-y-1 border-t pt-2">
            <p className="flex justify-between"><span>Subtotal</span><span>{formatVND(order.subtotal)}</span></p>
            <p className="flex justify-between"><span>Shipping ({DELIVERY_INFO[order.deliveryMethod as DeliveryKey]?.label ?? "Standard delivery"})</span><span>{formatVND(order.shippingFee)}</span></p>
            <p className="flex justify-between font-bold"><span>Total</span><span className="text-red-600">{formatVND(order.totalAmount)}</span></p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4 text-sm">
            <h2 className="font-bold">Shipping address</h2>
            <p className="mt-1">{order.shippingFullName} · {order.shippingPhone}</p>
            <p>{order.shippingAddress}, {order.ward}, {order.district}, {order.city}</p>
            {order.note && <p className="text-gray-500">Note: {order.note}</p>}
          </div>
          <div className="rounded-xl border bg-white p-4 text-sm">
            <h2 className="font-bold">Payment</h2>
            <p>Method: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
            <p>Status: <b className="text-green-700">{order.paymentStatus}</b></p>
          </div>
        </div>
      </div>
    </div>
  );
}
