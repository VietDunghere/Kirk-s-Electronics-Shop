// application.service — BundleService: "build me a full setup for this budget" (e.g. "setup gaming 30 triệu").
// With a Groq key the LLM designs up to 3 sets from the real catalog; every proposal is then CHECKED by the code
// (products exist, in stock, no repeats, total within budget, PC builds complete). Sets that fail the check are dropped.
// Without a key (or when too few sets pass), the rule-based templates + optimiser (domain.product.bundle) fill in.
import { productRepository } from "../../infrastructure/repository/productRepository";
import { askLLM } from "../../infrastructure/llm/groqClient";
import {
  BUNDLES,
  USAGE_LABEL,
  checkProposedSet,
  detectUsage,
  planBundles,
  type BundleCandidate,
  type BundlePlan,
  type BundleUsage,
  type ProposedItem
} from "../../domain/product/bundle";
import { parseShoppingIntent } from "./recommendationService";
import { AppError } from "./appError";

export type BundleInput = { text?: unknown; budget?: unknown; usage?: unknown };

export type BundleItem = {
  slot: string;
  core: boolean;
  reason: string;
  product: { id: number; name: string; price: number; stock: number; image: string; category: string; rating: number };
};

export type BundleOption = {
  id: string;
  label: string;
  /** "ai" = designed by the LLM and verified by the code; "rules" = built by the template optimiser. */
  source: "ai" | "rules";
  why: string;
  total: number;
  remaining: number;
  items: BundleItem[];
  notes: string[];
};

export type BundleResult = {
  usage: BundleUsage;
  usageLabel: string;
  budget: number;
  options: BundleOption[];
  summary: string;
  usedAI: boolean;
};

const MAX_SETS = 3;
const vnd = (n: number) => `${new Intl.NumberFormat("vi-VN").format(Math.round(n))}đ`;
const USAGES = Object.keys(BUNDLES) as BundleUsage[];

const itemOf = (product: BundleCandidate, slot: string, core: boolean): BundleItem => ({
  slot,
  core,
  reason: `${slot}: đánh giá ${product.rating.toFixed(1)}/5, đã bán ${product.sold}, còn ${product.stock} sản phẩm.`,
  product: {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    image: product.image,
    category: product.category,
    rating: product.rating
  }
});

function fromPlan(plan: BundlePlan, budget: number): BundleOption {
  const notes: string[] = [];
  if (plan.skipped.length) notes.push(`Chưa kèm (hết ngân sách hoặc hết hàng): ${plan.skipped.join(", ")}.`);
  return {
    id: plan.id,
    label: plan.label,
    source: "rules",
    why: "",
    total: plan.total,
    remaining: budget - plan.total,
    notes,
    items: plan.picks.map(({ slot, product }) => itemOf(product, slot.label, slot.core))
  };
}

// ----------------------------------------------------------------- LLM proposal
type RawSet = { name?: unknown; why?: unknown; items?: unknown };

/** Pulls the JSON object out of the model's reply (it may wrap it in text or a code fence). */
export function parseProposal(text: string): { sets: { name: string; why: string; items: ProposedItem[] }[]; summary: string } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as { summary?: unknown; sets?: unknown };
    if (!Array.isArray(data.sets)) return null;
    const sets = (data.sets as RawSet[]).map((s) => ({
      name: typeof s.name === "string" ? s.name.slice(0, 80) : "Bộ gợi ý",
      why: typeof s.why === "string" ? s.why.slice(0, 400) : "",
      items: (Array.isArray(s.items) ? (s.items as { id?: unknown; role?: unknown }[]) : [])
        .map((i) => ({ id: Number(i.id), role: typeof i.role === "string" ? i.role.slice(0, 40) : "Sản phẩm" }))
        .filter((i) => Number.isInteger(i.id))
    }));
    return { sets, summary: typeof data.summary === "string" ? data.summary.slice(0, 600) : "" };
  } catch {
    return null;
  }
}

