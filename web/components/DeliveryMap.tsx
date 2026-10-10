"use client";
// Real OpenStreetMap (Leaflet) with hub, destination, the route and the moving vehicle. Loaded with ssr:false.
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { HUBS, along, geocode, getRoute, routeKm, type LatLng } from "@/lib/geo";

type Props = {
  method: "DRONE" | "ROBOT_CAR";
  address: string;
  progress: number;
  onRoute?: (km: number) => void;
};

const pin = (html: string, cls = "") =>
  L.divIcon({ html: `<div class="kirk-pin ${cls}">${html}</div>`, className: "", iconSize: [34, 34], iconAnchor: [17, 17] });

export default function DeliveryMap({ method, address, progress, onRoute }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const vehicle = useRef<L.Marker | null>(null);
  const done = useRef<L.Polyline | null>(null);
  const [route, setRoute] = useState<LatLng[] | null>(null);

  // 1) map + route (once per order)
  useEffect(() => {
    if (!box.current) return;
    const m = L.map(box.current, { zoomControl: true, scrollWheelZoom: false }).setView(HUBS[method].pos, 13);
    map.current = m;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(m);

    let cancelled = false;
    (async () => {
      const hub = HUBS[method].pos;
      const dest = await geocode(address, hub);
      const pts = await getRoute(method, hub, dest);
      if (cancelled) return;
      L.polyline(pts, { color: "#0A3161", weight: 4, opacity: 0.5, dashArray: "8 8" }).addTo(m);
      done.current = L.polyline([pts[0]], { color: "#B31942", weight: 6 }).addTo(m);
      L.marker(hub, { icon: pin("⌂", "kirk-hub") }).addTo(m).bindTooltip(HUBS[method].name, { permanent: true, direction: "bottom", offset: [0, 12] });
      L.marker(dest, { icon: pin("⚑", "kirk-dest") }).addTo(m).bindTooltip("Delivery address", { permanent: true, direction: "bottom", offset: [0, 12] });
      vehicle.current = L.marker(pts[0], { icon: pin(method === "DRONE" ? "🚁" : "🚙", "kirk-vehicle"), zIndexOffset: 1000 }).addTo(m);
      m.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
      onRoute?.(routeKm(pts));
      setRoute(pts);
    })();

    return () => {
      cancelled = true;
      m.remove();
      map.current = null;
      vehicle.current = null;
      done.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, address]);

  // 2) move the vehicle
  useEffect(() => {
    if (!route || !vehicle.current || !done.current) return;
    const { position, travelled } = along(route, progress);
    vehicle.current.setLatLng(position);
    done.current.setLatLngs(travelled);
  }, [route, progress]);

  return (
    <>
      <style>{`
        .kirk-pin{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;font-size:17px;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.35);border:3px solid #fff}
        .kirk-hub{background:#0A3161}.kirk-dest{background:#16a34a}.kirk-vehicle{background:#B31942}
      `}</style>
      <div ref={box} className="h-72 w-full sm:h-96" />
    </>
  );
}
