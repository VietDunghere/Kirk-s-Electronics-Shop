// application.service — Chatbot use case: server-side retrieval (synonyms + ranking) + Groq reply.
import { productRepository } from "../../infrastructure/repository/productRepository";
import { orderRepository } from "../../infrastructure/repository/orderRepository";
import { recommendationService } from "./recommendationService";
import { cartAssistantService, detectCartIntent } from "./cartAssistantService";
import { FREE_SHIP_THRESHOLD, SHIPPING_FEE } from "../../domain/order/order";
import { AppError } from "./appError";

export type ChatProduct = {
  id: number;
  name: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  rating: number;
};

export type RecommendedChatProduct = ChatProduct & { reason: string };

export type CartProposal = {
  proposalId: string;
  product: ChatProduct;
  quantity: number;
};

export type CartAction =
  | { type: "propose_add"; proposal: CartProposal }
  | {
      type: "added";
      product: ChatProduct;
      quantity: number;
      cart: { totalCount: number; subtotal: number };
      guest?: boolean;
    }
  | { type: "show_cart"; cart: { totalCount: number; subtotal: number }; lines: string[] };

export type ChatReply = {
  reply: string;
  products: ChatProduct[];
  recommendations?: RecommendedChatProduct[];
  cartAction?: CartAction;
};

export type ChatReplyOptions = {
  userId?: number | null;
  proposal?: { proposalId?: unknown; productId?: unknown; quantity?: unknown } | null;
  guestCart?: { productId?: unknown; qty?: unknown }[];
};

type Msg = { role: "user" | "assistant"; content: string };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const toChatProduct = (p: ChatProduct): ChatProduct => ({
  id: p.id,
  name: p.name,
  price: p.price,
  stock: p.stock,
  image: p.image,
  category: p.category,
  rating: p.rating
});

// Vietnamese words / brands -> English terms that appear in product names & descriptions.
const SYNONYMS: [string, string[]][] = [
  ["dien thoai", ["phone", "smartphone"]],
  ["may tinh bang", ["tablet"]],
  ["may tinh xach tay", ["laptop"]],
  ["may tinh", ["laptop"]],
  ["tai nghe", ["headphones", "earbuds"]],
  ["chuot", ["mouse"]],
  ["ban phim", ["keyboard"]],
  ["man hinh", ["monitor", "display"]],
  ["ghe", ["chair"]],
  ["loa", ["speaker"]],
  ["dong ho", ["watch"]],
  ["o cung", ["ssd"]],
  ["sac du phong", ["power bank"]],
  ["pin du phong", ["power bank"]],
  ["kinh thuc te ao", ["vr", "headset"]],
  ["thuc te ao", ["vr", "headset"]],
  ["kinh vr", ["vr", "headset"]],
  ["gia do", ["stand"]],
  ["de laptop", ["stand"]],
  ["camera may tinh", ["webcam"]],
  ["samsung", ["galaxy"]],
  ["apple", ["iphone"]],
  ["google", ["pixel"]],
  ["acer", ["nitro"]],
  ["choi game", ["gaming"]],
  ["game", ["gaming"]],
  ["khong day", ["wireless"]],
  ["chong nuoc", ["waterproof"]],
  ["chong on", ["noise"]]
];

const STOPWORDS = new Set(
  "co khong ko nao bao nhieu gia la the cho toi minh ban mua can muon va cua mot nhung nay do gi hay duoc con hang shop xin chao oi ah nhe vay thi se da dang tim xem muon hoi cac may mau loai san pham duoi tren khoang tam re nhat dat tu den the nao ra sao cai chiec bi".split(" ")
);

export const stripAccents = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

function expandQuery(q: string): string[] {
  let plain = ` ${stripAccents(q)} `;
  const words = new Set<string>();
  // Longest phrases first; a matched phrase is consumed so it can't match again as a shorter one ("tai nghe" vs "ghe").
  for (const [vi, en] of [...SYNONYMS].sort((x, y) => y[0].length - x[0].length)) {
    const needle = ` ${vi} `;
    if (plain.includes(needle)) {
      en.forEach((e) => e.split(" ").forEach((w) => words.add(w)));
      plain = plain.replace(needle, " ");
    }
  }
  plain
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
    .forEach((w) => words.add(w));
  return Array.from(words);
}

