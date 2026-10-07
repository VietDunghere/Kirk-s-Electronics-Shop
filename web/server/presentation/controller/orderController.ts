// presentation.controller — OrderController: My Orders, Order Detail (owner only), Track Order.
import { NextResponse } from "next/server";
import { orderService } from "../../application/service/orderService";
import { fail, requireSession } from "./http";

export const orderController = {
  async listMine() {
    try {
      const session = requireSession();
      return NextResponse.json({ orders: await orderService.listMine(session.id) });
    } catch (e) {
      return fail(e);
    }
  },

  // Private: order detail — only the owner can view.
  async detail(rawId: string) {
    try {
      const session = requireSession();
      return NextResponse.json({ order: await orderService.getForOwner(session.id, Number(rawId)) });
    } catch (e) {
      return fail(e);
    }
  },

  // Public: track any order by its orderCode (Track Order page / demo).
  async trackOrder(rawCode: string) {
    try {
      return NextResponse.json({ order: await orderService.getStatus(rawCode) });
    } catch (e) {
      return fail(e);
    }
  }
};
