"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import { formatVND } from "@/lib/utils";
import { useToast } from "./Toast";
import { COMPARE_MAX, readCompare, writeCompare, readWishlist, toggleWishlist } from "@/lib/clientCart";

export function stars(rating: number) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function ProductCard({ product }: { product: ProductDTO }) {
  const { toast } = useToast();
  const router = useRouter();
  const [comparing, setComparing] = useState(false);
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);
  useEffect(() => {
    const sync = () => setComparing(readCompare().includes(product.id));
    sync();
    window.addEventListener("compare-updated", sync);
    return () => window.removeEventListener("compare-updated", sync);
  }, [product.id]);
  useEffect(() => {
    const syncWish = () => setWished(readWishlist().includes(product.id));
    syncWish();
    window.addEventListener("wishlist-updated", syncWish);
    window.addEventListener("storage", syncWish);
    return () => {
      window.removeEventListener("wishlist-updated", syncWish);
      window.removeEventListener("storage", syncWish);
    };
  }, [product.id]);
  // Clear the "Added" confirmation if the card unmounts / product changes.
  useEffect(() => {
    setAdded(false);
  }, [product.id]);

  const toggleWish = (e: React.MouseEvent) => {
    // Heart sits inside the image link: stop the navigation.
    e.preventDefault();
    e.stopPropagation();
    const next = toggleWishlist(product.id);
    setWished(next.includes(product.id));
  };

  const toggleCompare = () => {
    const ids = readCompare();
    if (ids.includes(product.id)) return writeCompare(ids.filter((i) => i !== product.id));
    if (ids.length >= COMPARE_MAX) return toast(`You can compare up to ${COMPARE_MAX} products.`, "error");
    writeCompare([...ids, product.id]);
  };

  const flashAdded = () => {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
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
        flashAdded();
        return;
      }
      if (!r.ok) {
        toast(d.error || "Could not add to cart.", "error");
        return;
      }
      window.dispatchEvent(new Event("cart-updated"));
      toast("Product added to cart successfully.");
      flashAdded();
    } catch {
      toast("Could not add to cart.", "error");
    }
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_1px_2px_rgba(10,49,97,0.05)] backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[#0A3161]/20 hover:shadow-[0_24px_40px_-20px_rgba(10,49,97,0.40)] focus-within:border-[#0A3161]/30 focus-within:shadow-[0_24px_40px_-20px_rgba(10,49,97,0.40)]">
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100"
        aria-label={`View details of ${product.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          loading="lazy"
        />
        {product.stock <= 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white shadow-sm">Out of Stock</span>
        )}
        {product.stock > 0 && product.stock <= 10 && (
          <span className="absolute left-2 top-2 rounded-md border border-orange-200/80 bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700 shadow-sm">
            Only {product.stock} left
          </span>
        )}
        <button
          type="button"
          onClick={toggleWish}
          onKeyDown={(e) => {
            // Space on a button inside a link: prevent page scroll + link activation.
            if (e.key === " ") e.stopPropagation();
          }}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          title={wished ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3161] ${
            wished
              ? "bg-[#B31942] text-white hover:bg-[#8A122E]"
              : "bg-white/90 text-slate-500 hover:text-[#B31942]"
          }`}
        >
          <svg viewBox="0 0 20 20" fill={wished ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 16.5C6 13 3 10.2 3 7.1 3 5 4.6 3.5 6.6 3.5c1.3 0 2.5.7 3.4 1.9.9-1.2 2.1-1.9 3.4-1.9 2 0 3.6 1.5 3.6 3.6 0 3.1-3 5.9-7 9.4z" />
          </svg>
        </button>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#0A3161]/80">{product.category}</p>
        <Link href={`/products/${product.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug hover:text-[#B31942] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3161]">
          {product.name}
        </Link>
        <p className="text-xs text-amber-600" aria-label={`Rated ${product.rating.toFixed(1)} out of 5, ${product.sold} sold`}>
          {stars(product.rating)} <span className="text-slate-600">({product.rating.toFixed(1)}) · {product.sold} sold</span>
        </p>
        <p className="mt-1 text-lg font-extrabold tracking-tight text-[#B31942]">{formatVND(product.price)}</p>
        <p className={`text-xs font-medium ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
          {product.stock > 0 ? `In stock (${product.stock})` : "Out of Stock"}
        </p>
        <label className="mt-1 flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
          <input type="checkbox" checked={comparing} onChange={toggleCompare} className="accent-[#0A3161]" /> Compare
        </label>
        <div className="mt-2 flex gap-2 pt-1">
          <Link href={`/products/${product.id}`} className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-700 hover:border-[#0A3161]/30 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3161]">
            View Details
          </Link>
          <button
            onClick={addToCart}
            disabled={product.stock <= 0}
            aria-live="polite"
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A3161] ${
              added
                ? "bg-emerald-600"
                : "bg-gradient-to-r from-[#0A3161] to-[#1A4A8A] hover:from-[#0A3161] hover:to-[#B31942] disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-300"
            }`}
          >
            {added ? (
              <>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l4 4 8-9" />
                </svg>
                Added
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-3.5 w-3.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 3.5h2.4l2.3 11h9.4l2-8H6" />
                  <circle cx="9" cy="16.5" r="1.3" fill="currentColor" stroke="none" />
                  <circle cx="15.5" cy="16.5" r="1.3" fill="currentColor" stroke="none" />
                </svg>
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
