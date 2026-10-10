// application.service — Chatbot use case: server-side retrieval (synonyms + ranking) + NVIDIA NIM reply.
import { productRepository } from "../../infrastructure/repository/productRepository";
import { orderRepository } from "../../infrastructure/repository/orderRepository";
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

type Msg = { role: "user" | "assistant"; content: string };

const NVIDIA_NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = process.env.NVIDIA_MODEL || "openai/gpt-oss-20b";

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
- Trả lời bằng tiếng Việt (hoặc ngôn ngữ khách dùng), ngắn gọn, thân thiện, tối đa vài câu. Không dùng markdown.
- Chỉ nói về shop: tư vấn sản phẩm, giá, tồn kho, phí ship, tra cứu đơn hàng. Câu hỏi ngoài phạm vi thì từ chối lịch sự. Chào hỏi thì chào lại và hỏi khách cần gì.
- Mỗi tin nhắn có kèm "DỮ LIỆU CỬA HÀNG" do hệ thống tìm sẵn. Chỉ dùng dữ liệu đó cho tên, giá, tồn kho, rating, mô tả và trạng thái đơn. Tuyệt đối không bịa, không tự thêm màu sắc, cấu hình hay thông số khác.
- Chỉ nêu những sản phẩm khách thực sự hỏi tới (đúng loại, đúng tầm giá). Dữ liệu có thể chứa cả sản phẩm không liên quan, hãy bỏ qua chúng.
- Tên hãng thường không nằm trong tên sản phẩm (Galaxy = Samsung, Pixel = Google, iPhone = Apple). Chỉ nói shop không có khi không món nào trong dữ liệu phù hợp (ví dụ khách hỏi hãng Xiaomi mà không có), và có thể gợi ý món tương tự.
- Sản phẩm HẾT HÀNG thì nói rõ là hết hàng, không gợi ý mua.
- Giá tính bằng VND. Phí ship ${SHIPPING_FEE.toLocaleString("vi-VN")}đ, miễn phí cho đơn từ ${FREE_SHIP_THRESHOLD.toLocaleString("vi-VN")}đ. Thanh toán: thẻ hoặc ví MoMo/ZaloPay/VNPay (mô phỏng).
- Giao diện tự hiển thị thẻ sản phẩm bấm vào được, nên chỉ cần nêu tên và lý do gợi ý, không cần link.`;

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

export const chatService = {
  async reply(rawMessages: unknown): Promise<{ reply: string; products: ChatProduct[] }> {
    const history = sanitize(rawMessages);
    if (!history.length || history[history.length - 1].role !== "user") throw new AppError(400, "Bad request.");

    try {
      // Retrieval runs here (synonyms + ranking), not inside the model, so keyword luck can't hide a product.
      const ctx = await buildContext(history.filter((m) => m.role === "user").map((m) => m.content));

      const apiKey = process.env.NVIDIA_API_KEY;
      if (!apiKey) {
        return {
          reply: ctx.products.length
            ? "Chatbot AI chưa có API key nên mình chỉ gợi ý theo từ khóa. Các sản phẩm phù hợp nhất:"
            : "Chatbot AI chưa có API key. Bạn thử nhập tên sản phẩm (ví dụ: laptop) nhé.",
          products: ctx.products
        };
      }

      // Shop data rides on the last user message, so earlier turns stay short and the prompt stays small.
      const messages = history.map((m, i) =>
        i === history.length - 1 ? { role: "user", content: `${m.content}\n\n[DỮ LIỆU CỬA HÀNG]\n${ctx.text}` } : m
      );

      const res = await fetch(NVIDIA_NIM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          temperature: 0.1,
          max_tokens: 1200
        })
      });
      if (!res.ok) {
        console.error("NVIDIA NIM error", res.status, await res.text());
        const reply =
          res.status === 429
            ? "Chatbot đang quá tải (hết lượt miễn phí tạm thời), bạn thử lại sau ít phút nhé."
            : res.status === 410 || res.status === 404
              ? "Mô hình chatbot hiện không khả dụng. Vui lòng kiểm tra NVIDIA_MODEL trong .env."
              : res.status === 401 || res.status === 403
                ? "API key NVIDIA không hợp lệ hoặc không có quyền dùng mô hình này. Vui lòng kiểm tra NVIDIA_API_KEY và NVIDIA_MODEL trong .env."
            : "Chatbot đang gặp sự cố, bạn thử lại sau nhé.";
        return { reply, products: [] };
      }

      const data = await res.json();
      const reply = (data.choices?.[0]?.message?.content || "").trim() || "Mình chưa có câu trả lời, bạn hỏi lại giúp mình nhé.";

      // Cards = products the reply actually names (full name, or its model tail like "boom 360"), so cards match the text.
      const lower = reply.toLowerCase();
      const cards: ChatProduct[] = (await listAllProducts())
        .map((p) => {
          const name = p.name.toLowerCase();
          const tail = name.split(" ").slice(-2).join(" ");
          const at = Math.min(...[lower.indexOf(name), lower.indexOf(tail)].filter((i) => i >= 0), Infinity);
          return { p, at };
        })
        .filter((x) => Number.isFinite(x.at))
        .sort((a, b) => a.at - b.at)
        .map((x) => x.p);
      return { reply, products: cards.slice(0, 6) };
    } catch (e) {
      console.error(e);
      return {
        reply:
          e instanceof TypeError && e.message === "fetch failed"
            ? "Máy chủ không kết nối được NVIDIA NIM. Vui lòng kiểm tra mạng hoặc quyền truy cập internet của tiến trình server."
            : "Chatbot đang gặp sự cố, bạn thử lại sau nhé.",
        products: []
      };
    }
  }
};
