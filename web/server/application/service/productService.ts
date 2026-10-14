// application.service — Product use cases: Search Product, View Product Detail, home sections.
import { productRepository, type ProductFilter } from "../../infrastructure/repository/productRepository";
import { describeProductImage, VisionBusyError, type ImageGuess } from "../../infrastructure/llm/groqVision";
import { rankByImage } from "../../domain/product/imageMatch";
import { AppError } from "./appError";

export type ProductQuery = ProductFilter & { sort?: string; limit?: number };

const MAX_IMAGE_CHARS = 3_000_000; // ~2.2 MB of image data once decoded
const IMAGE_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export const productService = {
  async search(query: ProductQuery) {
    const { sort, limit, ...filter } = query;
    return productRepository.search(filter, sort || "newest", Math.min(limit ?? 250, 250));
  },

  /**
   * Search by image: a vision model says what is in the photo, then the REAL catalog is searched with those words.
   * `describe` is injectable so the ranking can be tested without calling the API.
   */
  async searchByImage(image: unknown, describe: (dataUrl: string) => Promise<ImageGuess | null> = describeProductImage) {
    if (typeof image !== "string" || !IMAGE_URL.test(image)) throw new AppError(400, "Please upload a JPG, PNG or WebP image.");
    if (image.length > MAX_IMAGE_CHARS) throw new AppError(400, "The image is too large. Please use a smaller photo.");
    if (!process.env.GROQ_API_KEY && describe === describeProductImage) {
      throw new AppError(503, "Image search needs the AI service. Set GROQ_API_KEY in web/.env and restart the server.");
    }

    let guess: ImageGuess | null;
    try {
      guess = await describe(image);
    } catch (e) {
      if (e instanceof VisionBusyError) throw new AppError(429, "The AI service is busy. Please wait a few seconds and try again.");
      throw e;
    }
    if (!guess) throw new AppError(502, "The AI service could not read this image. Please try another photo.");
    if (!guess.keywords.length) return { detected: guess, products: [] };

    const candidates = await productRepository.search({ keywords: guess.keywords }, "popular", 200);
    return { detected: guess, products: rankByImage(candidates, guess.keywords, guess.category, 12) };
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