async function searchProducts(args: {
  query?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort?: string;
}): Promise<(ChatProduct & { description: string })[]> {
  const words = expandQuery(args.query || "");
  const sort = args.sort || "popular";

  const run = (category?: string) =>
    productRepository.search(
      { keywords: words, category, minPrice: args.min_price, maxPrice: args.max_price },
      sort,
      30
    );

  // Category is only a hint: retry without it so a wrong category never hides a real match.
  let rows = await run(args.category);
  if (!rows.length && args.category) rows = await run();

  // Rarer words count more: "galaxy" (1 product) beats "phone" (4 products), and stray tokens matching everything add ~nothing.
  type Row = { name: string; category: string; description: string };
  const hit = (w: string, p: Row) =>
    p.name.toLowerCase().includes(w) || p.category.toLowerCase().includes(w) || p.description.toLowerCase().includes(w);
  const weight = new Map(words.map((w) => [w, rows.filter((p) => hit(w, p)).length]));
  const score = (p: Row) =>
    words.reduce((n, w) => {
      const df = weight.get(w) || 0;
      if (!df) return n;
      const where = p.name.toLowerCase().includes(w)
        ? 3
        : p.category.toLowerCase().includes(w)
          ? 2
          : p.description.toLowerCase().includes(w)
            ? 1
            : 0;
      return n + where * (rows.length / df);
    }, 0);
  // Stable sort: relevance first for the default ordering, DB order (price/rating) otherwise.
  if (words.length && (!args.sort || args.sort === "popular")) rows.sort((a, b) => score(b) - score(a));

  return rows.slice(0, 6).map((p) => ({ ...toChatProduct(p), description: p.description }));
}

async function listAllProducts(): Promise<ChatProduct[]> {
  return (await productRepository.search({}, "popular", 100)).map(toChatProduct);
}

async function trackOrder(code: string) {
  const order = await orderRepository.findByCode(code.trim().toUpperCase());
  if (!order) return null;
  // Public tracking only: no shipping address / contact details.
  return {
    orderCode: order.orderCode,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    items: (order.items || []).map((i) => ({ name: i.productName, quantity: i.quantity, price: i.price }))
  };
}

const ORDER_CODE_RE = /ORD-\d{4}-\d{5}/i;

// "dưới 20 triệu" / "trên 500k" / "rẻ nhất" -> search filters.
function parseConstraints(text: string): { max_price?: number; min_price?: number; sort?: string } {
  const t = stripAccents(text);
  const out: { max_price?: number; min_price?: number; sort?: string } = {};
  const m = t.match(/(duoi|tren|khoang|under|over)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|nghin|k|ty)?/);
  if (m) {
    const unit = m[3] === "trieu" || m[3] === "tr" ? 1e6 : m[3] === "ty" ? 1e9 : m[3] === "nghin" || m[3] === "k" ? 1e3 : 1;
    const v = parseFloat(m[2].replace(",", ".")) * unit;
    if (v >= 1000) {
      if (m[1] === "duoi" || m[1] === "under") out.max_price = v;
      else if (m[1] === "tren" || m[1] === "over") out.min_price = v;
      else {
        out.min_price = v * 0.8;
        out.max_price = v * 1.2;
      }
    }
  }
  if (/re nhat|gia thap nhat|cheapest/.test(t)) out.sort = "price-asc";
  else if (/dat nhat|cao nhat|dat tien nhat/.test(t)) out.sort = "price-desc";
  return out;
}

type ChatContext = { text: string; products: ChatProduct[] };

// Retrieval happens on the server (synonyms + rarity ranking), so the model never has to guess search keywords.
async function buildContext(userMessages: string[]): Promise<ChatContext> {
  const last = userMessages[userMessages.length - 1] || "";
  const recent = userMessages.slice(-2).join(" ");
  const lines: string[] = [];

  const code = recent.match(ORDER_CODE_RE);
  if (code) {
    const o = await trackOrder(code[0]);
    lines.push(
      o
        ? `ĐƠN HÀNG ${o.orderCode}: trạng thái "${o.orderStatus}", thanh toán ${o.paymentStatus}, tổng ${o.totalAmount.toLocaleString("vi-VN")}đ, sản phẩm: ${o.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}.`
        : `ĐƠN HÀNG ${code[0].toUpperCase()}: KHÔNG TỒN TẠI trong hệ thống.`
    );
  }

  // Follow-ups like "còn hàng không?" have no product words: fall back to the previous message.
  const hasWords = expandQuery(last).length > 0;
  const query = hasWords ? last : recent;
  const c = parseConstraints(recent);
  let products = await searchProducts({ query, ...c });
  if (!products.length && hasWords) products = await searchProducts({ query: recent, ...c });
  if (!products.length) products = await searchProducts({ query: "", sort: "popular" });

  if (products.length) {
    lines.push(
      "SẢN PHẨM LIÊN QUAN (id | tên | danh mục | giá | tồn kho | đánh giá | mô tả):",
      ...products.map(
        (p) =>
          `#${p.id} ${p.name} | ${p.category} | ${p.price.toLocaleString("vi-VN")}đ | ${
            p.stock > 0 ? `còn ${p.stock}` : "HẾT HÀNG"
          } | ${p.rating}★ | ${p.description.slice(0, 100)}`
      )
    );
  }
  return { text: lines.join("\n"), products: products.map(({ description: _d, ...p }) => p) };
}

