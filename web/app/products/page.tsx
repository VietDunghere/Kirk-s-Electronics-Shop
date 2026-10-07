"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import ProductGrid from "@/components/ProductGrid";
import { CATEGORIES } from "@/lib/utils";

function ProductsInner() {
  const sp = useSearchParams();
  const initialCat = sp.get("category") || "";
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(initialCat);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (minPrice) p.set("minPrice", String(Number(minPrice) * 1));
    if (maxPrice) p.set("maxPrice", String(Number(maxPrice) * 1));
    if (sort) p.set("sort", sort);
    const r = await fetch(`/api/products?${p.toString()}`);
    const d = await r.json();
    setProducts(d.products ?? []);
    setLoading(false);
  }, [category, minPrice, maxPrice, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCategory(sp.get("category") || ""); }, [sp]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>
      <div className="mt-4 flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price (VND)" inputMode="numeric"
          className="w-40 rounded-lg border px-3 py-2 text-sm" />
        <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price (VND)" inputMode="numeric"
          className="w-40 rounded-lg border px-3 py-2 text-sm" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="newest">Newest</option>
          <option value="popular">Best selling</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div className="mt-4">
        {loading ? <p className="py-10 text-center text-gray-500">Loading products...</p> : <ProductGrid products={products} />}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-gray-500">Loading...</p>}>
      <ProductsInner />
    </Suspense>
  );
}
