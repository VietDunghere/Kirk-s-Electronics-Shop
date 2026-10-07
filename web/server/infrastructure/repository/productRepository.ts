// infrastructure.repository — Product persistence. Prisma calls only, no business rules.
import { prisma } from "../database/prisma";
import type { Product } from "../../domain/product/product";

export type ProductFilter = {
  keywords?: string[]; // matched against name / description / category (OR)
  q?: string; // single phrase matched against name / description / category
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
};

export type ProductSort = "newest" | "price-asc" | "price-desc" | "name" | "popular" | "rating";

function orderByFor(sort?: string): Record<string, "asc" | "desc"> {
  if (sort === "price-asc") return { price: "asc" };
  if (sort === "price-desc") return { price: "desc" };
  if (sort === "name") return { name: "asc" };
  if (sort === "popular") return { sold: "desc" };
  if (sort === "rating") return { rating: "desc" };
  return { createdAt: "desc" };
}

function whereFor(f: ProductFilter) {
  const and: Record<string, unknown>[] = [];
  if (f.q) {
    and.push({ OR: [{ name: { contains: f.q } }, { description: { contains: f.q } }, { category: { contains: f.q } }] });
  }
  if (f.keywords?.length) {
    and.push({
      OR: f.keywords.flatMap((w) => [
        { name: { contains: w } },
        { description: { contains: w } },
        { category: { contains: w } }
      ])
    });
  }
  if (f.category) and.push({ category: f.category });
  if (f.minPrice && f.minPrice > 0) and.push({ price: { gte: f.minPrice } });
  if (f.maxPrice && f.maxPrice > 0) and.push({ price: { lte: f.maxPrice } });
  if (f.featured) and.push({ isFeatured: true });
  return and.length ? { AND: and } : undefined;
}

export const productRepository = {
  findById(id: number): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  },

  search(filter: ProductFilter, sort: string | undefined, take: number): Promise<Product[]> {
    return prisma.product.findMany({ where: whereFor(filter), orderBy: orderByFor(sort), take });
  },

  findRelated(product: Pick<Product, "id" | "category">, take: number): Promise<Product[]> {
    return prisma.product.findMany({ where: { category: product.category, id: { not: product.id } }, take });
  },

  findFeatured(take: number): Promise<Product[]> {
    return prisma.product.findMany({ where: { isFeatured: true }, take });
  },

  findNewest(take: number): Promise<Product[]> {
    return prisma.product.findMany({ orderBy: { createdAt: "desc" }, take });
  },

  findBestSelling(take: number): Promise<Product[]> {
    return prisma.product.findMany({ orderBy: { sold: "desc" }, take });
  }
};
