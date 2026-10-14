import Link from "next/link";
import { productController } from "@/server/presentation/controller/productController";
import HeroSlider from "@/components/HeroSlider";
import ProductGrid from "@/components/ProductGrid";
import BenefitsBar from "@/components/BenefitsBar";
import CategoryGrid from "@/components/CategoryGrid";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import { CATEGORIES } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { featured, newest, bestSellers } = await productController.homePage();
  const ser = (p: (typeof featured)[number]) => ({ ...p, createdAt: p.createdAt.toISOString() });

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Hero slideshow — store banner + drone / autonomous-car delivery ads */}
      <Reveal>
        <div className="rounded-2xl shadow-[0_24px_48px_-24px_rgba(10,49,97,0.35)] ring-1 ring-[#0A3161]/10">
          <HeroSlider />
        </div>
      </Reveal>

      {/* Shopping benefits — neutral wording, demo capabilities only */}
      <BenefitsBar />

      {/* Categories */}
      <section>
        <SectionHeading eyebrow="Browse" title="Shop by category" />
        <CategoryGrid categories={CATEGORIES} />
      </section>

      <section>
        <SectionHeading
          eyebrow="Hand-picked"
          title="Featured products"
          action={<Link href="/products" className="shrink-0 rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-semibold text-[#0A3161] hover:border-[#B31942]/40 hover:text-[#B31942]">View all →</Link>}
        />
        <Reveal delay={80}>
          <ProductGrid products={featured.map(ser)} />
        </Reveal>
      </section>

      <section>
        <SectionHeading eyebrow="Fresh arrivals" title="New products" />
        <Reveal delay={80}>
          <ProductGrid products={newest.map(ser)} />
        </Reveal>
      </section>

      <section>
        <SectionHeading eyebrow="Customer favourites" title="Best-selling products" />
        <Reveal delay={80}>
          <ProductGrid products={bestSellers.map(ser)} />
        </Reveal>
      </section>
    </div>
  );
}
