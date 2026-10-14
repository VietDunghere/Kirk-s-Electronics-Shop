// domain.cart — Cart and CartItem with the rules of a cart: add / remove / change quantity, totals (Hình 1).
// No framework / database imports: CartRepository.save(cart) persists whatever these methods changed.
import type { Product } from "../product/product";
import { hasEnoughStock, isInStock, stockLimitMessage } from "../product/product";
import { DomainError } from "../domainError";

export type CartRecord = {
  id: number;
  userId: number;
  items: { id: number; cartId: number; productId: number; quantity: number; product: Product }[];
};

export class CartItem {
  constructor(
    public id: number, // 0 = not saved yet
    public cartId: number,
    public productId: number,
    public quantity: number,
    public product: Product
  ) {}

  calculateSubTotal(): number {
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

  /** Adds `quantity` of the product; merges with the line already in the cart. Throws when out of stock or over the stock limit. */
  addItem(product: Product, quantity: number): void {
    if (!isInStock(product)) throw new DomainError("This product is out of stock.");
    const existing = this.items.find((i) => i.productId === product.id);
    const total = (existing?.quantity ?? 0) + quantity;
    if (!hasEnoughStock(product, total)) throw new DomainError(stockLimitMessage(product));
    if (existing) {
      existing.quantity = total;
      existing.product = product;
    } else {
      this.items.push(new CartItem(0, this.id, product.id, quantity, product));
    }
  }

  removeItem(productID: number): void {
    this.items = this.items.filter((i) => i.productId !== productID);
  }

  updateQuantity(productID: number, quantity: number): void {
    const item = this.items.find((i) => i.productId === productID);
    if (!item) throw new DomainError("Item not in cart.", true);
    if (!hasEnoughStock(item.product, quantity)) throw new DomainError(stockLimitMessage(item.product));
    item.quantity = quantity;
  }

  /** Sum of the line subtotals. */
  calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + item.calculateSubTotal(), 0);
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
