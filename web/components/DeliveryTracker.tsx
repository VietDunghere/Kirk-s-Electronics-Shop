"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Tracking } from "@/server/domain/order/delivery";
import { DELIVERY_INFO } from "@/lib/utils";

// Leaflet needs the browser, so the map is never rendered on the server.
const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm text-gray-500 sm:h-96">Loading map...</div>
});

function fmtEta(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${s % 60} s` : `${s} s`;
}

/** DHL-style tracking for drone / autonomous-car delivery: real map + vertical event history. Simulated demo. */
export default function DeliveryTracker({ tracking, address }: { tracking: Tracking; address: string }) {
  const info = DELIVERY_INFO[tracking.method];
  const isDrone = tracking.method === "DRONE";

  // The server sends a snapshot every few seconds; in between, the position is computed from the clock offset.
  const received = useRef(Date.now());
  useEffect(() => { received.current = Date.now(); }, [tracking]);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);
  const now = tracking.serverNowMs + (Date.now() - received.current);
  const { startMs, endMs } = tracking.transit;
  const progress = Math.min(1, Math.max(0, (now - startMs) / (endMs - startMs)));
  const delivered = tracking.delivered || now >= endMs;
  const etaSeconds = delivered ? 0 : Math.max(0, Math.round((endMs - now) / 1000));
  const moving = progress > 0 && progress < 1;
  const [km, setKm] = useState(0);

  const newestFirst = [...tracking.events].reverse();
  const latestIdx = newestFirst.findIndex((e) => e.done);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">{info.icon} {info.label} · {tracking.vehicleId}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${delivered ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
          {delivered ? "Delivered" : `ETA ${fmtEta(etaSeconds)}`}
        </span>
      </div>

      <div className="relative z-0 mt-3 overflow-hidden rounded-lg border">
        <DeliveryMap method={tracking.method} address={address} progress={progress} onRoute={setKm} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-2"><p className="text-gray-500">Speed</p><p className="text-base font-bold">{moving ? (isDrone ? 54 : 28) : 0} km/h</p></div>
        <div className="rounded-lg bg-gray-50 p-2">
          <p className="text-gray-500">{isDrone ? "Altitude" : "Mode"}</p>
          <p className="text-base font-bold">{isDrone ? `${moving ? 80 : 0} m` : "Self-driving"}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2"><p className="text-gray-500">Battery</p><p className="text-base font-bold">{Math.round(100 - progress * 17)}%</p></div>
        <div className="rounded-lg bg-gray-50 p-2"><p className="text-gray-500">Distance left</p><p className="text-base font-bold">{(km * (1 - progress)).toFixed(1)} km</p></div>
      </div>

      {/* DHL-style event history, newest first */}
      <ol className="mt-4">
        {newestFirst.map((e, i) => {
          const latest = i === latestIdx;
          return (
            <li key={e.status} className={`relative flex gap-3 pb-4 pl-1 last:pb-0 ${e.done ? "" : "opacity-40"}`}>
              <span className="absolute left-[9px] top-5 h-full w-px bg-gray-200" />
              <span className={`z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${latest ? "border-[#B31942] bg-[#B31942]" : e.done ? "border-[#0A3161] bg-[#0A3161]" : "border-gray-300 bg-white"}`} />
              <div className="text-sm">
                <p className={`font-semibold ${latest ? "text-[#B31942]" : ""}`}>{e.title}</p>
                <p className="text-xs text-gray-500">
                  {e.location}{e.done ? ` · ${new Date(e.time).toLocaleTimeString()}` : " · pending"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px] text-gray-400">Demo simulation: no real vehicle. Map: OpenStreetMap; the position is generated from the time since the order was placed.</p>
    </div>
  );
}
