// application.service — Intelligent shopping assistant (Feature 1: product recommendations).
// Parses natural-language needs (Vietnamese/English) -> queries the REAL product
// database -> ranks by relevance/price/specs/availability -> explains each pick.
// Never invents products: every recommendation comes from productRepository.
import { productRepository } from "../../infrastructure/repository/productRepository";
import type { Product } from "../../domain/product/product";

export type ShoppingIntent = {
  maxPrice?: number;
  minPrice?: number;
  categories: string[]; // real DB category names, e.g. "Laptops"
  keywords: string[]; // english search terms for the repository
  anchors: string[]; // keywords coming from category signals (weigh more than usage words)
  usages: string[]; // human-readable needs, e.g. "chơi game"
  sort?: "price-asc" | "price-desc";
};

export type RecommendedItem = {
  id: number;
  name: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  rating: number;
  reason: string; // why this product fits (Vietnamese)
  meetsBudget: boolean;
};

export type RecommendationResult = {
  intent: ShoppingIntent;
  items: RecommendedItem[];
  relaxed: string[]; // requirements that had to be loosened (Vietnamese)
};

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
// Punctuation-free form so trailing "?" / "," can't break phrase matching ("lập trình?").
const clean = (t: string) => norm(t).replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ");

// [phrase, DB category, extra search keywords] — longest phrases are consumed first.
const CATEGORY_SIGNALS: [string, string, string[]][] = [
  ["may tinh xach tay", "Laptops", ["laptop"]],
  ["may tinh bang", "Electronics", ["tablet"]],
  ["sac du phong", "Accessories", ["power bank"]],
  ["pin du phong", "Accessories", ["power bank"]],
  ["kinh thuc te ao", "Gaming", ["vr", "headset"]],
  ["camera may tinh", "Accessories", ["webcam"]],
  ["tai nghe", "Accessories", ["headphones", "earbuds", "buds"]],
  ["ban phim", "Accessories", ["keyboard"]],
  ["man hinh", "Accessories", ["monitor"]],
  ["dong ho", "Accessories", ["watch"]],
  ["dien thoai", "Phones", ["phone", "smartphone"]],
  ["may tinh", "Laptops", ["laptop"]],
  ["choi game", "Gaming", ["gaming"]],
  ["smartphone", "Phones", ["phone", "smartphone"]],
  ["power bank", "Accessories", ["power bank"]],
  ["laptop", "Laptops", ["laptop"]],
  ["macbook", "Laptops", ["laptop"]],
  ["iphone", "Phones", ["iphone", "phone"]],
  ["galaxy", "Phones", ["galaxy", "phone"]],
  ["pixel", "Phones", ["pixel", "phone"]],
  ["pura", "Phones", ["pura", "phone"]],
  ["huawei", "Phones", ["huawei", "phone"]],
  ["samsung", "Phones", ["galaxy", "samsung"]],
  ["tablet", "Electronics", ["tablet"]],
  ["ipad", "Electronics", ["tablet", "ipad"]],
  ["matepad", "Electronics", ["tablet", "matepad"]],
  ["drone", "Drones", ["drone"]],
  ["flycam", "Drones", ["drone"]],
  ["mavic", "Drones", ["mavic", "drone"]],
  ["avata", "Drones", ["avata", "drone"]],
  ["airpods", "Accessories", ["earbuds", "airpods", "buds"]],
  ["earbuds", "Accessories", ["earbuds", "buds"]],
  ["buds", "Accessories", ["earbuds", "buds"]],
  ["speaker", "Accessories", ["speaker"]],
  ["keyboard", "Accessories", ["keyboard"]],
  ["chuot", "Accessories", ["mouse"]],
  ["mouse", "Accessories", ["mouse"]],
  ["smartwatch", "Accessories", ["watch"]],
  ["watch", "Accessories", ["watch"]],
  ["webcam", "Accessories", ["webcam"]],
  ["headset", "Gaming", ["headset"]],
  ["gaming", "Gaming", ["gaming"]],
  ["ssd", "Accessories", ["ssd"]],
  ["stand", "Accessories", ["stand"]],
  ["loa", "Accessories", ["speaker"]],
  ["phone", "Phones", ["phone"]]
];

// Single tokens too short/ambiguous for phrase matching.
const TOKEN_CATEGORY: Record<string, [string, string[]]> = {
  game: ["Gaming", ["gaming"]],
  dji: ["Drones", ["dji", "drone"]],
  nitro: ["Laptops", ["nitro", "laptop"]],
  vr: ["Gaming", ["vr", "headset"]]
};

