// domain.product — Bundle templates and the budget optimiser behind "build me a full set for N million".
// Pure rules: which items a setup needs per usage (several variants, e.g. laptop vs PC), and which combination of real
// products gives the best set within the budget. Variants are offered side by side as "Set 1 / Set 2 / Set 3".
import type { Product } from "./product";

export type BundleUsage = "gaming" | "study" | "creator" | "mobile" | "entertainment";

type Matchable = Pick<Product, "name" | "category" | "description">;

export type BundleSlot = {
  key: string;
  label: string;
  /** true = the set is not a set without it (the optimiser tries hard to fill it). */
  core: boolean;
  weight: number;
  match: (p: Matchable) => boolean;
  /** Extra quality for products that suit this slot better (e.g. a gaming laptop for a gaming setup). */
  bonus?: (p: Matchable) => number;
};

export type BundleVariant = { id: string; label: string; slots: BundleSlot[] };

const name = (re: RegExp) => (p: Pick<Product, "name">) => re.test(p.name.toLowerCase());
const LAPTOP = (p: Pick<Product, "name">) => /laptop/i.test(p.name) && !/stand/i.test(p.name);
const EARPHONE = (p: Pick<Product, "name">) => /headphone|buds|airpods|tai nghe|headset/i.test(p.name) && !/\bvr\b/i.test(p.name);
const PART = (re: RegExp) => (p: Matchable) => p.category === "PC" && re.test(p.name.toLowerCase());

export const USAGE_LABEL: Record<BundleUsage, string> = {
  gaming: "Gaming setup",
  study: "Học tập / văn phòng",
  creator: "Quay chụp / sáng tạo nội dung",
  mobile: "Di động & phụ kiện",
  entertainment: "Giải trí tại nhà"
};

const gamingPeripherals: BundleSlot[] = [
  { key: "mouse", label: "Chuột gaming", core: false, weight: 1.2, match: name(/mouse/) },
  { key: "keyboard", label: "Bàn phím cơ", core: false, weight: 1.2, match: name(/keyboard/) },
  { key: "audio", label: "Tai nghe gaming", core: false, weight: 1, match: EARPHONE, bonus: (p) => (/gaming|rgb/i.test(p.name) ? 1.5 : 0) },
  { key: "monitor", label: "Màn hình", core: false, weight: 1, match: name(/monitor/), bonus: (p) => (/gaming/i.test(p.name) ? 1 : 0) }
];