async function proposeWithLLM(
  text: string,
  usage: BundleUsage,
  budget: number,
  products: BundleCandidate[]
): Promise<{ options: BundleOption[]; summary: string; rejected: string[] } | null> {
  const catalog = products
    .filter((p) => p.stock > 0)
    .map((p) => `${p.id}|${p.name}|${p.category}|${p.price}|${p.rating}`)
    .join("\n");

  const reply = await askLLM(
    "Bạn là chuyên gia tư vấn setup của Kirk's Ecommerce Shop. Nhiệm vụ: thiết kế 3 bộ sản phẩm KHÁC NHAU về hướng đi cho nhu cầu và ngân sách của khách, " +
      "CHỈ dùng sản phẩm trong CATALOG (id|tên|danh mục|giá VND|đánh giá). Quy tắc bắt buộc:\n" +
      "- Tổng giá mỗi bộ KHÔNG vượt ngân sách và nên dùng từ 80% ngân sách trở lên.\n" +
      "- Mỗi bộ gồm các món bổ trợ nhau, không lặp sản phẩm, không nhét món không liên quan.\n" +
      "- PC tự lắp phải đủ: CPU, mainboard, card đồ họa, RAM, nguồn, vỏ case, SSD (CPU/mainboard chỉ có dòng Intel LGA1700 nên luôn tương thích).\n" +
      "- Các bộ phải khác hướng (ví dụ laptop / PC dựng sẵn / PC tự lắp; hoặc flycam / studio...).\n" +
      'Trả về DUY NHẤT một JSON: {"summary":"2-3 câu tiếng Việt tổng quan","sets":[{"name":"tên bộ","why":"1-2 câu vì sao hợp","items":[{"id":number,"role":"vai trò món, ví dụ Laptop"}]}]}.',
    `Nhu cầu: ${USAGE_LABEL[usage]}\nYêu cầu của khách: ${text || "(không có)"}\nNgân sách: ${budget} VND\n\nCATALOG:\n${catalog}`,
    1800,
    0.3
  );
  if (!reply) return null;
  const proposal = parseProposal(reply);
  if (!proposal) return null;

  const options: BundleOption[] = [];
  const rejected: string[] = [];
  const fingerprints = new Set<string>();
  proposal.sets.slice(0, MAX_SETS + 1).forEach((s, idx) => {
    const check = checkProposedSet(s.items, budget, products);
    if (!check.ok) {
      rejected.push(`${s.name}: ${check.reason}`);
      return;
    }
    const fp = check.set.items.map((i) => i.product.id).sort((a, b) => a - b).join(",");
    if (fingerprints.has(fp)) return;
    fingerprints.add(fp);
    options.push({
      id: `ai-${idx}`,
      label: s.name,
      source: "ai",
      why: s.why,
      total: check.set.total,
      remaining: budget - check.set.total,
      notes: [],
      items: check.set.items.map((i) => itemOf(i.product, i.role, true))
    });
  });
  return { options, summary: proposal.summary, rejected };
}

export const bundleService = {
  async build(input: BundleInput): Promise<BundleResult> {
    const text = typeof input.text === "string" ? input.text.slice(0, 300) : "";
    const budget = Number(input.budget) > 0 ? Number(input.budget) : parseShoppingIntent(text).maxPrice;
    if (!budget || budget < 500_000) throw new AppError(400, "Vui lòng nhập ngân sách, ví dụ: 30 triệu.");
    const usage = USAGES.includes(input.usage as BundleUsage) ? (input.usage as BundleUsage) : detectUsage(text);
    if (!usage) throw new AppError(400, "Bạn muốn setup cho mục đích gì? Ví dụ: gaming, học tập, quay chụp, giải trí.");

    const products = await productRepository.search({}, undefined, 500);

    // 1) the LLM designs the sets, the code verifies them
    const ai = await proposeWithLLM(text, usage, budget, products);
    const options: BundleOption[] = ai ? [...ai.options] : [];
    if (ai?.rejected.length) console.warn("Bundle: rejected AI sets ->", ai.rejected.join(" | "));

    // 2) rule-based templates fill the remaining places (or everything, when there is no key / the LLM failed)
    const { plans, unaffordable } = planBundles(usage, budget, products);
    const known = new Set(options.map((o) => o.items.map((i) => i.product.id).sort((a, b) => a - b).join(",")));
    for (const plan of plans) {
      if (options.length >= MAX_SETS) break;
      const option = fromPlan(plan, budget);
      const fp = option.items.map((i) => i.product.id).sort((a, b) => a - b).join(",");
      if (!known.has(fp)) {
        known.add(fp);
        options.push(option);
      }
    }

    if (!options.length) {
      const need = Math.min(...unaffordable.map((p) => p.minCoreCost).filter((n) => n > 0));
      throw new AppError(
        400,
        `Ngân sách ${vnd(budget)} chưa đủ cho bộ ${USAGE_LABEL[usage]}.` + (Number.isFinite(need) ? ` Cần tối thiểu khoảng ${vnd(need)}.` : "")
      );
    }
    if (unaffordable.length && !options.some((o) => o.source === "ai")) {
      options[options.length - 1].notes.push(
        `Phương án khác chưa đủ ngân sách: ${unaffordable.map((p) => `${p.label} (cần ~${vnd(p.minCoreCost)})`).join("; ")}.`
      );
    }

    const fallback =
      `Mình gợi ý ${options.length} bộ ${USAGE_LABEL[usage]} cho ngân sách ${vnd(budget)}: ` +
      options.map((o, i) => `Bộ ${i + 1} – ${o.label} (${vnd(o.total)})`).join("; ") + ".";

    return {
      usage,
      usageLabel: USAGE_LABEL[usage],
      budget,
      options,
      summary: ai?.summary || fallback,
      usedAI: !!ai && ai.options.length > 0
    };
  }
};
