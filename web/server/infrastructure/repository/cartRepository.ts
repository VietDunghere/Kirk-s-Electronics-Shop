// infrastructure.repository — CartRepository (tables Cart, CartItem): findById / save per Hình 1. Prisma calls only.
import { prisma } from "../database/prisma";
import { Cart } from "../../domain/cart/cart";

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

  /** Persists the cart in one transaction: lines removed from the cart are deleted, changed lines get their quantity, new lines (id 0) are created. */
  async save(cart: Cart): Promise<Cart> {
    const saved = cart.items.filter((i) => i.id > 0);
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId: cart.id, id: { notIn: saved.map((i) => i.id) } } }),
      ...saved.map((i) => prisma.cartItem.update({ where: { id: i.id }, data: { quantity: i.quantity } })),
      ...cart.items
        .filter((i) => i.id === 0)
        .map((i) => prisma.cartItem.create({ data: { cartId: cart.id, productId: i.productId, quantity: i.quantity } }))
    ]);
    return cart;
  }
};
