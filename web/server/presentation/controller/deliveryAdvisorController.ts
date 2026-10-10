// presentation.controller — DeliveryAdvisorController: AI delivery advice for the logged-in customer's cart.
import { NextResponse } from "next/server";
import { deliveryAdvisorService } from "../../application/service/deliveryAdvisorService";
import { fail, requireSession } from "./http";

export const deliveryAdvisorController = {
  async advise(req: Request) {
    try {
      const session = await requireSession("Please login before checkout.");
      const body = await req.json().catch(() => ({}));
      return NextResponse.json({ advice: await deliveryAdvisorService.advise(session.id, body) });
    } catch (e) {
      return fail(e, "Could not get delivery advice.");
    }
  }
};