const SYSTEM_PROMPT = `Bạn là trợ lý tư vấn của "Kirk's Ecommerce Shop", một website bán đồ điện tử demo.
Quy tắc:
- Trả lời bằng ngôn ngữ khách đang dùng (tiếng Việt hoặc tiếng Anh; khách nhắn tiếng Việt thì trả lời tiếng Việt), ngắn gọn, thân thiện, tối đa vài câu. Không dùng markdown.
- Chỉ nói về shop: tư vấn sản phẩm, giá, tồn kho, phí ship, tra cứu đơn hàng. Câu hỏi ngoài phạm vi thì từ chối lịch sự. Chào hỏi thì chào lại và hỏi khách cần gì.
- Mỗi tin nhắn có kèm "DỮ LIỆU CỬA HÀNG" do hệ thống tìm sẵn. Chỉ dùng dữ liệu đó cho tên, giá, tồn kho, rating, mô tả và trạng thái đơn. Tuyệt đối không bịa, không tự thêm màu sắc, cấu hình hay thông số khác.
- Chỉ nêu những sản phẩm khách thực sự hỏi tới (đúng loại, đúng tầm giá). Dữ liệu có thể chứa cả sản phẩm không liên quan, hãy bỏ qua chúng.
- Tên hãng thường không nằm trong tên sản phẩm (Galaxy = Samsung, Pixel = Google, iPhone = Apple). Chỉ nói shop không có khi không món nào trong dữ liệu phù hợp (ví dụ khách hỏi hãng Xiaomi mà không có), và có thể gợi ý món tương tự.
- Sản phẩm HẾT HÀNG thì nói rõ là hết hàng, không gợi ý mua.
- Giá tính bằng VND. Phí ship ${SHIPPING_FEE.toLocaleString("vi-VN")}đ, miễn phí cho đơn từ ${FREE_SHIP_THRESHOLD.toLocaleString("vi-VN")}đ. Thanh toán: thẻ hoặc ví MoMo/ZaloPay/VNPay (mô phỏng).
- Giao diện tự hiển thị thẻ sản phẩm bấm vào được, nên chỉ cần nêu tên và lý do gợi ý, không cần link.
- Khi có khối KHÁCH ĐANG NHỜ TƯ VẤN MUA SẮM thì tuân thủ phần [HƯỚNG DẪN] đi kèm: giới thiệu lần lượt đúng các sản phẩm đề xuất, tuyệt đối không nêu món ngoài danh sách.`;

function sanitize(input: unknown): Msg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is Msg =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== ""
    )
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
}

const REC_GUIDE =
  "Hãy giới thiệu lần lượt từng sản phẩm đề xuất (nêu đúng tên đầy đủ), mỗi món 1-2 câu dựa trên lý do gợi ý. " +
  "Nếu có mục LƯU Ý thì nói rõ điều kiện nào chưa đáp ứng được. " +
  "Tuyệt đối không nêu sản phẩm ngoài danh sách. Kết thúc bằng một câu mời khách bấm Thêm vào giỏ bên dưới.";