export const BUNDLES: Record<BundleUsage, BundleVariant[]> = {
  gaming: [
    {
      id: "laptop",
      label: "Laptop gaming",
      slots: [
        { key: "laptop", label: "Laptop gaming", core: true, weight: 3, match: LAPTOP, bonus: (p) => (p.category === "Gaming" ? 6 : 0) },
        { key: "mouse", label: "Chuột gaming", core: true, weight: 1.5, match: name(/mouse/) },
        { key: "keyboard", label: "Bàn phím cơ", core: false, weight: 1, match: name(/keyboard/) },
        { key: "audio", label: "Tai nghe gaming", core: false, weight: 1, match: EARPHONE, bonus: (p) => (/gaming|rgb/i.test(p.name) ? 1.5 : 0) },
        { key: "pad", label: "Tay cầm", core: false, weight: 0.6, match: name(/gamepad/) },
        { key: "ssd", label: "Ổ SSD mở rộng", core: false, weight: 0.6, match: name(/ssd/) }
      ]
    },
    {
      id: "prebuilt",
      label: "PC gaming dựng sẵn",
      slots: [
        { key: "pc", label: "PC gaming dựng sẵn", core: true, weight: 3, match: (p) => p.category === "PC" && /^kirk pc/i.test(p.name) },
        ...gamingPeripherals.map((s) => ({ ...s, core: s.key === "monitor" }))
      ]
    },
    {
      id: "custom",
      label: "PC gaming tự lắp",
      slots: [
        { key: "cpu", label: "CPU", core: true, weight: 2, match: PART(/intel core/) },
        { key: "board", label: "Mainboard", core: true, weight: 1.5, match: PART(/z690|mainboard/) },
        { key: "gpu", label: "Card đồ họa", core: true, weight: 3, match: PART(/geforce|radeon/) },
        { key: "ram", label: "RAM 32GB", core: true, weight: 1, match: PART(/ram/) },
        { key: "psu", label: "Nguồn", core: true, weight: 1, match: PART(/psu/) },
        { key: "case", label: "Vỏ case", core: true, weight: 0.8, match: PART(/case/) },
        { key: "ssd", label: "Ổ SSD", core: true, weight: 0.8, match: name(/ssd/) },
        { key: "cooler", label: "Tản nhiệt CPU", core: false, weight: 0.5, match: PART(/cooler/) },
        ...gamingPeripherals
      ]
    }
  ],
  study: [
    {
      id: "laptop",
      label: "Laptop học tập",
      slots: [
        { key: "laptop", label: "Laptop", core: true, weight: 3, match: LAPTOP, bonus: (p) => (p.category === "Laptops" ? 1 : 0) },
        { key: "audio", label: "Tai nghe", core: false, weight: 1, match: EARPHONE },
        { key: "stand", label: "Giá đỡ laptop", core: false, weight: 0.8, match: name(/laptop stand/) },
        { key: "power", label: "Sạc dự phòng", core: false, weight: 0.8, match: name(/power bank/) },
        { key: "mouse", label: "Chuột", core: false, weight: 0.8, match: name(/mouse/) },
        { key: "ssd", label: "Ổ SSD", core: false, weight: 0.6, match: name(/ssd/) },
        { key: "webcam", label: "Webcam học online", core: false, weight: 0.6, match: name(/webcam/) }
      ]
    },
    {
      id: "tablet",
      label: "Máy tính bảng học online",
      slots: [
        { key: "tablet", label: "Máy tính bảng", core: true, weight: 3, match: (p) => p.category === "Electronics" && /tab|ipad|matepad/i.test(p.name) },
        { key: "audio", label: "Tai nghe", core: false, weight: 1, match: EARPHONE },
        { key: "mic", label: "Micro", core: false, weight: 0.7, match: name(/microphone/) },
        { key: "power", label: "Sạc dự phòng", core: false, weight: 0.7, match: name(/power bank/) }
      ]
    }
  ],
  creator: [
    {
      id: "drone",
      label: "Flycam quay chụp",
      slots: [
        { key: "drone", label: "Flycam / Drone", core: true, weight: 3, match: (p) => p.category === "Drones" },
        { key: "ssd", label: "Ổ SSD lưu video", core: false, weight: 1, match: name(/ssd/) },
        { key: "power", label: "Sạc dự phòng", core: false, weight: 0.8, match: name(/power bank/) },
        { key: "audio", label: "Tai nghe", core: false, weight: 0.7, match: EARPHONE },
        { key: "monitor", label: "Màn hình dựng phim", core: false, weight: 0.7, match: name(/monitor/) }
      ]
    },
    {
      id: "studio",
      label: "Studio dựng phim / stream",
      slots: [
        { key: "laptop", label: "Laptop dựng phim", core: true, weight: 3, match: LAPTOP },
        { key: "monitor", label: "Màn hình 4K", core: false, weight: 1.2, match: name(/monitor/) },
        { key: "mic", label: "Micro stream", core: false, weight: 1, match: name(/microphone/) },
        { key: "webcam", label: "Webcam", core: false, weight: 0.8, match: name(/webcam/) },
        { key: "ssd", label: "Ổ SSD lưu video", core: false, weight: 0.8, match: name(/ssd/) },
        { key: "audio", label: "Tai nghe", core: false, weight: 0.7, match: EARPHONE }
      ]
    }
  ],
  mobile: [
    {
      id: "phone",
      label: "Điện thoại & phụ kiện",
      slots: [
        { key: "phone", label: "Điện thoại", core: true, weight: 3, match: (p) => p.category === "Phones" },
        { key: "audio", label: "Tai nghe", core: false, weight: 1.2, match: EARPHONE },
        { key: "power", label: "Sạc dự phòng", core: false, weight: 1, match: name(/power bank/) },
        { key: "watch", label: "Đồng hồ thông minh", core: false, weight: 0.8, match: name(/watch/) }
      ]
    }
  ],
  entertainment: [
    {
      id: "tablet",
      label: "Máy tính bảng giải trí",
      slots: [
        { key: "tablet", label: "Máy tính bảng", core: true, weight: 3, match: (p) => p.category === "Electronics" && /tab|ipad|matepad/i.test(p.name) },
        { key: "audio", label: "Tai nghe", core: false, weight: 1, match: EARPHONE },
        { key: "speaker", label: "Loa Bluetooth", core: false, weight: 0.9, match: name(/speaker/) },
        { key: "power", label: "Sạc dự phòng", core: false, weight: 0.7, match: name(/power bank/) }
      ]
    },
    {
      id: "corner",
      label: "Góc giải trí: màn hình + game",
      slots: [
        { key: "monitor", label: "Màn hình", core: true, weight: 3, match: name(/monitor/) },
        { key: "pad", label: "Tay cầm", core: false, weight: 1, match: name(/gamepad/) },
        { key: "speaker", label: "Loa Bluetooth", core: false, weight: 1, match: name(/speaker/) },
        { key: "audio", label: "Tai nghe", core: false, weight: 0.8, match: EARPHONE },
        { key: "vr", label: "Kính thực tế ảo", core: false, weight: 0.8, match: name(/\bvr\b/) }
      ]
    }
  ]
};