// [phrases, human-readable need, search keywords]
const USAGE_SIGNALS: [string[], string, string[]][] = [
  [["choi game", "gaming", "esports"], "chơi game", ["gaming", "rtx", "144hz"]],
  [["lap trinh", "programming", "developer", "code", "coding"], "lập trình", ["ram", "ssd"]],
  [["chup anh", "chup hinh", "camera", "quay phim", "quay video", "record", "vlog"], "chụp ảnh/quay video", ["camera", "4k", "mp"]],
  [["du lich", "travel"], "du lịch", ["camera", "drone", "4k"]],
  [["pin trau", "pin lau", "long battery", "battery life", "pin tot"], "pin dùng lâu", ["battery", "mah"]],
  [["nghe nhac", "am thanh", "bass", "chong on", "anc"], "nghe nhạc", ["bluetooth", "bass", "noise"]],
  [["the thao", "suc khoe", "chay bo", "nhip tim"], "thể thao/sức khỏe", ["gps", "spo2"]],
  [["hoc tap", "van phong", "sinh vien", "office"], "học tập/văn phòng", ["battery"]]
];

const UNIT: Record<string, number> = {
  trieu: 1e6,
  tr: 1e6,
  million: 1e6,
  ty: 1e9,
  nghin: 1e3,
  ngan: 1e3,
  k: 1e3
};
const AMOUNT = "(\\d+(?:[.,]\\d+)?)\\s*(trieu|million|tr|ty|nghin|ngan|k)\\b";

function parseBudget(t: string): Pick<ShoppingIntent, "maxPrice" | "minPrice" | "sort"> {
  const out: Pick<ShoppingIntent, "maxPrice" | "minPrice" | "sort"> = {};
  const val = (n: string, u: string) => parseFloat(n.replace(",", ".")) * (UNIT[u] || 1);
  let m = t.match(new RegExp(`(duoi|under|below|less than|up to|toi da|khong qua|within|trong tam)\\s*${AMOUNT}`));
  if (m && val(m[2], m[3]) >= 100000) out.maxPrice = val(m[2], m[3]);
  m = t.match(new RegExp(`(tren|over|above|from|tu)\\s*${AMOUNT}`));
  if (m && val(m[2], m[3]) >= 100000) out.minPrice = val(m[2], m[3]);
  m = t.match(new RegExp(`(khoang|around|about|tam|~)\\s*${AMOUNT}`));
  if (m && val(m[2], m[3]) >= 100000) {
    out.minPrice = val(m[2], m[3]) * 0.8;
    out.maxPrice = val(m[2], m[3]) * 1.2;
  }
  // Bare "15 triệu" / "20 million" means "my budget is X" -> treat as max price.
  if (out.maxPrice === undefined) {
    m = t.match(new RegExp(`\\b${AMOUNT}`));
    if (m && val(m[1], m[2]) >= 100000) out.maxPrice = val(m[1], m[2]);
  }
  if (/re nhat|gia thap nhat|cheapest|gia re/.test(t)) out.sort = "price-asc";
  else if (/dat nhat|cao cap nhat|dat tien nhat|most expensive/.test(t)) out.sort = "price-desc";
  return out;
}

export function parseShoppingIntent(text: string): ShoppingIntent {
  const cleaned = ` ${clean(text)} `;
  let rest = cleaned;
  const categories: string[] = [];
  const keywords = new Set<string>();
  const anchors = new Set<string>();
  for (const [phrase, cat, en] of [...CATEGORY_SIGNALS].sort((a, b) => b[0].length - a[0].length)) {
    if (rest.includes(` ${phrase} `)) {
      if (!categories.includes(cat)) categories.push(cat);
      en.forEach((w) => {
        keywords.add(w);
        anchors.add(w);
      });
      rest = rest.split(` ${phrase} `).join(" ");
    }
  }
  for (const tok of rest.split(/[^a-z0-9]+/)) {
    const hit = TOKEN_CATEGORY[tok];
    if (hit) {
      if (!categories.includes(hit[0])) categories.push(hit[0]);
      hit[1].forEach((w) => {
        keywords.add(w);
        anchors.add(w);
      });
    }
  }
  const usages: string[] = [];
  const padded = cleaned;
  for (const [phrases, label, en] of USAGE_SIGNALS) {
    if (phrases.some((p) => padded.includes(` ${p} `) || padded.split(/[^a-z0-9]+/).includes(p))) {
      if (!usages.includes(label)) usages.push(label);
      en.forEach((w) => keywords.add(w));
    }
  }
  // Standalone "game" token (e.g. "game laptop") that the phrase pass missed.
  if (!usages.includes("chơi game") && padded.split(/[^a-z0-9]+/).includes("game")) {
    usages.push("chơi game");
    ["gaming", "rtx", "144hz"].forEach((w) => keywords.add(w));
    if (!categories.includes("Gaming")) categories.push("Gaming");
  }
  return {
    ...parseBudget(clean(text)),
    categories,
    keywords: Array.from(keywords),
    anchors: Array.from(anchors),
    usages
  };
}

