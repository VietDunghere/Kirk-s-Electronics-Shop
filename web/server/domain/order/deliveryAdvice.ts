// domain.order — rules the AI delivery advisor uses to judge STANDARD / DRONE / ROBOT_CAR for an order.
// Pure functions: weights, limits and scoring. The service adds live weather and the written explanation.
import { calcDeliveryFee } from "./order";
import type { DeliveryMethod } from "./delivery";

export type Priority = "fast" | "cheap" | "eco";

export type AdviceItem = { name: string; category: string; price: number; quantity: number };

export type AdviceContext = {
  items: AdviceItem[];
  subtotal: number;
  distanceKm: number;
  priority: Priority;
  rainMm: number;
  windKmh: number;
};

export type MethodAdvice = {
  method: DeliveryMethod;
  available: boolean;
  fee: number;
  score: number;
  reasons: string[];
  warnings: string[];
};

export const LIMITS = {
  DRONE: { maxKg: 2.5, maxKm: 10, maxWindKmh: 25, maxRainMm: 0.2, maxValue: 30_000_000 },
  ROBOT_CAR: { maxKg: 20, maxKm: 15, maxRainMm: 8 }
};

/** Rough parcel weight of one unit, from its name and category (the catalog has no weight column). */
export function unitWeightKg(item: Pick<AdviceItem, "name" | "category">): number {
  const n = item.name.toLowerCase();
  if (/chair/.test(n)) return 18;
  if (/monitor/.test(n)) return 7;
  if (/laptop stand/.test(n)) return 1;
  if (/laptop/.test(n)) return 2.4;
  if (/speaker/.test(n)) return 1;
  if (/vr/.test(n)) return 0.9;
  if (/ssd/.test(n)) return 0.1;
  if (/mouse/.test(n)) return 0.2;
  if (/keyboard/.test(n)) return 1.1;
  if (/webcam/.test(n)) return 0.4;
  if (item.category === "Drones") return 1.8;
  if (item.category === "Phones") return 0.5;
  if (item.category === "Electronics") return 0.9; // tablets
  return 0.4; // accessories
}

export function isFragile(item: Pick<AdviceItem, "name" | "category">): boolean {
  return /laptop|monitor|vr/i.test(item.name) || ["Laptops", "Drones", "Phones", "Electronics"].includes(item.category);
}

export function totalWeightKg(items: AdviceItem[]): number {
  return Math.round(items.reduce((s, i) => s + unitWeightKg(i) * i.quantity, 0) * 10) / 10;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function adviseMethods(ctx: AdviceContext): MethodAdvice[] {
  const weight = totalWeightKg(ctx.items);
  const fragile = ctx.items.some(isFragile);
  const w = { fast: { s: 3, c: 1, e: 0.5 }, cheap: { s: 0.5, c: 3, e: 0.5 }, eco: { s: 0.5, c: 1, e: 3 } }[ctx.priority];

  const base: Record<DeliveryMethod, { speed: number; eco: number }> = {
    STANDARD: { speed: 0.2, eco: 0.2 },
    DRONE: { speed: 1, eco: 0.8 },
    ROBOT_CAR: { speed: 0.7, eco: 1 }
  };

  return (["STANDARD", "DRONE", "ROBOT_CAR"] as DeliveryMethod[]).map((method) => {
    const fee = calcDeliveryFee(method, ctx.subtotal);
    const reasons: string[] = [];
    const warnings: string[] = [];
    let available = true;
    let penalty = 0;

    if (method === "DRONE") {
      const L = LIMITS.DRONE;
      if (weight > L.maxKg) { available = false; warnings.push(`Đơn nặng khoảng ${weight} kg, drone chỉ chở tối đa ${L.maxKg} kg.`); }
      if (ctx.distanceKm > L.maxKm) { available = false; warnings.push(`Quãng đường ~${ctx.distanceKm} km vượt tầm bay ${L.maxKm} km.`); }
      if (ctx.rainMm > L.maxRainMm) { available = false; warnings.push("Trời đang mưa, drone không cất cánh."); }
      if (ctx.windKmh > L.maxWindKmh) { available = false; warnings.push(`Gió ${Math.round(ctx.windKmh)} km/h quá mạnh cho drone.`); }
      if (ctx.subtotal > L.maxValue) { penalty += 0.4; warnings.push("Đơn giá trị cao, drone thả hàng không có người ký nhận."); }
      if (fragile) { penalty += 0.1; warnings.push("Hàng dễ vỡ: drone hạ cánh nhẹ nhưng vẫn rung hơn xe."); }
      if (available) reasons.push(`Nhanh nhất, ước tính ~3 phút cho ${ctx.distanceKm} km.`, `Hàng ${weight} kg nằm trong tải trọng ${L.maxKg} kg.`);
    } else if (method === "ROBOT_CAR") {
      const L = LIMITS.ROBOT_CAR;
      if (weight > L.maxKg) { available = false; warnings.push(`Đơn nặng khoảng ${weight} kg, xe chỉ chở tối đa ${L.maxKg} kg.`); }
      if (ctx.distanceKm > L.maxKm) { available = false; warnings.push(`Quãng đường ~${ctx.distanceKm} km vượt vùng phục vụ ${L.maxKm} km.`); }
      if (ctx.rainMm > L.maxRainMm) { penalty += 0.3; warnings.push("Mưa lớn, xe chạy chậm hơn dự kiến."); }
      if (available) reasons.push("Xe điện tự lái, không phát thải.", "Chạy trên đường thật, êm hơn drone nên hợp hàng dễ vỡ hoặc nặng.");
      if (fragile && available) reasons.push("Hàng dễ vỡ được giữ chắc trong khoang xe.");
    } else {
      reasons.push("Luôn khả dụng, phù hợp mọi cân nặng và khu vực.", fee === 0 ? "Miễn phí vì đơn từ 500.000đ." : "Phí thấp nhất.");
      if (ctx.priority === "fast") warnings.push("Giao trong 2-4 ngày, chậm nhất.");
    }

    const speed = base[method].speed;
    const eco = base[method].eco;
    const cost = 1 - clamp01(fee / 50000);
    const score = available ? Math.round((w.s * speed + w.c * cost + w.e * eco) * 100 * (1 - penalty)) / 100 : 0;
    return { method, available, fee, score, reasons, warnings };
  });
}

export function pickBest(options: MethodAdvice[]): MethodAdvice {
  const usable = options.filter((o) => o.available);
  return usable.sort((a, b) => b.score - a.score)[0] ?? options[0];
}