/** Picks the usage from free text ("setup gaming 30 triệu", "laptop cho sinh viên"...). */
export function detectUsage(text: string): BundleUsage | null {
  const t = ` ${text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d")} `;
  const has = (re: RegExp) => re.test(t);
  if (has(/game|gaming|esports|choi game|\bpc\b|lap rap|build pc|may bo/)) return "gaming";
  if (has(/quay|chup|flycam|drone|vlog|sang tao|content|youtuber|dung phim|stream/)) return "creator";
  if (has(/hoc|sinh vien|van phong|lam viec|office|study|lap trinh/)) return "study";
  if (has(/xem phim|giai tri|nghe nhac|entertainment|ipad|tablet|may tinh bang/)) return "entertainment";
  if (has(/dien thoai|phone|di dong|mobile|iphone|samsung/)) return "mobile";
  return null;
}

export type BundleCandidate = Pick<Product, "id" | "name" | "price" | "stock" | "category" | "rating" | "sold" | "description" | "image">;
export type BundlePick = { slot: BundleSlot; product: BundleCandidate };
export type BundlePlan = {
  id: string;
  label: string;
  picks: BundlePick[];
  total: number;
  missingCore: string[];
  skipped: string[];
  minCoreCost: number;
};

const quality = (p: BundleCandidate) => p.rating + 0.15 * Math.log(1 + p.sold);
const CANDIDATES_PER_SLOT = 3;

/** Best combination within the budget for one variant: maximise slot-weighted quality, use the budget well, never repeat a product. */
export function planVariant(variant: BundleVariant, budget: number, products: BundleCandidate[]): BundlePlan {
  const slots = variant.slots;
  const inStock = products.filter((p) => p.stock > 0);

  const options = slots.map((slot) => {
    const matching = inStock.filter((p) => slot.match(p));
    const score = (p: BundleCandidate) => quality(p) + (slot.bonus?.(p) ?? 0);
    const top = [...matching].sort((a, b) => score(b) - score(a)).slice(0, CANDIDATES_PER_SLOT);
    const cheapest = [...matching].sort((a, b) => a.price - b.price)[0];
    if (cheapest && !top.includes(cheapest)) top.push(cheapest);
    return top.map((p) => ({ product: p, score: score(p) }));
  });

  let best: { value: number; chosen: (number | null)[] } | null = null;
  const chosen: (number | null)[] = [];
  const used = new Set<number>();

  const dfs = (i: number, spent: number, value: number) => {
    if (i === slots.length) {
      const total = value + 4 * (spent / budget);
      if (!best || total > best.value) best = { value: total, chosen: [...chosen] };
      return;
    }
    const slot = slots[i];
    for (let k = 0; k < options[i].length; k++) {
      const { product, score } = options[i][k];
      if (used.has(product.id) || spent + product.price > budget) continue;
      used.add(product.id);
      chosen[i] = k;
      dfs(i + 1, spent + product.price, value + slot.weight * score);
      used.delete(product.id);
    }
    chosen[i] = null;
    dfs(i + 1, spent, value - (slot.core ? 1000 : 0)); // skipping a core slot is a last resort
  };
  dfs(0, 0, 0);

  const picks: BundlePick[] = [];
  const missingCore: string[] = [];
  const skipped: string[] = [];
  const result = best as { value: number; chosen: (number | null)[] } | null;
  slots.forEach((slot, i) => {
    const k = result?.chosen[i];
    if (k !== null && k !== undefined) picks.push({ slot, product: options[i][k].product });
    else if (slot.core) missingCore.push(slot.label);
    else skipped.push(slot.label);
  });

  // cheapest possible set of the core items: tells the customer what budget they would need
  const minCoreCost = slots.reduce(
    (sum, s, i) => (s.core && options[i].length ? sum + Math.min(...options[i].map((o) => o.product.price)) : sum),
    0
  );

  return { id: variant.id, label: variant.label, picks, total: picks.reduce((s, p) => s + p.product.price, 0), missingCore, skipped, minCoreCost };
}

