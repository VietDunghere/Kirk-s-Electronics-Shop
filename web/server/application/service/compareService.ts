// application.service — CompareService: "AI compares 2-3 products" for a customer's need.
// The table and the best-value pick are computed from the real products; the LLM only writes the verdict
// (fallback: a rule-based verdict), so it can never invent a spec or a price.
import { productRepository } from "../../infrastructure/repository/productRepository";
import { askLLM } from "../../infrastructure/llm/groqClient";
import type { Product } from "../../domain/product/product";
import { AppError } from "./appError";

export type CompareColumn = {
  id: number;
  name: string;
  image: string;
  category: string;
  price: number;
  rating: number;
  sold: number;
  stock: number;
  description: string;
};

export type CompareResult = {
  products: CompareColumn[];
  best: { cheapest: number; topRated: number; bestSeller: number; bestValue: number };
  verdict: string;
  usedAI: boolean;
};

const MIN = 2;
const MAX = 3;

/** Value for money: quality (rating, popularity) weighed against how expensive the product is in the set. */
function valueScores(products: Product[]): Map<number, number> {
  const maxPrice = Math.max(...products.map((p) => p.price));
  const maxSold = Math.max(...products.map((p) => p.sold), 1);
  return new Map(
    products.map((p) => [p.id, 0.4 * (p.rating / 5) + 0.3 * (1 - p.price / maxPrice) + 0.3 * (p.sold / maxSold)])
  );
}

const vnd = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n)}đ`;

export const compareService = {
  async compare(rawIds: unknown, rawNeed: unknown): Promise<CompareResult> {
    const ids = Array.from(new Set((Array.isArray(rawIds) ? rawIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0)));
    if (ids.length < MIN || ids.length > MAX) throw new AppError(400, `Please choose ${MIN} to ${MAX} products to compare.`);
    const found = await Promise.all(ids.map((id) => productRepository.findById(id)));
    if (found.some((p) => !p)) throw new AppError(404, "Product not found.");
    const products = found as Product[];
    const need = typeof rawNeed === "string" ? rawNeed.trim().slice(0, 200) : "";

    const pick = (better: (a: Product, b: Product) => boolean) => products.reduce((a, b) => (better(b, a) ? b : a)).id;
    const scores = valueScores(products);
    const best = {
      cheapest: pick((a, b) => a.price < b.price),
      topRated: pick((a, b) => a.rating > b.rating),
      bestSeller: pick((a, b) => a.sold > b.sold),
      bestValue: pick((a, b) => (scores.get(a.id) ?? 0) > (scores.get(b.id) ?? 0))
    };
    const nameOf = (id: number) => products.find((p) => p.id === id)!.name;

    const fallback =
      `Rẻ nhất: ${nameOf(best.cheapest)}. Đánh giá cao nhất: ${nameOf(best.topRated)}. Bán chạy nhất: ${nameOf(best.bestSeller)}. ` +
      `Cân bằng giữa giá và chất lượng, mình chọn ${nameOf(best.bestValue)}.` +
      (need ? ` (Nhu cầu "${need}": xem mô tả từng sản phẩm để chọn đúng.)` : "");

    const facts = products.map((p) => ({
      ten: p.name,
      gia: vnd(p.price),
      danhGia: p.rating,
      daBan: p.sold,
      conHang: p.stock,
      moTa: p.description.slice(0, 300)
    }));
    const text = await askLLM(
      "Bạn là tư vấn viên của Kirk's Ecommerce Shop. So sánh các sản phẩm trong JSON cho nhu cầu của khách. " +
        "Viết tiếng Việt, tối đa 5 câu: nêu điểm mạnh chính của từng món, rồi kết luận nên chọn món nào cho nhu cầu đó. " +
        "Chỉ dùng thông tin trong JSON, không bịa thông số. Gọi sản phẩm bằng đúng tên đầy đủ.",
      JSON.stringify({ nhuCau: need || "không nêu, hãy tư vấn chung", sanPham: facts }),
      500
    );

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        category: p.category,
        price: p.price,
        rating: p.rating,
        sold: p.sold,
        stock: p.stock,
        description: p.description
      })),
      best,
      verdict: text ?? fallback,
      usedAI: !!text
    };
  }
};
