// application.service — Order use cases: My Orders, Order Detail (owner only), Track Order by code (getStatus).
import { orderRepository } from "../../infrastructure/repository/orderRepository";
import { AppError } from "./appError";

export const orderService = {
  listMine(userId: number) {
    return orderRepository.findByUser(userId);
  },

  async getForOwner(userId: number, id: number) {
    if (!id) throw new AppError(400, "Invalid order.");
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, "Order not found.");
    if (order.userId !== userId) throw new AppError(403, "You do not have permission to view this order.");
    return order;
  },

  async getStatus(rawCode: string) {
    const code = decodeURIComponent(rawCode || "").trim().toUpperCase();
    if (!code) throw new AppError(404, "Order not found.");
    const order = await orderRepository.findByCode(code);
    if (!order) throw new AppError(404, "Order not found.");
    return order;
  }
};
