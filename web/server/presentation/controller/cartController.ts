// presentation.controller — CartController: viewCart, addToCart, updateQuantity, removeItem, clearCart (login required).
// The logged-in user's cart is looked up first; the service then works on its cartID.
import { NextResponse } from "next/server";
import { cartService } from "../../application/service/cartService";
import { fail, requireSession } from "./http";

export const cartController = {
  async viewCart() {
    try {
      const session = await requireSession();
      const cartId = await cartService.getOrCreateCartId(session.id);
      return NextResponse.json({ cart: await cartService.getCart(cartId) });
    } catch (e) {
      return fail(e);
    }
  },

  async addToCart(req: Request) {
    try {
      const session = await requireSession();
      const { productId, quantity } = await req.json();
      const cartId = await cartService.getOrCreateCartId(session.id);
      const cart = await cartService.addItem(cartId, productId, quantity);
      return NextResponse.json({ message: "Product added to cart successfully.", cart });
    } catch (e) {
      return fail(e, "Could not add to cart.");
    }
  },

  async clearCart() {
    try {
      const session = await requireSession();
      const cartId = await cartService.getOrCreateCartId(session.id);
      await cartService.clear(cartId);
      return NextResponse.json({ message: "Cart cleared." });
    } catch (e) {
      return fail(e);
    }
  },

  async updateQuantity(req: Request, productId: string) {
    try {
      const session = await requireSession();
      const { quantity } = await req.json();
      const cartId = (await cartService.getCartId(session.id)) ?? 0;
      await cartService.updateQuantity(cartId, productId, quantity);
      return NextResponse.json({ message: "Cart updated." });
    } catch (e) {
      return fail(e);
    }
  },

  async removeItem(productId: string) {
    try {
      const session = await requireSession();
      const cartId = (await cartService.getCartId(session.id)) ?? 0;
      await cartService.removeItem(cartId, productId);
      return NextResponse.json({ message: "Product removed from cart." });
    } catch (e) {
      return fail(e);
    }
  }
};
