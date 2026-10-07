"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductDTO } from "@/lib/types";
import ProductGrid from "@/components/ProductGrid";
import { CATEGORIES } from "@/lib/utils";

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get("q") || "";
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [category, setCategory] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");

  const run = useCallback(async () => {
    if (!q.trim()) { setProducts([]); setSearched(false); return; }
    setLoading(true);
    const p = new URLSearchParams({ q });
    if (category) p.set("category", category);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    if (sort) p.set("sort", sort);
    const r = await fetch(`/api/products?${p.toString()}`);
    const d = await r.json();
    setProducts(d.products ?? []);
    setSearched(true);
    setLoading(false);
  }, [q, category, minPrice, maxPrice, sort]);

  useEffect(() => { run(); }, [run]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Search results {q && <span className="text-[#0A3161]">for “{q}”</span>}</h1>
      {!q.trim() ? (
        <div className="mt-6 rounded-xl border bg-white p-10 text-center text-gray-500">
          Please enter a product keyword.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3 rounded-xl border bg-white p-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price" inputMode="numeric" className="w-36 rounded-lg border px-3 py-2 text-sm" />
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" inputMode="numeric" className="w-36 rounded-lg border px-3 py-2 text-sm" />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low → high</option>
              <option value="price-desc">Price: high → low</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          <p className="mt-3 text-sm text-gray-500">{loading ? "Searching..." : searched ? `${products.length} result(s)` : ""}</p>
          <div className="mt-2">
            {loading ? <p className="py-10 text-center text-gray-500">Loading...</p> : <ProductGrid products={products} />}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center">Loading...</p>}>
      <SearchInner />
    </Suspense>
  );
}
