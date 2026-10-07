// infrastructure.repository — CartRepository (tables Cart, CartItem): findById / save per Hình 1. Prisma calls only.
import { prisma } from "../database/prisma";
import { Cart, CartItem } from "../../domain/cart/cart";

const withItems = { items: { include: { product: true } } } as const;

export const cartRepository = {
  async findById(id: number): Promise<Cart | null> {
    const row = await prisma.cart.findUnique({ where: { id }, include: withItems });
    return row ? Cart.fromRecord(row) : null;
  },

  async findByUserId(userId: number): Promise<Cart | null> {
    const row = await prisma.cart.findUnique({ where: { userId }, include: withItems });
    return row ? Cart.fromRecord(row) : null;
  },

  async findOrCreateByUserId(userId: number): Promise<Cart> {
    const row =
      (await prisma.cart.findUnique({ where: { userId }, include: withItems })) ??
      (await prisma.cart.create({ data: { userId }, include: withItems }));
    return Cart.fromRecord(row);
  },

  async findItem(cartId: number, productId: number): Promise<CartItem | null> {
    const i = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
      include: { product: true }
    });
    return i ? new CartItem(i.id, i.cartId, i.productId, i.quantity, i.product) : null;
  },

  /** Persists the cart: items no longer in the cart are deleted, the others get their quantity. */
  async save(cart: Cart): Promise<Cart> {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId: cart.id, id: { notIn: cart.items.map((i) => i.id) } } }),
      ...cart.items.map((i) => prisma.cartItem.update({ where: { id: i.id }, data: { quantity: i.quantity } }))
    ]);
    return cart;
  },

  addItem(cartId: number, productId: number, quantity: number) {
    return prisma.cartItem.create({ data: { cartId, productId, quantity } });
  },

  updateItemQuantity(itemId: number, quantity: number) {
    return prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  },

  removeItem(cartId: number, productId: number) {
    return prisma.cartItem.deleteMany({ where: { cartId, productId } });
  }
};
