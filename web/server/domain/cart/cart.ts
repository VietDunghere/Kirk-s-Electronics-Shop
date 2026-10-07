// domain.cart — Cart and CartItem with the money rules of a cart (no framework / database imports).
import type { Product } from "../product/product";

export type CartRecord = {
  id: number;
  userId: number;
  items: { id: number; cartId: number; productId: number; quantity: number; product: Product }[];
};

export class CartItem {
  constructor(
    public id: number,
    public cartId: number,
    public productId: number,
    public quantity: number,
    public product: Product
  ) {}

  subtotal(): number {
    return this.quantity * this.product.price;
  }
}

export class Cart {
  constructor(public id: number, public userId: number, public items: CartItem[]) {}

  static fromRecord(r: CartRecord): Cart {
    return new Cart(
      r.id,
      r.userId,
      r.items.map((i) => new CartItem(i.id, i.cartId, i.productId, i.quantity, i.product))
    );
  }

  calculateSubtotal(): number {
    return this.items.reduce((sum, item) => sum + item.subtotal(), 0);
  }

  totalCount(): number {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Slide 05 step 9: "Cart is cleared". CartRepository.save(cart) persists it. */
  clear(): void {
    this.items = [];
  }
}
