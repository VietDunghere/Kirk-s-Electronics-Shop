import Link from "next/link";
import { productController } from "@/server/presentation/controller/productController";
import ProductGrid from "@/components/ProductGrid";
import { CATEGORIES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { featured, newest, bestSellers } = await productController.homePage();
  const ser = (p: (typeof featured)[number]) => ({ ...p, createdAt: p.createdAt.toISOString() });

  return (
    <div className="space-y-10">
      {/* Hero — US flag colors: Old Glory Blue + Old Glory Red */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A3161] via-[#B31942] to-[#0A3161] text-white">
        <div className="grid gap-6 p-8 sm:grid-cols-2 sm:p-12">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-5xl">Everything tech at Kirk&apos;s Ecommerce Shop.</h1>
            <p className="mt-3 text-white/90">Laptops, phones, gaming gear & accessories — simulated checkout with card or e-wallet.</p>
            <div className="mt-6 flex gap-3">
              <Link href="/products" className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#0A3161] hover:bg-red-50">
                Shop products
              </Link>
              <Link href="/track-order" className="rounded-lg border border-white/40 px-5 py-3 text-sm font-bold hover:bg-white/10">
                Track order
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/80">Demo login: customer@example.com / 123456 · Test card 4111 1111 1111 1111</p>
          </div>
          <div className="hidden items-center justify-center sm:flex">
            <div className="grid grid-cols-2 gap-3">
              {featured.slice(0, 4).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={p.image} alt={p.name} className="h-32 w-32 rounded-xl object-cover shadow-lg" />
              ))}
            </div>
          </div>
        </div>
      </section>

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
