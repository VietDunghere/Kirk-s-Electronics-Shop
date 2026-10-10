"use client";
import { useState } from "react";

export type PayMethod = "CARD" | "MOMO" | "ZALOPAY" | "VNPAY";
export type CardInfo = { holder: string; number: string; expiry: string; cvv: string };

export function validateCard(c: CardInfo): string | null {
  if (!c.holder.trim()) return "Cardholder name is required.";
  const digits = c.number.replace(/\s/g, "");
  if (!/^\d{16}$/.test(digits)) return "Card number must be 16 digits.";
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(c.expiry)) return "Expiry must be MM/YY.";
  const [mm, yy] = c.expiry.split("/").map(Number);
  const exp = new Date(2000 + yy, mm);
  if (exp <= new Date()) return "Card is expired.";
  if (!/^\d{3,4}$/.test(c.cvv)) return "CVV must be 3-4 digits.";
  // Demo acceptance: any valid-format card passes, test card 4111... always passes
  return null;
}

export default function PaymentSelector({
  method,
  setMethod,
  card,
  setCard,
  walletConfirmed,
  setWalletConfirmed
}: {
  method: PayMethod;
  setMethod: (m: PayMethod) => void;
  card: CardInfo;
  setCard: (c: CardInfo) => void;
  walletConfirmed: boolean;
  setWalletConfirmed: (b: boolean) => void;
}) {
  const wallets: { id: PayMethod; name: string; color: string }[] = [
    { id: "MOMO", name: "MoMo", color: "bg-pink-600" },
    { id: "ZALOPAY", name: "ZaloPay", color: "bg-[#B31942]" },
    { id: "VNPAY", name: "VNPay", color: "bg-[#0A3161]" }
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("CARD")}
          className={`rounded-xl border-2 p-4 text-left ${method === "CARD" ? "border-[#0A3161] bg-[#E8EDF3]" : "border-gray-200"}`}
        >
          <p className="font-bold">Pay by Card</p>
          <p className="text-xs text-gray-500">Visa / Mastercard (simulated)</p>
        </button>
        <div className={`rounded-xl border-2 p-4 ${method !== "CARD" ? "border-[#0A3161] bg-[#E8EDF3]" : "border-gray-200"}`}>
          <p className="font-bold">Pay by E-wallet</p>
          <div className="mt-2 flex gap-2">
            {wallets.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setMethod(w.id)}
                className={`rounded-lg px-3 py-2 text-xs font-bold text-white ${w.color} ${method === w.id ? "ring-2 ring-offset-2 ring-[#0A3161]" : "opacity-70"}`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {method === "CARD" ? (
        <div className="space-y-3 rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500">
            Demo test card: <b>4111 1111 1111 1111</b> · Exp <b>12/30</b> · CVV <b>123</b>. Card data is never stored.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">Cardholder name *</label>
            <input value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })}
              placeholder="NGUYEN VAN A" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Card number *</label>
            <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })}
              placeholder="4111 1111 1111 1111" inputMode="numeric" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Expiry (MM/YY) *</label>
              <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                placeholder="12/30" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">CVV *</label>
              <input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                placeholder="123" inputMode="numeric" type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="font-semibold">Simulated {method === "MOMO" ? "MoMo" : method === "ZALOPAY" ? "ZaloPay" : "VNPay"} payment</p>
          <div className="mx-auto mt-3 flex h-40 w-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="text-center">
              <div className="mx-auto grid h-20 w-20 grid-cols-5 gap-0.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`h-3 w-3 ${(i * 7 + method.length) % 3 === 0 ? "bg-slate-900" : "bg-white border"}`} />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-gray-500">FAKE QR — scan simulation</p>
            </div>
          </div>
          <label className="mt-3 flex items-center justify-center gap-2 text-sm">
            <input type="checkbox" checked={walletConfirmed} onChange={(e) => setWalletConfirmed(e.target.checked)} className="h-4 w-4" />
            I have completed payment in the e-wallet app (Confirm Payment)
          </label>
        </div>
      )}
    </div>
  );
}
