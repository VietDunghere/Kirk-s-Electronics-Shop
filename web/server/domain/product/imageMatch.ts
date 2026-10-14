// domain.product — ranks real products against the words found in a customer's photo. Pure rule, no I/O.
import type { Product } from "./product";

type Matchable = Pick<Product, "name" | "description" | "category" | "sold" | "stock">;

/**
 * Score of a product for a list of keywords: a hit in the name counts most, then the category, then the description.
 * The category the vision model named adds a bonus. Out-of-stock products are pushed down but not hidden.
 */
export function imageMatchScore(product: Matchable, keywords: string[], category: string | null): number {
  const name = product.name.toLowerCase();
  const desc = product.description.toLowerCase();
  const cat = product.category.toLowerCase();
  let score = 0;
  for (const k of keywords) {
    if (name.includes(k)) score += 3;
    else if (cat.includes(k)) score += 2;
    else if (desc.includes(k)) score += 1;
  }
  if (category && product.category === category) score += 2;
  if (score > 0 && product.stock <= 0) score -= 1;
  return score;
}

const MIN_SCORE = 2; // a single word found only in the description is not enough

/** Products that reach MIN_SCORE, best first (ties: more sold first). */
export function rankByImage<T extends Matchable>(products: T[], keywords: string[], category: string | null, limit: number): T[] {
  return products
    .map((p) => ({ p, score: imageMatchScore(p, keywords, category) }))
    .filter((x) => x.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || b.p.sold - a.p.sold)
    .slice(0, limit)
    .map((x) => x.p);
}
