// application.service — DeliveryAdvisorService: "AI picks the delivery method".
// Rules (weight, distance, weather, priority) decide; the LLM only explains the decision in words (fallback: rule text).
import { cartRepository } from "../../infrastructure/repository/cartRepository";
import { currentWeather, type Weather } from "../../infrastructure/weather/weatherClient";
import { askLLM } from "../../infrastructure/llm/groqClient";
import { DELIVERY_INFO } from "../../domain/order/delivery";
import {
  adviseMethods,
  pickBest,
  totalWeightKg,
  type MethodAdvice,
  type Priority
} from "../../domain/order/deliveryAdvice";
import { AppError } from "./appError";

export type AdviceInput = { priority?: unknown; address?: unknown };

export type DeliveryAdvice = {
  recommended: MethodAdvice["method"];
  options: MethodAdvice[];
  weather: Weather;
  weightKg: number;
  distanceKm: number;
  priority: Priority;
  explanation: string;
  usedAI: boolean;
};

const PRIORITIES: Priority[] = ["fast", "cheap", "eco"];
const PRIORITY_TEXT: Record<Priority, string> = { fast: "nhanh nhất", cheap: "rẻ nhất", eco: "thân thiện môi trường" };

/** No geocoding on the server: PTIT (the demo address) is ~5 km from the hub, anything else is assumed ~8 km. */
function estimateDistanceKm(address: string): number {
  return /ptit|hoc vien cong nghe buu chinh|học viện công nghệ bưu chính/i.test(address) ? 5.4 : 8;
}

function ruleExplanation(best: MethodAdvice, ctx: { priority: Priority; weightKg: number; distanceKm: number }, others: MethodAdvice[]): string {
  const label = DELIVERY_INFO[best.method].label;
  const blocked = others.filter((o) => !o.available).map((o) => `${DELIVERY_INFO[o.method].label} (${o.warnings[0]})`);
  return (
    `Mình gợi ý ${label} vì bạn ưu tiên ${PRIORITY_TEXT[ctx.priority]}: ${best.reasons.join(" ")}` +
    (blocked.length ? ` Không dùng được: ${blocked.join("; ")}` : "")
  );
}

export const deliveryAdvisorService = {
  async advise(userId: number, input: AdviceInput): Promise<DeliveryAdvice> {
    const cart = await cartRepository.findByUserId(userId);
    if (!cart || cart.isEmpty()) throw new AppError(400, "Your cart is empty.");

    const priority = PRIORITIES.includes(input.priority as Priority) ? (input.priority as Priority) : "fast";
    const address = typeof input.address === "string" ? input.address : "";
    const items = cart.items.map((i) => ({
      name: i.product.name,
      category: i.product.category,
      price: i.product.price,
      quantity: i.quantity
    }));
    const subtotal = cart.calculateSubtotal();
    const weather = await currentWeather();
    const distanceKm = estimateDistanceKm(address);

    const options = adviseMethods({ items, subtotal, distanceKm, priority, rainMm: weather.rainMm, windKmh: weather.windKmh });
    const best = pickBest(options);
    const weightKg = totalWeightKg(items);
    const fallback = ruleExplanation(best, { priority, weightKg, distanceKm }, options.filter((o) => o !== best));

    const facts = {
      uuTien: PRIORITY_TEXT[priority],
      canNangKg: weightKg,
      khoangCachKm: distanceKm,
      thoiTiet: `${weather.description}, mưa ${weather.rainMm} mm, gió ${Math.round(weather.windKmh)} km/h`,
      giaTriDon: subtotal,
      phuongAnChon: DELIVERY_INFO[best.method].label,
      cacPhuongAn: options.map((o) => ({
        ten: DELIVERY_INFO[o.method].label,
        khaDung: o.available,
        phi: o.fee,
        lyDo: o.reasons,
        canhBao: o.warnings
      }))
    };
    const text = await askLLM(
      "Bạn là trợ lý giao hàng của Kirk's Ecommerce Shop. Viết 2-3 câu tiếng Việt, thân thiện, giải thích vì sao phương án đã chọn phù hợp. " +
        "Chỉ dùng dữ kiện trong JSON, không bịa số liệu. Nếu có phương án bị loại thì nói ngắn gọn lý do.",
      JSON.stringify(facts),
      350
    );

    return {
      recommended: best.method,
      options,
      weather,
      weightKg,
      distanceKm,
      priority,
      explanation: text ?? fallback,
      usedAI: !!text
    };
  }
};
