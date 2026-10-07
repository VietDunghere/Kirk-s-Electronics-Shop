// presentation.controller — CheckoutController: Check out (POST /api/orders) -> CheckoutService.checkout.
import { NextResponse } from "next/server";
import { cartService } from "../../application/service/cartService";
import { checkoutService, type CheckoutInput } from "../../application/service/checkoutService";
import { fail, requireSession } from "./http";

export const checkoutController = {
  async checkout(req: Request) {
    try {
      const session = requireSession("Please login before checkout.");
      const input = (await req.json()) as CheckoutInput;
      const cartId = await cartService.getCartId(session.id);
      const order = await checkoutService.checkout(cartId ?? 0, session.id, input);
      return NextResponse.json({ message: "Order placed successfully.", order }, { status: 201 });
    } catch (e) {
      return fail(e, "Checkout failed.");
    }
  }
};
