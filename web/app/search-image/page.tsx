"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductDTO } from "@/lib/types";
import ProductGrid from "@/components/ProductGrid";
import { fileToSmallDataUrl, IMAGE_SEARCH_KEY } from "@/lib/clientImage";

type Result = { detected: { label: string; keywords: string[]; category: string | null }; products: ProductDTO[] };

export default function SearchImagePage() {
  const [photo, setPhoto] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const search = useCallback(async (dataUrl: string) => {
    setPhoto(dataUrl); setResult(null); setError(""); setBusy(true);
    try {
      const r = await fetch("/api/products/search-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl })
      });
      const d = await r.json();
      if (!r.ok) setError(d.error || "Image search failed.");
      else setResult(d);
    } catch {
      setError("Image search failed.");
    }
    setBusy(false);
  }, []);

  // the photo picked in the header is handed over through sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(IMAGE_SEARCH_KEY);
      if (saved) { sessionStorage.removeItem(IMAGE_SEARCH_KEY); search(saved); }
    } catch { /* storage unavailable: the customer can pick the photo again below */ }
  }, [search]);

  const pick = async (f: File | undefined) => {
    if (!f) return;
    try { search(await fileToSmallDataUrl(f)); } catch (e) { setError(e instanceof Error ? e.message : "Could not read the image."); }
    if (file.current) file.current.value = "";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Search by image</h1>
      <p className="mt-1 text-sm text-gray-500">Upload a photo of a product. The AI recognises it, then we look for it in the shop.</p>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Your photo" className="h-32 w-32 rounded-lg border object-cover" />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed text-xs text-gray-400">No photo yet</div>
        )}
        <div className="text-sm">
          <button onClick={() => file.current?.click()} disabled={busy}
            className="rounded-lg bg-[#0A3161] px-4 py-2 font-bold text-white hover:bg-[#B31942] disabled:opacity-60">
            {photo ? "Choose another photo" : "Choose a photo"}
          </button>
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {busy && <p className="mt-2 text-gray-500">Looking at your photo...</p>}
          {result && (
            <p className="mt-2">
              Looks like: <b>{result.detected.label}</b>
              {result.detected.category && <span className="text-gray-500"> · category {result.detected.category}</span>}
            </p>
          )}
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="mt-4">
          {result.products.length === 0 ? (
            <p className="rounded-xl border bg-white p-8 text-center text-gray-500">No similar products found in the shop.</p>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-500">{result.products.length} similar product(s)</p>
              <ProductGrid products={result.products.map((p) => ({ ...p, createdAt: String(p.createdAt) }))} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
