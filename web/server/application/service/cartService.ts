// application.service — CartService: View/Add/Update/Remove/Clear cart. Works on a cartID (Hình 1).
// The cart rules (stock limit, merging lines) live in domain.cart.Cart; this service loads the cart, calls them and saves.
import { cartRepository } from "../../infrastructure/repository/cartRepository";
import { productRepository } from "../../infrastructure/repository/productRepository";
import type { Cart } from "../../domain/cart/cart";
import { DomainError } from "../../domain/domainError";
import { AppError } from "./appError";

function toDTO(cart: Cart) {
  return {
    items: cart.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      product: i.product,
      subtotal: i.calculateSubTotal()
    })),
    totalCount: cart.totalCount(),
    subtotal: cart.calculateTotal()
  };
}

async function loadCart(cartID: number): Promise<Cart> {
  const cart = await cartRepository.findById(cartID);
  if (!cart) throw new AppError(404, "Cart not found.");
  return cart;
}

/** Runs a cart rule; a rule that refuses becomes a 400 (or 404) response. */
function applyRule(rule: () => void) {
  try {
    rule();
  } catch (e) {
    if (e instanceof DomainError) throw new AppError(e.notFound ? 404 : 400, e.message);
    throw e;
  }
}

export const cartService = {
  /** The id of the user's cart, or null when the user has none yet. */
  async getCartId(userId: number): Promise<number | null> {
    return (await cartRepository.findByUserId(userId))?.id ?? null;
  },

  /** The id of the user's cart; a new empty cart is created on first use. */
  async getOrCreateCartId(userId: number): Promise<number> {
    return (await cartRepository.findOrCreateByUserId(userId)).id;
  },

  async getCart(cartID: number) {
    return toDTO(await loadCart(cartID));
  },

  async addItem(cartID: number, productID: unknown, qty: unknown) {
    const pid = Number(productID);
    const quantity = Math.max(1, Number(qty) || 1);
    if (!pid) throw new AppError(400, "Invalid product.");

    const product = await productRepository.findById(pid);
    if (!product) throw new AppError(404, "Product not found.");

    const cart = await loadCart(cartID);
    applyRule(() => cart.addItem(product, quantity));
    await cartRepository.save(cart);
    return toDTO(await loadCart(cartID)); // reload so new lines have their ids
  },

  async updateQuantity(cartID: number, productID: unknown, qty: unknown) {
    const pid = Number(productID);
    const quantity = Number(qty);
    if (!pid || !Number.isFinite(quantity) || quantity < 1) throw new AppError(400, "Invalid quantity.");

    const cart = await loadCart(cartID);
    applyRule(() => cart.updateQuantity(pid, quantity));
    await cartRepository.save(cart);
  },

  async removeItem(cartID: number, productID: unknown) {
    const cart = await loadCart(cartID);
    cart.removeItem(Number(productID));
    await cartRepository.save(cart);
  },

  async clear(cartID: number) {
    const cart = await loadCart(cartID);
    cart.clear();
    await cartRepository.save(cart);
  }
};