export const chatService = {
  async reply(rawMessages: unknown, opts: ChatReplyOptions = {}): Promise<ChatReply> {
    const history = sanitize(rawMessages);
    if (!history.length || history[history.length - 1].role !== "user") throw new AppError(400, "Bad request.");

    try {
      const userTexts = history.filter((m) => m.role === "user").map((m) => m.content);
      const lastUser = userTexts[userTexts.length - 1] || "";
      // Feature 2: natural-language cart actions run before advice/lookup.
      // A bare "confirm" word only counts when a proposal is actually pending
      // (otherwise it falls through to the normal chat path — never a blind add).
      const cartKind = detectCartIntent(lastUser);
      if (cartKind && (cartKind !== "confirm" || opts.proposal?.proposalId)) {
        const handled = await cartAssistantService.handle({
          kind: cartKind,
          text: lastUser,
          history: userTexts.slice(0, -1),
          userId: opts.userId ?? null,
          proposal: opts.proposal,
          guestCart: opts.guestCart
        });
        if (handled) return handled;
      }
      // Feature 1: shopping-advice requests get deterministic DB recommendations
      // (real products + reasons). Everything else keeps the legacy lookup path.
      const wantsRec =
        recommendationService.isRecommendationRequest(lastUser) && !ORDER_CODE_RE.test(userTexts.slice(-2).join(" "));
      const rec = wantsRec ? await recommendationService.recommend(lastUser) : null;
      // Retrieval runs here (synonyms + ranking), not inside the model, so keyword luck can't hide a product.
      const ctx = rec ? null : await buildContext(userTexts);
      const products: ChatProduct[] = rec
        ? rec.items.map(({ reason: _r, meetsBudget: _m, ...p }) => p)
        : ctx!.products;
      const recommendations: RecommendedChatProduct[] | undefined = rec
        ? rec.items.map(({ meetsBudget: _m, ...p }) => p)
        : undefined;

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        if (rec) {
          return {
            reply: recommendationService.formatFallbackReply(rec),
            products,
            recommendations
          };
        }
        return {
          reply:
            ctx!.products.length !== 0
              ? "Chatbot AI chưa có API key nên mình chỉ gợi ý theo từ khóa. Các sản phẩm phù hợp nhất:"
              : "Chatbot AI chưa có API key. Bạn thử nhập tên sản phẩm (ví dụ: laptop) nhé.",
          products: ctx!.products
        };
      }

      // Shop data rides on the last user message, so earlier turns stay short and the prompt stays small.
      const contextBlock = rec ? recommendationService.formatForLLM(rec) : ctx!.text;
      const guide = rec ? `\n\n[HƯỚNG DẪN]\n${REC_GUIDE}` : "";
      const messages = history.map((m, i) =>
        i === history.length - 1 ? { role: "user", content: `${m.content}\n\n[DỮ LIỆU CỬA HÀNG]\n${contextBlock}${guide}` } : m
      );

      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          temperature: 0.1,
          reasoning_effort: "low",
          max_tokens: 1200
        })
      });
      if (!res.ok) {
        console.error("Groq error", res.status, await res.text());
        const reply =
          res.status === 429
            ? "Chatbot đang quá tải (hết lượt miễn phí tạm thời), bạn thử lại sau ít phút nhé."
            : "Chatbot đang gặp sự cố, bạn thử lại sau nhé.";
        return { reply, products: [] };
      }

      const data = await res.json();
      const reply = (data.choices?.[0]?.message?.content || "").trim() || "Mình chưa có câu trả lời, bạn hỏi lại giúp mình nhé.";

      // Recommendation path: cards are the explicit DB picks (no name-matching luck).
      if (rec) return { reply, products, recommendations };

      // Cards = products the reply actually talks about. Exact full-name/tail match
      // first; otherwise the longest run of consecutive name-tokens found in the
      // reply ("Huawei MatePad 11.5 8/128GB" vs "MatePad 11.5inch" still hits on
      // "huawei matepad"). A run of >= 2 avoids one-word false friends
      // ("Galaxy" alone must not card every Samsung).
      const toks = (s: string) =>
        s
          .toLowerCase()
          .replace(/([a-z])(\d)/g, "$1 $2")
          .replace(/(\d)([a-z])/g, "$1 $2")
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 2);
      const replyToks = toks(reply);
      const replyStr = ` ${replyToks.join(" ")} `;
      const lower = reply.toLowerCase();
      // A run counts only if it holds a real name-word (alpha, len>=4): spec-only
      // runs like "128 gb" / "15 128" must not card every 128GB phone.
      const isNameWord = (w: string) => /[a-z]/.test(w) && w.length >= 4;
      const cards: ChatProduct[] = (await listAllProducts())
        .map((p) => {
          const name = p.name.toLowerCase();
          const tail = name.split(" ").slice(-2).join(" ");
          const exactAt = Math.min(...[lower.indexOf(name), lower.indexOf(tail)].filter((i) => i >= 0), Infinity);
          if (Number.isFinite(exactAt)) return { p, at: exactAt };
          const nt = toks(p.name);
          let run = 0;
          let firstAt = Infinity;
          for (let i = 0; i < nt.length; i++) {
            for (let j = i + 1; j < nt.length; j++) {
              const win = nt.slice(i, j + 1);
              if (!win.some(isNameWord)) continue;
              const seq = ` ${win.join(" ")} `;
              const at = replyStr.indexOf(seq);
              if (at >= 0) {
                if (win.length > run) run = win.length;
                if (at < firstAt) firstAt = at;
              } else break;
            }
          }
          return { p, at: run >= 2 ? firstAt : Infinity };
        })
        .filter((x) => Number.isFinite(x.at))
        .sort((a, b) => a.at - b.at)
        .map((x) => x.p);
      return { reply, products: cards.slice(0, 6) };
    } catch (e) {
      console.error(e);
      return { reply: "Chatbot đang gặp sự cố, bạn thử lại sau nhé.", products: [] };
    }
  }
};
