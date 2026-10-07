"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartDTO, ProductDTO } from "@/lib/types";
import { formatVND, calcShipping } from "@/lib/utils";
import { useToast } from "@/components/Toast";

type GuestItem = { productId: number; qty: number; product: ProductDTO };

export default function CartPage() {
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [guestItems, setGuestItems] = useState<GuestItem[]>([]);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const loadServerCart = async () => {
    const r = await fetch("/api/cart", { cache: "no-store" });
    if (r.status === 401) {
      setLoggedIn(false);
      // load guest cart
      const raw = localStorage.getItem("guest_cart");
      const parsed: { productId: number; qty: number }[] = raw ? JSON.parse(raw) : [];
      if (!parsed.length) { setGuestItems([]); setLoading(false); return; }
      const detailed: GuestItem[] = [];
      for (const it of parsed) {
        const pr = await fetch(`/api/products/${it.productId}`);
        if (pr.ok) {
          const d = await pr.json();
          detailed.push({ productId: it.productId, qty: it.qty, product: d.product });
        }
      }
      setGuestItems(detailed);
      setLoading(false);
      return;
    }
    setLoggedIn(true);
    const d = await r.json();
    setCart(d.cart);
    setLoading(false);
  };

  useEffect(() => { loadServerCart(); }, []);

  const saveGuest = (items: { productId: number; qty: number }[]) => {
    localStorage.setItem("guest_cart", JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
  };

  const updateServerQty = async (productId: number, quantity: number) => {
    const r = await fetch(`/api/cart/${productId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity })
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error || "Could not update quantity.", "error"); return; }
    await loadServerCart();
    window.dispatchEvent(new Event("cart-updated"));
  };

  const removeServer = async (productId: number) => {
    await fetch(`/api/cart/${productId}`, { method: "DELETE" });
    toast("Product removed from cart.");
    await loadServerCart();
    window.dispatchEvent(new Event("cart-updated"));
  };

  const clearServer = async () => {
    if (!confirm("Clear the entire cart?")) return;
    await fetch("/api/cart", { method: "DELETE" });
    toast("Cart cleared.");
    await loadServerCart();
    window.dispatchEvent(new Event("cart-updated"));
  };

  if (loading) return <p className="py-16 text-center text-gray-500">Loading cart...</p>;

  // Guest view
  if (loggedIn === false) {
    const subtotal = guestItems.reduce((s, i) => s + i.qty * i.product.price, 0);
    const shipping = calcShipping(subtotal);
    if (!guestItems.length) {
      return (
        <div className="rounded-2xl border bg-white p-12 text-center">
          <p className="text-xl font-bold">Your cart is empty.</p>
          <p className="mt-1 text-sm text-gray-500">Login to sync your cart across devices.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/products" className="rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white">Continue Shopping</Link>
            <Link href="/login?redirect=/cart" className="rounded-lg border px-4 py-2 text-sm font-semibold">Login</Link>
          </div>
        </div>
      );
    }
    return (
      <div>
        <h1 className="text-2xl font-bold">Shopping Cart (guest)</h1>
        <p className="mt-1 text-sm text-amber-700">Please <Link href="/login?redirect=/cart" className="font-bold underline">login</Link> before checkout.</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {guestItems.map((i) => (
              <div key={i.productId} className="flex gap-3 rounded-xl border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.product.image} alt={i.product.name} className="h-20 w-20 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{i.product.name}</p>
                  <p className="text-sm text-gray-500">{formatVND(i.product.price)} each</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => {
                      const raw = JSON.parse(localStorage.getItem("guest_cart") || "[]") as { productId: number; qty: number }[];
                      const next = raw.map((x) => x.productId === i.productId ? { ...x, qty: Math.max(1, x.qty - 1) } : x);
                      saveGuest(next); loadServerCart();
                    }} className="rounded border px-2">−</button>
                    <span className="w-8 text-center text-sm font-bold">{i.qty}</span>
                    <button onClick={() => {
                      const raw = JSON.parse(localStorage.getItem("guest_cart") || "[]") as { productId: number; qty: number }[];
                      const next = raw.map((x) => x.productId === i.productId ? { ...x, qty: Math.min(i.product.stock, x.qty + 1) } : x);
                      saveGuest(next); loadServerCart();
                    }} className="rounded border px-2">+</button>
                    <button onClick={() => {
                      const raw = JSON.parse(localStorage.getItem("guest_cart") || "[]") as { productId: number; qty: number }[];
                      saveGuest(raw.filter((x) => x.productId !== i.productId)); loadServerCart();
                      toast("Product removed from cart.");
                    }} className="ml-2 text-sm font-semibold text-red-600">Remove</button>
                  </div>
                </div>
                <p className="font-bold text-red-600">{formatVND(i.qty * i.product.price)}</p>
              </div>
            ))}
          </div>
          <div className="h-fit rounded-xl border bg-white p-4">
            <p className="font-bold">Order summary</p>
            <div className="mt-2 space-y-1 text-sm">
              <p className="flex justify-between"><span>Items</span><span>{guestItems.reduce((s, i) => s + i.qty, 0)}</span></p>
              <p className="flex justify-between"><span>Subtotal</span><span>{formatVND(subtotal)}</span></p>
              <p className="flex justify-between"><span>Shipping</span><span>{formatVND(shipping)}</span></p>
              <p className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span className="text-red-600">{formatVND(subtotal + shipping)}</span></p>
            </div>
            <Link href="/login?redirect=/checkout" className="mt-3 block rounded-lg bg-[#0A3161] py-2.5 text-center text-sm font-bold text-white">Proceed to Checkout (Login)</Link>
            <Link href="/products" className="mt-2 block rounded-lg border py-2.5 text-center text-sm font-semibold">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const shipping = calcShipping(subtotal);

  if (!items.length) {
    return (
      <div className="rounded-2xl border bg-white p-12 text-center">
        <p className="text-xl font-bold">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-block rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-bold text-white">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shopping Cart ({cart?.totalCount} items)</h1>
        <button onClick={clearServer} className="text-sm font-semibold text-red-600 hover:underline">Clear cart</button>
      </div>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((i) => (
            <div key={i.id} className="flex gap-3 rounded-xl border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.product.image} alt={i.product.name} className="h-20 w-20 rounded-lg object-cover" />
              <div className="flex-1">
                <Link href={`/products/${i.productId}`} className="font-semibold hover:text-[#B31942]">{i.product.name}</Link>
                <p className="text-sm text-gray-500">{formatVND(i.product.price)} each · stock {i.product.stock}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => updateServerQty(i.productId, Math.max(1, i.quantity - 1))} className="rounded border px-2">−</button>
                  <input
                    value={i.quantity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 1) updateServerQty(i.productId, v);
                    }}
                    className="w-12 rounded border py-1 text-center text-sm" inputMode="numeric" />
                  <button onClick={() => updateServerQty(i.productId, i.quantity + 1)} className="rounded border px-2">+</button>
                  <button onClick={() => removeServer(i.productId)} className="ml-2 text-sm font-semibold text-red-600 hover:underline">Remove</button>
                </div>
              </div>
              <p className="font-bold text-red-600">{formatVND(i.subtotal)}</p>
            </div>
          ))}
        </div>
        <div className="h-fit rounded-xl border bg-white p-4">
          <p className="font-bold">Order summary</p>
          <div className="mt-2 space-y-1 text-sm">
            <p className="flex justify-between"><span>Total products</span><span>{cart?.totalCount}</span></p>
            <p className="flex justify-between"><span>Subtotal</span><span>{formatVND(subtotal)}</span></p>
            <p className="flex justify-between"><span>Shipping fee</span><span>{shipping === 0 ? "Free" : formatVND(shipping)}</span></p>
            <p className="flex justify-between border-t pt-2 text-base font-bold"><span>Total price</span><span className="text-red-600">{formatVND(subtotal + shipping)}</span></p>
          </div>
          <button onClick={() => router.push("/checkout")} className="mt-3 w-full rounded-lg bg-[#0A3161] py-2.5 text-sm font-bold text-white hover:bg-[#B31942]">
            Proceed to Checkout
          </button>
          <Link href="/products" className="mt-2 block rounded-lg border py-2.5 text-center text-sm font-semibold hover:bg-gray-50">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
