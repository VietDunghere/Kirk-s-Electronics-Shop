// application.service — CartService: View/Add/Update/Remove/Clear cart. Works on a cartID (Hình 1).
import { cartRepository } from "../../infrastructure/repository/cartRepository";
import { productRepository } from "../../infrastructure/repository/productRepository";
import type { Cart } from "../../domain/cart/cart";
import { hasEnoughStock, isInStock, stockLimitMessage } from "../../domain/product/product";
import { AppError } from "./appError";

function toDTO(cart: Cart) {
  return {
    items: cart.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      quantity: i.quantity,
      product: i.product,
      subtotal: i.subtotal()
    })),
    totalCount: cart.totalCount(),
    subtotal: cart.calculateSubtotal()
  };
}

async function loadCart(cartID: number): Promise<Cart> {
  const cart = await cartRepository.findById(cartID);
  if (!cart) throw new AppError(404, "Cart not found.");
  return cart;
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
    if (!isInStock(product)) throw new AppError(400, "This product is out of stock.");

    const cart = await loadCart(cartID);
    const existing = cart.items.find((i) => i.productId === pid);
    const newQty = (existing?.quantity ?? 0) + quantity;
    if (!hasEnoughStock(product, newQty)) throw new AppError(400, stockLimitMessage(product));

    if (existing) await cartRepository.updateItemQuantity(existing.id, newQty);
    else await cartRepository.addItem(cart.id, pid, quantity);
    return toDTO(await loadCart(cartID));
  },

  async updateQuantity(cartID: number, productID: unknown, qty: unknown) {
    const pid = Number(productID);
    const quantity = Number(qty);
    if (!pid || !Number.isFinite(quantity) || quantity < 1) throw new AppError(400, "Invalid quantity.");
    const product = await productRepository.findById(pid);
    if (!product) throw new AppError(404, "Product not found.");
    if (!hasEnoughStock(product, quantity)) throw new AppError(400, stockLimitMessage(product));
    const cart = await loadCart(cartID);
    const item = await cartRepository.findItem(cart.id, pid);
    if (!item) throw new AppError(404, "Item not in cart.");
    await cartRepository.updateItemQuantity(item.id, quantity);
  },

  async removeItem(cartID: number, productID: unknown) {
    const cart = await loadCart(cartID);
    await cartRepository.removeItem(cart.id, Number(productID));
  },

  async clear(cartID: number) {
    const cart = await loadCart(cartID);
    cart.clear();
    await cartRepository.save(cart);
  }
};
