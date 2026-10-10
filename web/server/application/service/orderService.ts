// application.service — Order use cases: My Orders, Order Detail (owner only), Track Order by code (getStatus).
// Drone / autonomous-car orders get a simulated delivery tracking (see domain/order/delivery.ts).
import { orderRepository } from "../../infrastructure/repository/orderRepository";
import type { Order } from "../../domain/order/order";
import { computeTracking } from "../../domain/order/delivery";
import { AppError } from "./appError";

function withTracking(order: Order) {
  const tracking = computeTracking(order);
  return { ...order, orderStatus: tracking?.status ?? order.orderStatus, tracking };
}

export const orderService = {
  async listMine(userId: number) {
    return (await orderRepository.findByUser(userId)).map(withTracking);
  },

  async getForOwner(userId: number, id: number) {
    if (!id) throw new AppError(400, "Invalid order.");
    const order = await orderRepository.findById(id);
    if (!order) throw new AppError(404, "Order not found.");
    if (order.userId !== userId) throw new AppError(403, "You do not have permission to view this order.");
    return withTracking(order);
  },

  async getStatus(rawCode: string) {
    const code = decodeURIComponent(rawCode || "").trim().toUpperCase();
    if (!code) throw new AppError(404, "Order not found.");
    const order = await orderRepository.findByCode(code);
    if (!order) throw new AppError(404, "Order not found.");
    return withTracking(order);
  }
};
