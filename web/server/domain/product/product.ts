// domain.product — Product entity and its stock rules (no framework / database imports).
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  rating: number;
  sold: number;
  isNew: boolean;
  isFeatured: boolean;
  createdAt: Date;
}

export function isInStock(product: Pick<Product, "stock">): boolean {
  return product.stock > 0;
}

export function hasEnoughStock(product: Pick<Product, "stock">, quantity: number): boolean {
  return quantity <= product.stock;
}

export function stockLimitMessage(product: Pick<Product, "stock">): string {
  return `Only ${product.stock} item(s) available in stock.`;
}
