"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CartDTO, ShippingInfo } from "@/lib/types";
import { formatVND, calcDeliveryFee, DELIVERY_INFO, PAYMENT_LABELS } from "@/lib/utils";
import ShippingForm from "@/components/ShippingForm";
import DeliverySelector from "@/components/DeliverySelector";
import PaymentSelector, { PayMethod, validateCard, CardInfo } from "@/components/PaymentSelector";
import { useToast } from "@/components/Toast";

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState<ShippingInfo>({ fullName: "", phone: "", address: "", city: "", district: "", ward: "", note: "" });
  const [shipValid, setShipValid] = useState(false);
  const [method, setMethod] = useState<PayMethod>("CARD");
  const [card, setCard] = useState<CardInfo>({ holder: "", number: "4111 1111 1111 1111", expiry: "12/30", cvv: "123" });
  const [walletConfirmed, setWalletConfirmed] = useState(false);
  const [delivery, setDelivery] = useState("STANDARD");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        toast("Please login before checkout.", "error");
        router.push("/login?redirect=/checkout");
        return;
      }
      const r = await fetch("/api/cart", { cache: "no-store" });
      const d = await r.json();
      if (!d.cart?.items?.length) {
        toast("Your cart is empty.", "error");
        router.push("/cart");
        return;
      }
      setCart(d.cart);
      setLoading(false);
    })();
  }, [router, toast]);

  const subtotal = cart?.subtotal ?? 0;
  const shippingFee = calcDeliveryFee(delivery, subtotal);
  const total = subtotal + shippingFee;

  const placeOrder = async () => {
    setError("");
    if (!shipValid) { setError("Please complete shipping information."); setStep(1); return; }
    if (method === "CARD") {
      const err = validateCard(card);
      if (err) { setError(err); setStep(2); return; }
    } else if (!walletConfirmed) {
      setError("Please confirm e-wallet payment."); setStep(2); return;
    }
    setPlacing(true);
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipping, paymentMethod: method, deliveryMethod: delivery, card, walletConfirmed })
    });
    const d = await r.json();
    setPlacing(false);
    if (!r.ok) { setError(d.error || "Checkout failed."); return; }
    window.dispatchEvent(new Event("cart-updated"));
    toast("Payment successful. Order placed successfully.");
    sessionStorage.setItem("last_order_code", d.order.orderCode);
    router.push(`/checkout/success?code=${d.order.orderCode}`);
  };

  if (loading) return <p className="py-16 text-center text-gray-500">Loading checkout...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Checkout</h1>
      {/* Steps */}
      <div className="mt-3 flex gap-2">
        {["1. Shipping Information", "2. Payment Method", "3. Order Confirmation"].map((s, i) => (
          <button key={s} onClick={() => setStep(i + 1)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold sm:text-sm ${step === i + 1 ? "bg-[#0A3161] text-white" : "bg-white text-gray-500 border"}`}>
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {step === 1 && (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 font-bold">Step 1: Shipping Information</h2>
              <ShippingForm initial={shipping} onChange={setShipping} onValidChange={setShipValid} />
              <DeliverySelector value={delivery} onChange={setDelivery} subtotal={subtotal} address={[shipping.address, shipping.ward, shipping.district, shipping.city].filter(Boolean).join(", ")} />
              <button onClick={() => { if (!shipValid) setError("Please complete shipping information."); else { setError(""); setStep(2); } }}
                className="mt-4 w-full rounded-lg bg-[#0A3161] py-2.5 text-sm font-bold text-white hover:bg-[#B31942]">
                Continue to Payment
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 font-bold">Step 2: Payment Method</h2>
              <PaymentSelector method={method} setMethod={setMethod} card={card} setCard={setCard}
                walletConfirmed={walletConfirmed} setWalletConfirmed={setWalletConfirmed} />
              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 rounded-lg border py-2.5 text-sm font-semibold">Back</button>
                <button onClick={() => setStep(3)} className="flex-1 rounded-lg bg-[#0A3161] py-2.5 text-sm font-bold text-white hover:bg-[#B31942]">
                  Review Order
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 font-bold">Step 3: Order Confirmation</h2>
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p><b>Ship to:</b> {shipping.fullName}, {shipping.phone}</p>
                <p>{shipping.address}, {shipping.ward}, {shipping.district}, {shipping.city}</p>
                {shipping.note && <p className="text-gray-500">Note: {shipping.note}</p>}
                <p className="mt-1"><b>Delivery:</b> {DELIVERY_INFO[delivery as keyof typeof DELIVERY_INFO].icon} {DELIVERY_INFO[delivery as keyof typeof DELIVERY_INFO].label}</p>
                <p><b>Payment:</b> {PAYMENT_LABELS[method]}</p>
                <button onClick={() => setStep(1)} className="mt-1 text-xs font-semibold text-[#0A3161] hover:underline">Edit</button>
              </div>
              <div className="mt-3 space-y-2">
                {cart?.items.map((i) => (
                  <div key={i.id} className="flex items-center gap-2 text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.product.image} alt="" className="h-10 w-10 rounded object-cover" />
                    <span className="flex-1">{i.product.name} × {i.quantity}</span>
                    <span className="font-semibold">{formatVND(i.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 rounded-lg border py-2.5 text-sm font-semibold">Back</button>
                <button onClick={placeOrder} disabled={placing}
                  className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                  {placing ? "Processing payment..." : `Pay ${formatVND(total)} & Place Order`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order summary throughout checkout */}
        <div className="h-fit rounded-xl border bg-white p-4">
          <p className="font-bold">Order summary</p>
          <div className="mt-2 max-h-64 space-y-2 overflow-auto text-sm">
            {cart?.items.map((i) => (
              <div key={i.id} className="flex justify-between gap-2">
                <span className="truncate">{i.product.name} × {i.quantity}</span>
                <span className="font-medium">{formatVND(i.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t pt-2 text-sm">
            <p className="flex justify-between"><span>Subtotal</span><span>{formatVND(subtotal)}</span></p>
            <p className="flex justify-between"><span>Shipping</span><span>{shippingFee === 0 ? "Free" : formatVND(shippingFee)}</span></p>
            <p className="flex justify-between text-base font-bold"><span>Total</span><span className="text-red-600">{formatVND(total)}</span></p>
          </div>
          <Link href="/cart" className="mt-3 block text-center text-sm font-semibold text-[#0A3161] hover:underline">← Back to cart</Link>
        </div>
      </div>
    </div>
  );
}