const SEEKER_RE =
  /(mua|can |need|want|goi y|tu van|recommend|suggest|tim|chon|lua chon|nen |should|cho minh|cho toi|budget|duoi|under|tren|over|re nhat|tot nhat|best|danh cho)/;
const NON_SHOPPING_RE = /(phi ship|van chuyen|giao hang|thanh toan|doi tra|bao hanh|dang nhap|mat khau|tra cuu|kiem tra don|don hang cua|huy don)/;

// True when the customer asks what to buy (not order tracking / policy / specific-product lookup).
export function isRecommendationRequest(text: string): boolean {
  if (/ord-\d{4}-\d{5}/i.test(text)) return false;
  const t = ` ${clean(text)} `;
  const intent = parseShoppingIntent(text);
  const hasSignal = intent.categories.length > 0 || intent.usages.length > 0 || intent.maxPrice !== undefined;
  if (!hasSignal) return false;
  if (NON_SHOPPING_RE.test(t) && !SEEKER_RE.test(t)) return false;
  // A bare product mention with no buying language ("Laptop Pro 14 giá bao nhiêu?") stays on the lookup path.
  if (intent.categories.length > 0 && !SEEKER_RE.test(t) && intent.maxPrice === undefined && intent.usages.length === 0)
    return false;
  return true;
}

const fmtShort = (n: number) =>
  n >= 1e9
    ? `${(n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ`
    : n >= 1e6
      ? `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`
      : `${n.toLocaleString("vi-VN")}đ`;
const fmtFull = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

type Scored = { p: Product; s: number };

function scoreRows(rows: Product[], words: string[], anchors: string[] = []): Scored[] {
  const hit = (w: string, p: Product) => {
    const n = p.name.toLowerCase();
    const c = p.category.toLowerCase();
    const d = p.description.toLowerCase();
    return n.includes(w) || c.includes(w) || d.includes(w);
  };
  const df = new Map(words.map((w) => [w, rows.filter((p) => hit(w, p)).length]));
  const n = rows.length || 1;
  return rows.map((p) => {
    let s = 0;
    for (const w of words) {
      const d = df.get(w) || 0;
      if (!d) continue;
      const where = p.name.toLowerCase().includes(w) ? 3 : p.category.toLowerCase().includes(w) ? 2 : 1;
      s += where * (n / d);
    }
    // Category anchors ("iphone", "laptop", "drone") outrank loose usage words.
    const hay = `${p.name} ${p.category} ${p.description}`.toLowerCase();
    s += anchors.filter((w) => hay.includes(w)).length * 8;
    s += p.rating * 2 + Math.min(p.sold / 200, 5);
    return { p, s };
  });
}

function matchedWords(p: Product, words: string[]): string[] {
  const hay = `${p.name} ${p.category} ${p.description}`.toLowerCase();
  return words.filter((w) => hay.includes(w)).slice(0, 3);
}

function buildReason(p: Product, intent: ShoppingIntent, words: string[], effMax?: number): string {
  const parts: string[] = [];
  const budget = effMax ?? intent.maxPrice;
  if (budget !== undefined) {
    parts.push(
      p.price <= budget
        ? `Giá ${fmtFull(p.price)} vừa ngân sách ${fmtShort(budget)} của bạn`
        : `Giá ${fmtFull(p.price)} (vượt ngân sách ${fmtShort(budget)})`
    );
  } else {
    parts.push(`Giá ${fmtFull(p.price)}`);
  }
  if (intent.categories.includes(p.category)) parts.push(`đúng nhóm ${p.category}`);
  const mw = matchedWords(p, words);
  if (mw.length && intent.usages.length)
    parts.push(`có ${mw.join(", ")} phù hợp nhu cầu ${intent.usages.join(", ")}`);
  else if (mw.length) parts.push(`liên quan: ${mw.join(", ")}`);
  parts.push(`đánh giá ${p.rating}★ · ${p.sold} lượt mua`);
  parts.push(p.stock > 0 ? `còn ${p.stock} chiếc` : "đang HẾT HÀNG — bạn chưa thể mua ngay");
  return parts.join("; ");
}

