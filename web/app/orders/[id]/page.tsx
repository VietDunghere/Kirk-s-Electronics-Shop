"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { OrderDTO } from "@/lib/types";
import OrderDetailView from "@/components/OrderDetailView";

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/orders/${params.id}`);
      const d = await r.json();
      if (r.status === 401) { router.push(`/login?redirect=/orders/${params.id}`); return; }
      if (!r.ok) { setError(d.error || "Order not found."); setLoading(false); return; }
      setOrder(d.order);
      setLoading(false);
    })();
  }, [params.id, router]);

  if (loading) return <p className="py-16 text-center text-gray-500">Loading order...</p>;
  if (error || !order) return (
    <div className="rounded-xl border bg-white p-10 text-center">
      <p className="font-bold">{error || "Order not found."}</p>
      <Link href="/orders" className="mt-3 inline-block rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white">Back to My Orders</Link>
    </div>
  );
  return <OrderDetailView order={order} />;
}
