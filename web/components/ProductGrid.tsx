import type { ProductDTO } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products }: { products: ProductDTO[] }) {
  if (!products.length) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
        No products found.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