async function pool(
  keywords: string[],
  categories: string[],
  minPrice?: number,
  maxPrice?: number,
  sort?: string
): Promise<Product[]> {
  if (categories.length === 1) {
    return productRepository.search(
      { keywords: keywords.length ? keywords : undefined, category: categories[0], minPrice, maxPrice },
      sort || "popular",
      40
    );
  }
  const rows = await productRepository.search(
    { keywords: keywords.length ? keywords : undefined, minPrice, maxPrice },
    sort || "popular",
    40
  );
  return categories.length ? rows.filter((p) => categories.includes(p.category)) : rows;
}

function orderItems(scored: Scored[]): { inStock: Product[]; out: Product[] } {
  const byScore = (a: Scored, b: Scored) => b.s - a.s || b.p.rating - a.p.rating || a.p.price - b.p.price;
  return {
    inStock: scored
      .filter((x) => x.p.stock > 0)
      .sort(byScore)
      .map((x) => x.p),
    out: scored
      .filter((x) => x.p.stock <= 0)
      .sort(byScore)
      .map((x) => x.p)
  };
}

const catLabel = (cats: string[]) => cats.join("/");

// Main use case: recommend 2-5 real products for a natural-language request.
export async function recommend(rawText: string): Promise<RecommendationResult> {
  const intent = parseShoppingIntent(rawText);
  const relaxed: string[] = [];
  const toItems = (list: Product[], effMax?: number) =>
    list.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      image: p.image,
      category: p.category,
      rating: p.rating,
      reason: buildReason(p, intent, intent.keywords, effMax),
      meetsBudget: (effMax ?? intent.maxPrice) === undefined || p.price <= (effMax ?? intent.maxPrice!)
    }));

  // Pass 1: exact constraints.
  let rows = await pool(intent.keywords, intent.categories, intent.minPrice, intent.maxPrice, intent.sort);
  let { inStock, out } = orderItems(scoreRows(rows, intent.keywords, intent.anchors));
  let picked: Product[] = inStock.slice(0, 5);
  let effMax: number | undefined;
  if (picked.length < 2 && out.length) {
    const need = Math.min(3 - picked.length, out.length);
    picked = [...picked, ...out.slice(0, need)];
    if (inStock.length === 0)
      relaxed.push("Các mẫu đúng nhu cầu nhất hiện đang HẾT HÀNG, bạn tham khảo trước và quay lại sau nhé.");
  }

  // Honesty note: the single best-matching model costs more than the budget.
  if (picked.length && intent.maxPrice !== undefined) {
    const noBudget = await pool(intent.keywords, intent.categories, intent.minPrice, undefined, intent.sort);
    const best = orderItems(scoreRows(noBudget, intent.keywords, intent.anchors)).inStock[0];
    if (best && best.price > intent.maxPrice && !picked.some((p) => p.id === best.id))
      relaxed.push(
        `Mẫu đúng nhu cầu nhất là "${best.name}" (${fmtFull(best.price)}) nhưng vượt ngân sách ${fmtShort(intent.maxPrice)}; các gợi ý trên vừa túi tiền hơn.`
      );
  }

  // Pass 2: no match within budget -> widen it by ~50%.
  if (!picked.length && intent.maxPrice !== undefined) {
    const wider = Math.round(intent.maxPrice * 1.5);
    rows = await pool(intent.keywords, intent.categories, intent.minPrice, wider, intent.sort);
    ({ inStock, out } = orderItems(scoreRows(rows, intent.keywords, intent.anchors)));
    picked = inStock.slice(0, 5);
    if (picked.length) {
      effMax = wider;
      relaxed.push(`Không có mẫu nào dưới ${fmtShort(intent.maxPrice)} nên mình nới ngân sách lên khoảng ${fmtShort(wider)}.`);
    }
  }

  // Pass 3: drop the budget entirely, keep category + needs.
  if (!picked.length && intent.maxPrice !== undefined) {
    rows = await pool(intent.keywords, intent.categories, intent.minPrice, undefined, intent.sort);
    ({ inStock } = orderItems(scoreRows(rows, intent.keywords, intent.anchors)));
    picked = inStock.slice(0, 5);
    if (picked.length)
      relaxed.push(`Vẫn chưa có mẫu nào trong tầm ${fmtShort(intent.maxPrice)} — đây là các mẫu gần nhu cầu nhất (giá cao hơn).`);
  }

  // Pass 4: drop the category, keep keywords (wrong-guess safety).
  if (!picked.length && intent.categories.length) {
    rows = await pool(intent.keywords, [], intent.minPrice, intent.maxPrice, intent.sort);
    ({ inStock } = orderItems(scoreRows(rows, intent.keywords, intent.anchors)));
    picked = inStock.slice(0, 5);
    if (picked.length) relaxed.push(`Mình mở rộng ra ngoài nhóm ${catLabel(intent.categories)} để tìm mẫu phù hợp.`);
  }

  // Pass 5: popular in-stock fallback — still 100% real products.
  if (!picked.length) {
    const rows = await productRepository.search({ minPrice: intent.minPrice }, "popular", 20);
    picked = rows.filter((p) => p.stock > 0).slice(0, 4);
    relaxed.push("Shop hiện chưa có mẫu đúng nhu cầu này; đây là các sản phẩm bán chạy bạn có thể tham khảo.");
  }

  return { intent, items: toItems(picked.slice(0, 5), effMax), relaxed };
}

