// presentation.controller — CheckoutController: enterShipping, pay (step checks) and checkout (POST /api/orders).
import { NextResponse } from "next/server";
import { cartService } from "../../application/service/cartService";
import { checkoutService, type CheckoutInput } from "../../application/service/checkoutService";
import { fail, requireSession } from "./http";

export const checkoutController = {
  /** Shipping step: the server checks the shipping information before the customer moves on to payment. */
  async enterShipping(req: Request) {
    try {
      await requireSession("Please login before checkout.");
      const { shipping } = await req.json();
      const info = checkoutService.enterShipping(shipping);
      return NextResponse.json({ message: "Shipping information is valid.", status: info.getShippingStatus() });
    } catch (e) {
      return fail(e, "Shipping information is invalid.");
    }
  },

  /** Payment step: the server checks the payment method and its information (nothing is charged or stored). */
  async pay(req: Request) {
    try {
      await requireSession("Please login before checkout.");
      const { paymentMethod, card, walletConfirmed } = await req.json();
      const payment = checkoutService.pay(paymentMethod, card, walletConfirmed);
      return NextResponse.json({ message: "Payment information is valid.", method: payment.method, status: payment.getPaymentStatus() });
    } catch (e) {
      return fail(e, "Payment information is invalid.");
    }
  },

  async checkout(req: Request) {
    try {
      const session = await requireSession("Please login before checkout.");
      const input = (await req.json()) as CheckoutInput;
      const cartId = await cartService.getCartId(session.id);
      const order = await checkoutService.checkout(cartId ?? 0, session.id, input);
      return NextResponse.json({ message: "Order placed successfully.", order }, { status: 201 });
    } catch (e) {
      return fail(e, "Checkout failed.");
    }
  }
};