/**
 * Up to 3 different sets for the same need and budget. Every variant that can be afforded is one set; when fewer than
 * three fit, a cheaper "saver" version of the best set (about 70% of the budget) is added so the customer can compare.
 */
export function planBundles(usage: BundleUsage, budget: number, products: BundleCandidate[]): { plans: BundlePlan[]; unaffordable: BundlePlan[] } {
  const all = BUNDLES[usage].map((v) => planVariant(v, budget, products));
  const plans = all.filter((p) => p.picks.length > 0 && p.missingCore.length === 0);
  const unaffordable = all.filter((p) => !plans.includes(p));

  const fingerprint = (p: BundlePlan) => p.picks.map((x) => x.product.id).sort((a, b) => a - b).join(",");
  const seen = new Set(plans.map(fingerprint));
  if (plans.length > 0 && plans.length < 3) {
    const base = BUNDLES[usage].find((v) => v.id === plans[0].id)!;
    const saver = planVariant({ ...base, id: `${base.id}-saver`, label: `${base.label} (tiết kiệm)` }, budget * 0.7, products);
    if (saver.picks.length > 0 && saver.missingCore.length === 0 && !seen.has(fingerprint(saver))) plans.push(saver);
  }
  return { plans: plans.slice(0, 3), unaffordable };
}

// ------------------------------------------------------- Checking sets proposed by the LLM
export type ProposedItem = { id: number; role: string };
export type ValidSet = { items: { role: string; product: BundleCandidate }[]; total: number };

/** The parts a self-built PC cannot miss; a set that contains one of them must contain all of them. */
const BUILD_PARTS: [string, RegExp][] = [
  ["CPU", /intel core/i],
  ["mainboard", /z690|mainboard/i],
  ["card đồ họa", /geforce|radeon/i],
  ["RAM", /\bram\b/i],
  ["nguồn", /psu/i],
  ["vỏ case", /\bcase\b/i]
];

/**
 * Accepts an LLM proposal only if every product exists and is in stock, none repeats, the total fits the budget
 * (and uses at least half of it), and a self-built PC is complete. Returns the reason when it is rejected.
 */
export function checkProposedSet(
  proposed: ProposedItem[],
  budget: number,
  products: BundleCandidate[]
): { ok: true; set: ValidSet } | { ok: false; reason: string } {
  if (proposed.length < 2) return { ok: false, reason: "too few items" };
  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set<number>();
  const items: ValidSet["items"] = [];
  for (const it of proposed) {
    const product = byId.get(it.id);
    if (!product) return { ok: false, reason: `unknown product ${it.id}` };
    if (product.stock <= 0) return { ok: false, reason: `${product.name} is out of stock` };
    if (seen.has(it.id)) return { ok: false, reason: `${product.name} repeated` };
    seen.add(it.id);
    items.push({ role: it.role, product });
  }
  const total = items.reduce((s, i) => s + i.product.price, 0);
  if (total > budget) return { ok: false, reason: "over budget" };
  if (total < budget * 0.5) return { ok: false, reason: "uses less than half of the budget" };
  const has = BUILD_PARTS.map(([, re]) => items.some((i) => re.test(i.product.name) && i.product.category === "PC"));
  if (has.some(Boolean) && !has.every(Boolean)) {
    const missing = BUILD_PARTS.filter((_, i) => !has[i]).map(([n]) => n).join(", ");
    return { ok: false, reason: `incomplete PC build, missing ${missing}` };
  }
  return { ok: true, set: { items, total } };
}
