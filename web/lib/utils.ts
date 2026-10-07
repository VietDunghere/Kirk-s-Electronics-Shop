export function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

// Business rules live in the domain layer; re-exported so pages and components keep their imports.
export { SHIPPING_FEE, FREE_SHIP_THRESHOLD, calcShipping, ORDER_STATUSES } from "@/server/domain/order/order";

export const PAYMENT_LABELS: Record<string, string> = {
  CARD: "Credit/Debit Card",
  MOMO: "MoMo E-wallet",
  ZALOPAY: "ZaloPay E-wallet",
  VNPAY: "VNPay E-wallet"
};

export const CATEGORIES = ["Electronics", "Phones", "Laptops", "Accessories", "Gaming"];
