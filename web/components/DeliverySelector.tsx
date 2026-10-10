"use client";
import { useState } from "react";
import { DELIVERY_INFO, DELIVERY_METHODS, calcDeliveryFee, formatVND } from "@/lib/utils";
import type { DeliveryAdvice } from "@/server/application/service/deliveryAdvisorService";

const PRIORITIES = [
  { value: "fast", label: "⚡ Fastest" },
  { value: "cheap", label: "💰 Cheapest" },
  { value: "eco", label: "🌱 Eco-friendly" }
];

export default function DeliverySelector({
  value,
  onChange,
  subtotal,
  address = ""
}: {
  value: string;
  onChange: (v: string) => void;
  subtotal: number;
  address?: string;
}) {
  const [priority, setPriority] = useState("fast");
  const [advice, setAdvice] = useState<DeliveryAdvice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ask = async () => {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/delivery-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority, address })
      });
      const d = await r.json();
      if (!r.ok) setError(d.error || "Could not get advice.");
      else setAdvice(d.advice);
    } catch {
      setError("Could not get advice.");
    }
    setBusy(false);
  };

  const unavailable = (m: string) => advice?.options.find((o) => o.method === m && !o.available);

  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-bold">Delivery method</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        {DELIVERY_METHODS.map((m) => {
          const info = DELIVERY_INFO[m];
          const fee = calcDeliveryFee(m, subtotal);
          const active = value === m;
          const blocked = unavailable(m);
          return (
            <button
              type="button"
              key={m}
              onClick={() => onChange(m)}
              className={`relative rounded-xl border-2 p-3 text-left transition ${active ? "border-[#0A3161] bg-[#E8EDF3]" : "border-gray-200 bg-white hover:border-gray-300"} ${blocked ? "opacity-60" : ""}`}
            >
              {advice?.recommended === m && (
                <span className="absolute -top-2 right-2 rounded-full bg-[#B31942] px-2 py-0.5 text-[10px] font-bold text-white">🤖 AI pick</span>
              )}
              <span className="text-2xl">{info.icon}</span>
              <p className="mt-1 text-sm font-bold">{info.label}</p>
              <p className="text-xs text-gray-500">{info.description}</p>
              <p className="mt-1 text-xs text-gray-600">ETA: {info.eta}</p>
              <p className="mt-1 text-sm font-bold text-[#B31942]">{fee === 0 ? "Free" : formatVND(fee)}</p>
              {m !== "STANDARD" && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">NEW · DEMO</span>}
              {blocked && <p className="mt-1 text-[11px] font-semibold text-red-600">Not available: {blocked.warnings[0]}</p>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-[#B31942] bg-red-50/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">🤖 Not sure? Let AI choose</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border px-2 py-1 text-xs">
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button type="button" onClick={ask} disabled={busy}
            className="rounded-lg bg-[#B31942] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#8f1434] disabled:opacity-60">
            {busy ? "Thinking..." : "Suggest delivery"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {advice && (
          <div className="mt-2 text-sm">
            <p className="text-xs text-gray-500">
              Parcel ~{advice.weightKg} kg · ~{advice.distanceKm} km · {advice.weather.description}, {Math.round(advice.weather.windKmh)} km/h wind
              {advice.weather.source === "simulated" ? " (simulated)" : " (live weather)"}
            </p>
            <p className="mt-1">{advice.explanation}</p>
            {!advice.usedAI && <p className="text-[11px] text-gray-400">Rule-based explanation (no AI key set).</p>}
            {value !== advice.recommended && (
              <button type="button" onClick={() => onChange(advice.recommended)}
                className="mt-2 rounded-lg bg-[#0A3161] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#B31942]">
                Use {DELIVERY_INFO[advice.recommended].label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