// Block fed to the LLM so it presents exactly these products with their reasons.
export function formatForLLM(rec: RecommendationResult): string {
  const lines: string[] = ["KHÁCH ĐANG NHỜ TƯ VẤN MUA SẮM (gợi ý 2-5 sản phẩm)."];
  const need: string[] = [];
  if (rec.intent.categories.length) need.push(`nhóm ${catLabel(rec.intent.categories)}`);
  if (rec.intent.maxPrice !== undefined) need.push(`ngân sách tối đa ${fmtShort(rec.intent.maxPrice)}`);
  if (rec.intent.minPrice !== undefined) need.push(`từ ${fmtShort(rec.intent.minPrice)} trở lên`);
  if (rec.intent.usages.length) need.push(`mục đích: ${rec.intent.usages.join(", ")}`);
  if (need.length) lines.push(`Nhu cầu hiểu được: ${need.join("; ")}.`);
  lines.push("SẢN PHẨM ĐỀ XUẤT (CHỈ dùng các món này, đúng thứ tự):");
  rec.items.forEach((p, i) => {
    lines.push(
      `${i + 1}. #${p.id} ${p.name} | ${fmtFull(p.price)} | ${p.stock > 0 ? `còn ${p.stock}` : "HẾT HÀNG"} | Lý do: ${p.reason}`
    );
  });
  if (rec.relaxed.length) lines.push(`LƯU Ý (nói rõ với khách): ${rec.relaxed.join(" ")}`);
  return lines.join("\n");
}

// Deterministic reply when no LLM key is configured — same real data, no AI needed.
export function formatFallbackReply(rec: RecommendationResult): string {
  const need: string[] = [];
  if (rec.intent.categories.length) need.push(`nhóm ${catLabel(rec.intent.categories)}`);
  if (rec.intent.maxPrice !== undefined) need.push(`ngân sách ${fmtShort(rec.intent.maxPrice)}`);
  if (rec.intent.usages.length) need.push(rec.intent.usages.join(", "));
  const head = need.length
    ? `Dựa trên nhu cầu (${need.join("; ")}), mình gợi ý ${rec.items.length} sản phẩm có thật trong shop:`
    : `Mình gợi ý ${rec.items.length} sản phẩm trong shop:`;
  const body = rec.items
    .map((p, i) => `${i + 1}. ${p.name} — ${fmtFull(p.price)}: ${p.reason}.`)
    .join("\n");
  const tail = rec.relaxed.length ? `\n${rec.relaxed.join(" ")}` : "";
  return `${head}\n${body}${tail}\nBạn bấm "Thêm vào giỏ" ngay dưới từng sản phẩm nhé!`;
}

export const recommendationService = {
  parseShoppingIntent,
  isRecommendationRequest,
  recommend,
  formatForLLM,
  formatFallbackReply
};
