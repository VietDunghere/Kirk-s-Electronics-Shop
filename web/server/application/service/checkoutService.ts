// application.service — CheckoutService (slide 05: checkout(cartID) : Order; Hình 1: enterShipping, pay).
// Flow of Hình 2: CartRepository.findById -> validateCartItems -> create Order (+ OrderItems) -> Order.calculateTotal
//                 -> OrderRepository.save -> Cart.clear -> return Order.
// enterShipping / pay are the two steps the customer fills in before checkout; the order does not exist yet at that time,
// so they take no orderID (unlike Hình 1) and only validate. The order is created, paid and saved together by checkout().
import { cartRepository } from "../../infrastructure/repository/cartRepository";
import { orderRepository } from "../../infrastructure/repository/orderRepository";
import type { Cart } from "../../domain/cart/cart";
import { hasEnoughStock } from "../../domain/product/product";
import {
  Order,
  Payment,
  Shipping,
  generateOrderCode,
  type CardInput,
  type ShippingInput
} from "../../domain/order/order";
import { isDeliveryMethod } from "../../domain/order/delivery";
import { AppError } from "./appError";

export type CheckoutInput = {
  shipping: ShippingInput;
  paymentMethod: string;
  deliveryMethod?: string;
  card?: CardInput;
  walletConfirmed?: boolean;
};

/** Slide 05 step 5: "Service validates CartItems" — a non-empty cart whose quantities are all in stock. */
function validateCartItems(cart: Cart): void {
  if (cart.isEmpty()) throw new AppError(400, "Your cart is empty.");
  for (const item of cart.items) {
    if (!hasEnoughStock(item.product, item.quantity)) {
      throw new AppError(400, `${item.product.name}: only ${item.product.stock} item(s) available.`);
    }
  }
}

export const checkoutService = {
  /** Shipping step: returns the validated shipping information. */
  enterShipping(info?: ShippingInput): Shipping {
    const shipping = Shipping.from(info);
    const error = shipping.validate();
    if (error) throw new AppError(400, error);
    return shipping;
  },

  /** Payment step: returns the validated payment (IDCard or Ewallet). Simulated; card data is never stored. */
  pay(method: string, card?: CardInput, walletConfirmed?: boolean): Payment {
    const payment = Payment.of(method, card, walletConfirmed);
    if (!payment) throw new AppError(400, "Please choose a payment method.");
    const error = payment.validate();
    if (error) throw new AppError(400, error);
    return payment;
  },

  async checkout(cartID: number, userId: number, input: CheckoutInput): Promise<Order> {
    const shipping = checkoutService.enterShipping(input.shipping);
    const deliveryMethod = input.deliveryMethod ?? "STANDARD";
    if (!isDeliveryMethod(deliveryMethod)) throw new AppError(400, "Please choose a delivery method.");
    const payment = checkoutService.pay(input.paymentMethod, input.card, input.walletConfirmed);

    const cart = await cartRepository.findById(cartID);
    if (!cart) throw new AppError(400, "Your cart is empty.");
    if (cart.userId !== userId) throw new AppError(403, "You do not have permission to check out this cart.");
    validateCartItems(cart);

    // create Order (one OrderItem per cart line) and calculate its total
    const order = Order.createOrder(cart, {
      orderCode: generateOrderCode(new Date().getFullYear(), await orderRepository.lastId()),
      userId,
      shipping,
      payment,
      deliveryMethod
    });
    if (!payment.pay(order.totalAmount)) throw new AppError(400, "Payment failed.");
    order.paymentStatus = payment.getPaymentStatus(); // simulated payment: "PAID" once the information is valid

    const saved = await orderRepository.save(order); // also stores the stock change and empties the stored cart
    cart.clear();
    return saved;
  }
};
