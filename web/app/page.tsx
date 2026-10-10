import Link from "next/link";
import { productController } from "@/server/presentation/controller/productController";
import HeroSlider from "@/components/HeroSlider";
import ProductGrid from "@/components/ProductGrid";
import { CATEGORIES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { featured, newest, bestSellers } = await productController.homePage();
  const ser = (p: (typeof featured)[number]) => ({ ...p, createdAt: p.createdAt.toISOString() });

  return (
    <div className="space-y-10">
      {/* Hero slideshow — store banner + drone / autonomous-car delivery ads */}
      <HeroSlider />

      {/* Categories */}
      <section>
        <h2 className="mb-3 text-xl font-bold">Shop by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link key={c} href={`/products?category=${encodeURIComponent(c)}`}
              className="rounded-xl border bg-white p-4 text-center font-semibold shadow-sm hover:border-[#B31942] hover:text-[#B31942]">
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Featured products</h2>
          <Link href="/products" className="text-sm font-semibold text-[#0A3161] hover:underline">View all →</Link>
        </div>
        <ProductGrid products={featured.map(ser)} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">New products</h2>
        <ProductGrid products={newest.map(ser)} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Best-selling products</h2>
        <ProductGrid products={bestSellers.map(ser)} />
      </section>
    </div>
  );
}
