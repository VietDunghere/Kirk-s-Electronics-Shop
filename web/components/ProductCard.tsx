"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "./Toast";
import { COMPARE_MAX, readCompare, writeCompare } from "@/lib/clientCart";

export function stars(rating: number) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function ProductCard({ product }: { product: ProductDTO }) {
  const { toast } = useToast();
  const router = useRouter();
  const [comparing, setComparing] = useState(false);
  useEffect(() => {
    const sync = () => setComparing(readCompare().includes(product.id));
    sync();
    window.addEventListener("compare-updated", sync);
    return () => window.removeEventListener("compare-updated", sync);
  }, [product.id]);

  const toggleCompare = () => {
    const ids = readCompare();
    if (ids.includes(product.id)) return writeCompare(ids.filter((i) => i !== product.id));
    if (ids.length >= COMPARE_MAX) return toast(`You can compare up to ${COMPARE_MAX} products.`, "error");
    writeCompare([...ids, product.id]);
  };

  const addToCart = async () => {
    if (product.stock <= 0) {
      toast("This product is out of stock.", "error");
      return;
    }
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 })
      });
      const d = await r.json();
      if (r.status === 401) {
        // guest cart fallback (localStorage)
        const raw = localStorage.getItem("guest_cart");
        const items: { productId: number; qty: number }[] = raw ? JSON.parse(raw) : [];
        const found = items.find((i) => i.productId === product.id);
        if (found) found.qty = Math.min(found.qty + 1, product.stock);
        else items.push({ productId: product.id, qty: 1 });
        localStorage.setItem("guest_cart", JSON.stringify(items));
        window.dispatchEvent(new Event("cart-updated"));
        toast("Product added to cart successfully.");
        return;
      }
      if (!r.ok) {
        toast(d.error || "Could not add to cart.", "error");
        return;
      }
      window.dispatchEvent(new Event("cart-updated"));
      toast("Product added to cart successfully.");
    } catch {
      toast("Could not add to cart.", "error");
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/products/${product.id}`} className="relative block aspect-square overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        {product.stock <= 0 && (
          <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">Out of Stock</span>
        )}
        {product.stock > 0 && product.stock <= 10 && (
          <span className="absolute left-2 top-2 rounded bg-orange-500 px-2 py-1 text-xs font-bold text-white">
            Only {product.stock} left
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[#0A3161]">{product.category}</p>
        <Link href={`/products/${product.id}`} className="line-clamp-2 font-semibold hover:text-[#B31942]">
          {product.name}
        </Link>
        <p className="text-xs text-amber-500">{stars(product.rating)} <span className="text-gray-500">({product.rating.toFixed(1)}) · {product.sold} sold</span></p>
        <p className="mt-1 text-lg font-extrabold text-red-600">{formatVND(product.price)}</p>
        <p className={`text-xs font-medium ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
          {product.stock > 0 ? `In stock (${product.stock})` : "Out of Stock"}
        </p>
        <label className="mt-1 flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
          <input type="checkbox" checked={comparing} onChange={toggleCompare} /> ⚖ Compare
        </label>
        <div className="mt-2 flex gap-2">
          <Link href={`/products/${product.id}`} className="flex-1 rounded-lg border px-2 py-2 text-center text-xs font-semibold hover:bg-gray-50">
            View Details
          </Link>
          <button
            onClick={addToCart}
            disabled={product.stock <= 0}
            className="flex-1 rounded-lg bg-[#0A3161] px-2 py-2 text-xs font-semibold text-white hover:bg-[#B31942] disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
