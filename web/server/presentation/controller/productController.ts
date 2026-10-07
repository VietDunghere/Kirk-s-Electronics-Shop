// presentation.controller — ProductController: Search Product, View Product Detail.
import { NextResponse } from "next/server";
import { productService } from "../../application/service/productService";
import { fail } from "./http";

export const productController = {
  /** Data for the home page (server component): featured, newest and best-selling products. */
  homePage() {
    return productService.getHomeSections();
  },

  async search(req: Request) {
    try {
      const { searchParams } = new URL(req.url);
      const products = await productService.search({
        q: (searchParams.get("q") || "").trim(),
        category: searchParams.get("category") || "",
        minPrice: Number(searchParams.get("minPrice") || 0),
        maxPrice: Number(searchParams.get("maxPrice") || 0),
        featured: searchParams.get("featured") === "1",
        sort: searchParams.get("sort") || "newest", // newest | price-asc | price-desc | name | popular
        limit: Number(searchParams.get("limit") || 100)
      });
      return NextResponse.json({ products });
    } catch (e) {
      return fail(e, "Failed to load products.");
    }
  },

  async viewDetail(rawId: string) {
    try {
      return NextResponse.json(await productService.getDetail(Number(rawId)));
    } catch (e) {
      return fail(e);
    }
  }
};
