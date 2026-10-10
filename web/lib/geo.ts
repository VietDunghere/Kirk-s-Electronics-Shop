// Real-map helpers for the delivery tracking demo (browser only): geocoding, routing and distances.
// Services used: OpenStreetMap Nominatim (address -> coordinates) and the public OSRM server (street route).
export type LatLng = [number, number];

/** PTIT campus, Km10 Nguyen Trai, Ha Dong, Ha Noi. */
export const PTIT: LatLng = [20.981, 105.7872];

/** Demo start points of the two services, a few km from PTIT (AEON Mall Ha Dong area). */
export const HUBS = {
  DRONE: { name: "Kirk Drone Hub", pos: [20.9889, 105.7507] as LatLng },
  ROBOT_CAR: { name: "Kirk Robo Garage", pos: [20.9872, 105.753] as LatLng }
};

const PTIT_WORDS = /ptit|hoc vien cong nghe buu chinh|học viện công nghệ bưu chính/i;

function withTimeout(ms: number) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

/** Typing "PTIT" anywhere in the address puts the destination on the PTIT campus. Other addresses are searched on OSM. */
export async function geocode(address: string, fallbackNear: LatLng): Promise<LatLng> {
  if (PTIT_WORDS.test(address)) return PTIT;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(address)}`;
    const rows = await fetch(url, { signal: withTimeout(4000) }).then((r) => r.json());
    if (rows?.[0]) return [Number(rows[0].lat), Number(rows[0].lon)];
  } catch {
    /* offline or rate limited: use the fallback below */
  }
  // address not found: a stable point 1-4 km from the hub, so the demo still works
  let h = 7;
  for (const ch of address) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const ang = (h % 360) * (Math.PI / 180);
  const dist = 0.01 + ((h >>> 9) % 30) / 1000;
  return [fallbackNear[0] + Math.sin(ang) * dist, fallbackNear[1] + Math.cos(ang) * dist * 1.1];
}

/** Drone: gently curved flight line. Autonomous car: real streets from OSRM (straight line if the service is down). */
export async function getRoute(method: "DRONE" | "ROBOT_CAR", from: LatLng, to: LatLng): Promise<LatLng[]> {
  if (method === "DRONE") {
    const mid: LatLng = [(from[0] + to[0]) / 2 + (to[1] - from[1]) * 0.18, (from[1] + to[1]) / 2 - (to[0] - from[0]) * 0.18];
    const pts: LatLng[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      pts.push([
        (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * mid[0] + t * t * to[0],
        (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * mid[1] + t * t * to[1]
      ]);
    }
    return pts;
  }
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const d = await fetch(url, { signal: withTimeout(6000) }).then((r) => r.json());
    const coords: [number, number][] | undefined = d?.routes?.[0]?.geometry?.coordinates;
    if (coords?.length) return coords.map(([lng, lat]) => [lat, lng] as LatLng);
  } catch {
    /* fall through to the straight line */
  }
  return [from, to];
}

function meters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function routeKm(pts: LatLng[]): number {
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += meters(pts[i - 1], pts[i]);
  return m / 1000;
}

/** The point at `progress` (0..1) of the route and the part of the route already travelled. */
export function along(pts: LatLng[], progress: number): { position: LatLng; travelled: LatLng[] } {
  const total = routeKm(pts) * 1000;
  const target = total * Math.min(1, Math.max(0, progress));
  const travelled: LatLng[] = [pts[0]];
  let run = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = meters(pts[i - 1], pts[i]);
    if (run + seg >= target && seg > 0) {
      const t = (target - run) / seg;
      const position: LatLng = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
      travelled.push(position);
      return { position, travelled };
    }
    run += seg;
    travelled.push(pts[i]);
  }
  return { position: pts[pts.length - 1], travelled };
}
