// infrastructure.repository — OrderRepository (tables Order, OrderItem): findById / save per Hình 1. Prisma calls only.
import { prisma } from "../database/prisma";
import { Order } from "../../domain/order/order";

const withOwner = { items: true, user: { select: { fullName: true, email: true } } } as const;

export const orderRepository = {
  async findByUser(userId: number): Promise<Order[]> {
    const rows = await prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, include: { items: true } });
    return rows.map((r) => Order.fromRecord(r));
  },

  async findById(id: number): Promise<Order | null> {
    const row = await prisma.order.findUnique({ where: { id }, include: withOwner });
    return row ? Order.fromRecord(row) : null;
  },

  async findByCode(orderCode: string): Promise<Order | null> {
    const row = await prisma.order.findUnique({ where: { orderCode }, include: withOwner });
    return row ? Order.fromRecord(row) : null;
  },

  async lastId(): Promise<number> {
    const last = await prisma.order.findFirst({ orderBy: { id: "desc" }, select: { id: true } });
    return last?.id ?? 0;
  },

  /**
   * One transaction: create the order with its items, decrement stock / bump sold, and clear the cart it came from
   * (so a failure can never leave stock reduced but the cart full).
   */
  save(order: Order): Promise<Order> {
    return prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderCode: order.orderCode,
          userId: order.userId,
          totalAmount: order.totalAmount,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          deliveryMethod: order.deliveryMethod ?? "STANDARD",
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          shippingFullName: order.shippingFullName,
          shippingPhone: order.shippingPhone,
          shippingAddress: order.shippingAddress,
          city: order.city,
          district: order.district,
          ward: order.ward,
          note: order.note,
          items: {
            create: order.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              price: i.price,
              quantity: i.quantity
            }))
          }
        },
        include: { items: true }
      });
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity }, sold: { increment: item.quantity } }
        });
      }
      if (order.sourceCartId) await tx.cartItem.deleteMany({ where: { cartId: order.sourceCartId } });
      return Order.fromRecord(created);
    });
  }
};
