// domain.order — Delivery methods (standard / drone / autonomous electric car) and the simulated delivery tracking.
// DEMO ONLY: there is no real vehicle. The progress is computed from the time passed since the order was placed.
export const DELIVERY_METHODS = ["STANDARD", "DRONE", "ROBOT_CAR"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_INFO: Record<DeliveryMethod, { label: string; icon: string; eta: string; description: string }> = {
  STANDARD: { label: "Standard delivery", icon: "🚚", eta: "2-4 days", description: "Courier delivery. Free over 500,000 VND." },
  DRONE: { label: "Drone delivery", icon: "🚁", eta: "~3 minutes (demo)", description: "Flies straight from the Kirk Drone Hub to your door." },
  ROBOT_CAR: { label: "Autonomous electric car", icon: "🚙", eta: "~4 minutes (demo)", description: "Self-driving electric car, zero emission." }
};

export function isDeliveryMethod(v: unknown): v is DeliveryMethod {
  return typeof v === "string" && (DELIVERY_METHODS as readonly string[]).includes(v);
}

// ------------------------------------------------------------------ Tracking
export type TrackingEvent = { status: string; title: string; location: string; time: string; done: boolean };
export type Tracking = {
  method: Exclude<DeliveryMethod, "STANDARD">;
  vehicleId: string;
  status: string;
  delivered: boolean;
  /** 0..1 along the route at serverNowMs (0 = still at the hub). */
  progress: number;
  etaSeconds: number;
  events: TrackingEvent[];
  /** Absolute times of the moving part (Shipped -> Delivered) so the browser can animate between two refreshes. */
  transit: { startMs: number; endMs: number };
  serverNowMs: number;
};

type Step = { status: string; at: number; title: string; location: string };

// Seconds after the order is placed. Shipped -> Delivered is the moving part.
function plan(method: "DRONE" | "ROBOT_CAR", vehicle: string, city: string): Step[] {
  if (method === "DRONE") {
    return [
      { status: "Order Placed", at: 0, title: "Order received", location: "Kirk Commerce" },
      { status: "Confirmed", at: 8, title: "Order confirmed. Drone delivery reserved", location: "Kirk Drone Hub" },
      { status: "Processing", at: 25, title: `Package packed and loaded on ${vehicle}`, location: "Kirk Drone Hub" },
      { status: "Shipped", at: 50, title: `${vehicle} took off`, location: "Kirk Drone Hub" },
      { status: "Out for Delivery", at: 130, title: `${vehicle} is approaching the delivery address`, location: city },
      { status: "Delivered", at: 170, title: "Package dropped at the delivery address", location: city }
    ];
  }
  return [
    { status: "Order Placed", at: 0, title: "Order received", location: "Kirk Commerce" },
    { status: "Confirmed", at: 10, title: "Order confirmed. Autonomous car reserved", location: "Kirk Robo Garage" },
    { status: "Processing", at: 30, title: `Package loaded into ${vehicle}`, location: "Kirk Robo Garage" },
    { status: "Shipped", at: 60, title: `${vehicle} left the garage (self-driving)`, location: "Kirk Robo Garage" },
    { status: "Out for Delivery", at: 200, title: `${vehicle} is in your area`, location: city },
    { status: "Delivered", at: 260, title: "Package delivered to the customer", location: city }
  ];
}

export interface TrackableOrder {
  id?: number;
  deliveryMethod?: string;
  createdAt?: Date | string;
  shippingAddress: string;
  district?: string;
  city: string;
}

/** Simulated tracking for DRONE / ROBOT_CAR orders; null for standard delivery. */
export function computeTracking(order: TrackableOrder, nowMs: number = Date.now()): Tracking | null {
  const method = order.deliveryMethod;
  if (method !== "DRONE" && method !== "ROBOT_CAR") return null;

  const created = new Date(order.createdAt ?? nowMs).getTime();
  const elapsed = Math.max(0, (nowMs - created) / 1000);
  const code = String(((order.id ?? 0) % 90) + 10);
  const vehicleId = method === "DRONE" ? `Drone KD-${code}` : `RoboCar EV-${code}`;
  const steps = plan(method, vehicleId, order.city || "Delivery address");

  const reached = steps.filter((s) => elapsed >= s.at);
  const current = reached[reached.length - 1];
  const shipped = steps[3];
  const end = steps[5];
  const progress = Math.min(1, Math.max(0, (elapsed - shipped.at) / (end.at - shipped.at)));

  const base = new Date(created);

  return {
    method,
    vehicleId,
    status: current.status,
    delivered: current.status === "Delivered",
    progress,
    etaSeconds: Math.max(0, Math.round(end.at - elapsed)),
    events: steps.map((s) => ({
      status: s.status,
      title: s.title,
      location: s.location,
      time: new Date(base.getTime() + s.at * 1000).toISOString(),
      done: elapsed >= s.at
    })),
    transit: { startMs: created + shipped.at * 1000, endMs: created + end.at * 1000 },
    serverNowMs: nowMs
  };
}
