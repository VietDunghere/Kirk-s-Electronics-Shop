"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { stars } from "@/components/ProductCard";
import ProductGrid from "@/components/ProductGrid";
import { useToast } from "@/components/Toast";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [related, setRelated] = useState<ProductDTO[]>([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/products/${params.id}`);
      if (!r.ok) { setNotFound(true); setLoading(false); return; }
      const d = await r.json();
      setProduct(d.product);
      setRelated(d.related ?? []);
      setLoading(false);
    })();
  }, [params.id]);

  const addToCart = async () => {
    if (!product) return;
    if (qty > product.stock) {
      toast(`Only ${product.stock} item(s) available in stock.`, "error");
      return;
    }
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, quantity: qty })
    });
    const d = await r.json();
    if (r.status === 401) {
      const raw = localStorage.getItem("guest_cart");
      const items: { productId: number; qty: number }[] = raw ? JSON.parse(raw) : [];
      const f = items.find((i) => i.productId === product.id);
      if (f) f.qty = Math.min(f.qty + qty, product.stock);
      else items.push({ productId: product.id, qty });
      localStorage.setItem("guest_cart", JSON.stringify(items));
      window.dispatchEvent(new Event("cart-updated"));
      toast("Product added to cart successfully.");
      return;
    }
    if (!r.ok) { toast(d.error || "Could not add to cart.", "error"); return; }
    window.dispatchEvent(new Event("cart-updated"));
    toast("Product added to cart successfully.");
  };

  if (loading) return <p className="py-16 text-center text-gray-500">Loading product...</p>;
  if (notFound || !product) return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold">Product not found.</p>
      <Link href="/products" className="mt-3 inline-block rounded-lg bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white">Back to Products</Link>
    </div>
  );

  const out = product.stock <= 0;

  return (
    <div>
      <div className="grid gap-6 rounded-2xl border bg-white p-5 md:grid-cols-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="aspect-square w-full rounded-xl bg-gray-100 object-cover" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0A3161]">{product.category}</p>
          <h1 className="mt-1 text-2xl font-extrabold">{product.name}</h1>
          <p className="mt-1 text-sm text-amber-500">{stars(product.rating)} <span className="text-gray-500">{product.rating.toFixed(1)} · {product.sold} sold</span></p>
          <p className="mt-3 text-3xl font-extrabold text-red-600">{formatVND(product.price)}</p>
          <p className={`mt-1 text-sm font-semibold ${out ? "text-red-600" : "text-green-600"}`}>
            {out ? "Out of Stock" : `In stock (${product.stock} available)`}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">{product.description}</p>
          <div className="mt-5 flex items-center gap-3">
            <label className="text-sm font-medium">Quantity:</label>
            <div className="flex items-center rounded-lg border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 font-bold">−</button>
              <input value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 border-x py-2 text-center text-sm outline-none" inputMode="numeric" />
              <button onClick={() => setQty(Math.min(product.stock || 1, qty + 1))} className="px-3 py-2 font-bold">+</button>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={addToCart} disabled={out}
              className="flex-1 rounded-lg bg-[#0A3161] px-4 py-3 text-sm font-bold text-white hover:bg-[#B31942] disabled:bg-gray-300">
              {out ? "Out of Stock" : "Add to Cart"}
            </button>
            <Link href="/products" className="rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-gray-50">Back to Products</Link>
          </div>
          <button onClick={() => { addToCart(); }} className="sr-only">add</button>
        </div>
      </div>
      {related.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Related products</h2>
          <ProductGrid products={related} />
        </div>
      )}
    </div>
  );
}
