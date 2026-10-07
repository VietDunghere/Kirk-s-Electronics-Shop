// application.service — Product use cases: Search Product, View Product Detail, home sections.
import { productRepository, type ProductFilter } from "../../infrastructure/repository/productRepository";
import { AppError } from "./appError";

export type ProductQuery = ProductFilter & { sort?: string; limit?: number };

export const productService = {
  async search(query: ProductQuery) {
    const { sort, limit, ...filter } = query;
    return productRepository.search(filter, sort || "newest", Math.min(limit ?? 100, 100));
  },

  async getDetail(id: number) {
    if (!id) throw new AppError(400, "Invalid product id.");
    const product = await productRepository.findById(id);
    if (!product) throw new AppError(404, "Product not found.");
    const related = await productRepository.findRelated(product, 4);
    return { product, related };
  },

  async getHomeSections() {
    const [featured, newest, bestSellers] = await Promise.all([
      productRepository.findFeatured(8),
      productRepository.findNewest(8),
      productRepository.findBestSelling(8)
    ]);
    return { featured, newest, bestSellers };
  }
};
