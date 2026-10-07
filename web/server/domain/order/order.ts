// domain.order — Order, OrderItem, Shipping, Payment (IDCard / Ewallet): rules only, no I/O.
export const SHIPPING_FEE = 30000;
export const FREE_SHIP_THRESHOLD = 500000;

export const ORDER_STATUSES = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered"
] as const;

export const PAYMENT_METHODS = ["CARD", "MOMO", "ZALOPAY", "VNPAY"] as const;

export function calcShipping(subtotal: number): number {
  if (subtotal === 0) return 0;
  return subtotal >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
}

/** Order code format ORD-YYYY-XXXXX, built from the id the new order will get. */
export function generateOrderCode(year: number, lastOrderId: number): string {
  return `ORD-${year}-${String(lastOrderId + 1).padStart(5, "0")}`;
}

// ------------------------------------------------------------------ Shipping
export type ShippingInput = {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
  note?: string;
};

export class Shipping {
  constructor(
    public fullName: string,
    public phone: string,
    public address: string,
    public city: string,
    public district: string,
    public ward: string,
    public note: string = ""
  ) {}

  static from(input?: ShippingInput): Shipping {
    return new Shipping(
      input?.fullName?.trim() || "",
      input?.phone?.trim() || "",
      input?.address?.trim() || "",
      input?.city?.trim() || "",
      input?.district?.trim() || "",
      input?.ward?.trim() || "",
      (input?.note || "").trim()
    );
  }

  /** Returns an error message, or null when the shipping information is valid. */
  validate(): string | null {
    if (!this.fullName || !this.phone || !this.address || !this.city || !this.district || !this.ward) {
      return "Please complete shipping information.";
    }
    if (!/^[0-9+ ]{9,15}$/.test(this.phone)) return "Invalid phone number.";
    return null;
  }
}

// ------------------------------------------------------------------- Payment
export type CardInput = { holder?: string; number?: string; expiry?: string; cvv?: string };

export abstract class Payment {
  constructor(public readonly method: string) {}

  abstract validate(): string | null;

  /** Builds the payment for a method name, or null when the method is unknown. */
  static of(method: string, card?: CardInput, walletConfirmed?: boolean): Payment | null {
    if (method === "CARD") return new IDCard(card || {});
    if (method === "MOMO" || method === "ZALOPAY" || method === "VNPAY") return new Ewallet(method, !!walletConfirmed);
    return null;
  }
}

/** Card payment. The full card data is only validated, never stored. */
export class IDCard extends Payment {
  constructor(public card: CardInput) {
    super("CARD");
  }

  validate(): string | null {
    const card = this.card;
    if (!card.holder?.trim()) return "Cardholder name is required.";
    const digits = (card.number || "").replace(/\s/g, "");
    if (!/^\d{16}$/.test(digits)) return "Card number must be 16 digits.";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry || "")) return "Expiry must be MM/YY.";
    const [mm, yy] = (card.expiry as string).split("/").map(Number);
    if (new Date(2000 + yy, mm) <= new Date()) return "Card is expired.";
    if (!/^\d{3,4}$/.test(card.cvv || "")) return "CVV must be 3-4 digits.";
    return null;
  }
}

/** E-wallet payment (MoMo / ZaloPay / VNPay): the customer must confirm the simulated payment. */
export class Ewallet extends Payment {
  constructor(method: string, public confirmed: boolean) {
    super(method);
  }

  validate(): string | null {
    return this.confirmed ? null : "Please confirm e-wallet payment.";
  }
}

// --------------------------------------------------------------------- Order
export class OrderItem {
  constructor(
    public productId: number,
    public productName: string,
    public price: number,
    public quantity: number,
    public id?: number,
    public orderId?: number
  ) {}

  subtotal(): number {
    return this.price * this.quantity;
  }
}

export interface OrderFields {
  id?: number;
  orderCode: string;
  userId: number;
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  shippingFullName: string;
  shippingPhone: string;
  shippingAddress: string;
  city: string;
  district: string;
  ward: string;
  note: string;
  createdAt?: Date;
  user?: { fullName: string; email: string };
  /** Cart this order is created from; the repository clears it in the same transaction as the save. */
  sourceCartId?: number;
}

export type OrderRecord = OrderFields & {
  items?: { id: number; orderId: number; productId: number; productName: string; price: number; quantity: number }[];
};

// Declaration merging: the fields above are the data of the Order class below.
export interface Order extends OrderFields {}

export class Order {
  items: OrderItem[];

  constructor(fields: OrderFields, items: OrderItem[] = []) {
    Object.assign(this, fields);
    this.items = items;
  }

  static fromRecord(record: OrderRecord): Order {
    const { items, ...fields } = record;
    return new Order(
      fields,
      (items || []).map((i) => new OrderItem(i.productId, i.productName, i.price, i.quantity, i.id, i.orderId))
    );
  }

  addItem(item: OrderItem): void {
    this.items.push(item);
  }

  /** Subtotal of the items + shipping fee (free from 500,000 VND). Returns the total. */
  calculateTotal(): number {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal(), 0);
    this.shippingFee = calcShipping(this.subtotal);
    this.totalAmount = this.subtotal + this.shippingFee;
    return this.totalAmount;
  }
}
