// application.service — AI add-to-cart assistant (Feature 2: cart actions via natural language).
// Understands "add X to cart" / "thêm X vào giỏ" / "giỏ hàng của tôi" in Vietnamese & English,
// matches the request to a REAL product row, then proposes -> (explicit confirm) -> executes.
// Execution always goes through cartService (same business rules: exists / in-stock / stock
// limit). The AI never writes Cart/CartItem rows directly. Guests reuse the existing
// localStorage guest-cart flow on the frontend; the server only validates for them.
import { randomUUID } from "crypto";
import { productRepository } from "../../infrastructure/repository/productRepository";
import { cartService } from "./cartService";
import { recommendationService } from "./recommendationService";
import { AppError } from "./appError";
import type { ChatProduct, CartAction, CartProposal } from "./chatService";

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const clean = (t: string) =>
  norm(t)
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(
  "co khong ko nao bao nhieu gia la the cho toi minh ban can muon va cua mot nhung nay do gi hay duoc con hang shop xin chao oi ah nhe vay thi se da dang tim xem hoi cac may mau loai san pham cai chiec bi lan nua them vao trong hien tai bay gio giup tiep theo doan nay kia a an the to my me i it that this one ones please help me want get give put take add them mua hang gio cart o on".split(
    " "
  )
);

// Product schema has no variants (single SKU per row): variant words are only ever a note.
const VARIANT_RE =
  /\b(mau(\s*sac)?|colors?|den|trang|do|xanh|hong|tim|vang|bac|titan|ban(\s*\w+)?|phien(\s*ban)?|versions?|\d+\s*gb|\d+\s*tb|ram\s*\d+|rom\s*\d+|dung\s*luong|bo\s*nho)\b/;

const QTY_WORDS: Record<string, number> = {
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5
};

export type CartIntentKind = "add" | "show" | "confirm";

export type IncomingProposal = { proposalId?: unknown; productId?: unknown; quantity?: unknown };
export type GuestCartLine = { productId?: unknown; qty?: unknown };

export type CartHandleInput = {
  kind: CartIntentKind;
  text: string;
  history: string[]; // earlier user messages (oldest -> newest, excluding current)
  userId: number | null;
  proposal?: IncomingProposal | null;
  guestCart?: GuestCartLine[];
};

// --- intent detection -------------------------------------------------------

const ADD_VERBS = ["add", "them", "bo vao", "cho vao", "mua", "dat mua", "dat hang", "order", "lay", "chot", "checkout lay"];
const CART_NOUNS = ["cart", "gio hang", "gio", "ro hang"];
const ADVICE_RE = /\b(nao|gi tot|tot nhat|nen|goi y|tu van|so sanh|tu van|recommend|suggest|best|compare|review|danh gia|co nen)\b/;
const SHOW_RE =
  /^(show|hien(\s*thi)?|xem|kiem(\s*tra)?|cho(\s*(xem|biet))?|list|hien)\b.*\b(cart|gio(\s*hang)?)\b|\b(cart|gio(\s*hang)?)\b.*(co\s*gi|hien(\s*co)?|hien\s*tai|hien\s*giờ|cua\s*(toi|minh|tao|em|anh|chi)|my|hien)/;
const CONFIRM_RE =
  /^(ok|oke|okay|yes|yep|yeah|co|dong y|xac nhan|chot|chot don|them di|mua di|dat di|duoc|ok di|lam di|tien hanh|tiep tuc|confirm|agree|do it|go ahead)\b/;
const ANAPHORA_RE = /\b(no|em no|con no|cai (do|nay|kia)|mon (do|nay)|that|this|it|recommended|goi y|vua (goi y|roi|nay)|o tren|tren kia)\b/;
const CHEAP_RE = /\b(cheaper|cheapest|re hon|re nhat|re nhat|gia (re|thap) (hon|nhat)|re)\b/;
const PRICEY_RE = /\b(expensive|pricier|dat hon|dat nhat|dat tien nhat|cao cap nhat)\b/;

export function detectCartIntent(text: string): CartIntentKind | null {
  const t = ` ${clean(text)} `;
  const tt = t.trim(); // ^-anchored patterns need the padding stripped
  if (CONFIRM_RE.test(tt)) return "confirm";
  if (SHOW_RE.test(tt)) return "show";
  const hasNoun = CART_NOUNS.some((n) => t.includes(` ${n} `) || t.includes(` ${n}s `));
  const hasVerb = ADD_VERBS.some((v) => t.includes(v));
  if (hasNoun && hasVerb && !ADVICE_RE.test(t)) return "add";
  // No cart noun ("Add the cheaper laptop you recommended"): imperative verb +
  // concrete reference (anaphora or model-like words) and NOT an advice question.
  if (hasVerb && !ADVICE_RE.test(t) && (ANAPHORA_RE.test(t) || /\b(pro|max|plus|ultra|fe|mini|air|lite|note|pixel|galaxy|iphone|ipad|dji|mavic|avata|nitro|thinkpad|macbook)\b/.test(t)))
    return "add";
  return null;
}

// --- quantity ---------------------------------------------------------------

function parseQuantity(text: string): number {
  const t = ` ${clean(text)} `;
  const m1 = t.match(/(\d+)\s*(chiec|cai|sp|items?|pcs?|units?)\b/) || t.match(/\b(\d+)\s*x\b/) || t.match(/\bx\s*(\d+)\b/);
  if (m1) return Math.min(99, Math.max(1, parseInt(m1[1], 10) || 1));
  const m2 = t.match(/^(them|add|lay|mua)\s+(\d+)\b/);
  if (m2) return Math.min(99, Math.max(1, parseInt(m2[2], 10) || 1));
  for (const [w, n] of Object.entries(QTY_WORDS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) return n;
  }
  return 1;
}

// Strip intent scaffolding so only the product reference remains.
function extractProductQuery(text: string): string {
  let t = ` ${clean(text)} `;
  const drop = [
    "them vao gio hang",
    "them vao gio",
    "them vao ro hang",
    "bo vao gio hang",
    "cho vao gio hang",
    "dat mua",
    "dat hang",
    "add to my cart",
    "add to cart",
    "add into cart",
    "to my cart",
    "into the cart",
    "into cart",
    "in my cart",
    "my cart",
    "gio hang cua toi",
    "gio hang cua minh",
    "gio hang",
    "gio cua toi",
    "vào giỏ",
    "vao gio",
    "please",
    "lam on",
    "giup minh",
    "giup toi",
    "cho minh",
    "cho toi",
    "minh muon",
    "toi muon",
    "i want",
    "i would like",
    "ban cho minh",
    "lay ho minh",
    "mua ho minh",
    "chot don"
  ];
  for (const d of [...drop].sort((a, b) => b.length - a.length)) t = t.replace(` ${d} `, " ");
  // Leftover scaffolding: quantities, bare verbs/nouns ("them 2 chiec X vao gio").
  t = t
    .replace(/\b\d+\s*(chiec|cai|sp|items?|pcs?|units?|x)\b/g, " ")
    .replace(/\b\d+\s*x\b|\bx\s*\d+\b/g, " ")
    .replace(/\b(them|add|mua|dat|lay|chot|order|vao|gio|hang|cart|carts|chiec|cai|chung|sp)\b/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

function queryTokens(query: string): string[] {
  return query
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

// --- product matching (real DB rows only) ------------------------------------

type Scored = { id: number; name: string; price: number; stock: number; image: string; category: string; rating: number; score: number };

async function matchProducts(query: string, take = 30): Promise<Scored[]> {
  const tokens = queryTokens(query);
  if (!tokens.length) return [];
  const rows = await productRepository.search({ keywords: tokens }, "popular", take);
  // A distinctive token matching NOTHING vetoes the whole query ("xiaomi mi 15"
  // must not propose a Nitro just because "mi"/"15" overlap). Short filler ("mi",
  // "15") is exempt; long or model-like tokens (len>=4, or len>=3 with a digit) decide.
  const strong = tokens.filter((w) => w.length >= 4 || (w.length >= 3 && /\d/.test(w)));
  const hay = (p: { name: string; category: string; description: string }) =>
    `${norm(p.name)} ${norm(p.category)} ${norm(p.description)}`;
  if (strong.some((w) => !rows.some((p) => hay(p).includes(w)))) return [];
  const core = query;
  const scored = rows.map((p) => {
    const name = norm(p.name);
    const cat = norm(p.category);
    const desc = norm(p.description);
    let s = 0;
    for (const tok of tokens) {
      if (name.includes(tok)) s += 3;
      else if (cat.includes(tok)) s += 1;
      else if (desc.includes(tok)) s += 0.5;
      // Model numbers decide ("s24" -> S24 Ultra, not S25 Ultra).
      if (/\d/.test(tok) && name.includes(tok)) s += 8;
    }
    if (core.length >= 4 && name.includes(core)) s += 10;
    return { id: p.id, name: p.name, price: p.price, stock: p.stock, image: p.image, category: p.category, rating: p.rating, score: s };
  });
  return scored.filter((p) => p.score > 0).sort((a, b) => b.score - a.score);
}

// "the cheaper laptop you recommended" -> re-run the previous advice turn.
async function resolveAnaphora(text: string, history: string[]): Promise<Scored[]> {
  const t = clean(text);
  const cheap = CHEAP_RE.test(t);
  const pricey = PRICEY_RE.test(t);
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i] || "";
    if (!h.trim()) continue;
    if (recommendationService.isRecommendationRequest(h)) {
      const rec = await recommendationService.recommend(h);
      if (rec.items.length) {
        const items = [...rec.items].sort((a, b) => (pricey ? b.price - a.price : a.price - b.price));
        const picked = cheap || pricey ? items[0] : items[0];
        return [{ ...picked, score: 100 }];
      }
    }
    const m = await matchProducts(extractProductQuery(h) || h);
    if (m.length) {
      if (cheap) return [...m].sort((a, b) => a.price - b.price).slice(0, 1);
      if (pricey) return [...m].sort((a, b) => b.price - a.price).slice(0, 1);
      return m.slice(0, 1);
    }
  }
  // No usable history: plain search on whatever words remain.
  const m = await matchProducts(extractProductQuery(text) || text);
  if (cheap) return [...m].sort((a, b) => a.price - b.price).slice(0, 3);
  if (pricey) return [...m].sort((a, b) => b.price - a.price).slice(0, 3);
  return m;
}

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;
const toChat = (p: Scored): ChatProduct => ({
  id: p.id,
  name: p.name,
  price: p.price,
  stock: p.stock,
  image: p.image,
  category: p.category,
  rating: p.rating
});

function proposalReply(p: Scored, qty: number, variantNote: boolean, capped: boolean): string {
  const lines = [
    `Mình tìm thấy "${p.name}" giá ${vnd(p.price)}, còn ${p.stock} chiếc.`,
    capped
      ? `Bạn muốn ${qty} nhưng shop chỉ còn ${p.stock}, mình đề xuất thêm ${p.stock} chiếc nhé.`
      : `Thêm ${qty} chiếc vào giỏ nhé?`
  ];
  if (variantNote) lines.push("Lưu ý: shop chỉ bán 1 phiên bản duy nhất, không có tùy chọn màu/dung lượng riêng.");
  lines.push('Bấm "Xác nhận" bên dưới hoặc trả lời "đồng ý".');
  return lines.join(" ");
}

// --- main handler ------------------------------------------------------------

export type CartHandleResult = {
  reply: string;
  products: ChatProduct[];
  cartAction?: CartAction;
};

export const cartAssistantService = {
  async handle(input: CartHandleInput): Promise<CartHandleResult | null> {
    const { kind, text, history, userId } = input;
    const qty = parseQuantity(text);

    // --- confirm: execute a pending proposal exactly once ---
    if (kind === "confirm") {
      // The frontend sends back the whole proposal object ({ proposalId, product: { id, ... }, quantity }).
      const rawPid = input.proposal?.productId ?? (input.proposal as { product?: { id?: unknown } } | null)?.product?.id;
      const pid = Number(rawPid);
      const pqty = Math.min(99, Math.max(1, Number(input.proposal?.quantity) || 0));
      if (!input.proposal?.proposalId || !pid || !pqty) return null; // no pending proposal -> normal chat
      const row = await productRepository.findById(pid);
      if (!row) {
        return { reply: "Sản phẩm bạn vừa chọn hiện không còn bán nữa. Bạn chọn món khác giúp mình nhé.", products: [] };
      }
      if (row.stock <= 0) {
        return { reply: `"${row.name}" vừa hết hàng nên mình chưa thêm được. Bạn xem món tương tự bên dưới nhé.`, products: [] };
      }
      if (pqty > row.stock) {
        return {
          reply: `"${row.name}" chỉ còn ${row.stock} chiếc, không đủ ${pqty} chiếc. Mình giữ đề xuất ${row.stock} chiếc, bạn bấm Xác nhận lại nhé.`,
          products: [toChat({ ...row, score: 1 })],
          cartAction: {
            type: "propose_add",
            proposal: { proposalId: randomUUID(), product: toChat({ ...row, score: 1 }), quantity: row.stock }
          }
        };
      }
      // Authenticated: the SAME service + rules as the cart page (stock/limit checked inside).
      if (userId) {
        try {
          const cartId = await cartService.getOrCreateCartId(userId);
          const cart = await cartService.addItem(cartId, row.id, pqty);
          return {
            reply: `Đã thêm ${pqty} × "${row.name}" vào giỏ. Giỏ hiện có ${cart.totalCount} món, tổng ${vnd(cart.subtotal)}.`,
            products: [toChat({ ...row, score: 1 })],
            cartAction: {
              type: "added",
              product: toChat({ ...row, score: 1 }),
              quantity: pqty,
              cart: { totalCount: cart.totalCount, subtotal: cart.subtotal }
            }
          };
        } catch (e) {
          const msg = e instanceof AppError ? e.message : "Không thêm được vào giỏ.";
          return { reply: `Chưa thêm được: ${viError(msg)}`, products: [] };
        }
      }
      // Guest: validate here, the frontend merges into the SAME guest_cart as ProductCard.
      return {
        reply: `Đã thêm ${pqty} × "${row.name}" vào giỏ. Mở trang Giỏ hàng để kiểm tra nhé.`,
        products: [toChat({ ...row, score: 1 })],
        cartAction: {
          type: "added",
          guest: true,
          product: toChat({ ...row, score: 1 }),
          quantity: pqty,
          cart: { totalCount: pqty, subtotal: row.price * pqty }
        }
      };
    }

    // --- show cart ---
    if (kind === "show") {
      if (userId) {
        const cartId = await cartService.getCartId(userId);
        if (!cartId) return { reply: "Giỏ hàng của bạn đang trống. Bạn cần gợi ý món nào không?", products: [] };
        const cart = await cartService.getCart(cartId);
        if (!cart.items.length)
          return { reply: "Giỏ hàng của bạn đang trống. Bạn cần gợi ý món nào không?", products: [] };
        const lines = cart.items.map(
          (i, n) => `${n + 1}. ${i.product.name} × ${i.quantity} — ${vnd(i.subtotal)}`
        );
        return {
          reply: `Giỏ hàng của bạn có ${cart.totalCount} món, tổng ${vnd(cart.subtotal)}:\n${lines.join("\n")}`,
          products: cart.items.map((i) => toChat({ ...i.product, score: 1 })),
          cartAction: { type: "show_cart", cart: { totalCount: cart.totalCount, subtotal: cart.subtotal }, lines }
        };
      }
      const lines: string[] = [];
      const cards: ChatProduct[] = [];
      let total = 0;
      for (const g of input.guestCart || []) {
        const id = Number(g.productId);
        const q = Math.max(1, Number(g.qty) || 1);
        if (!id) continue;
        const row = await productRepository.findById(id);
        if (!row) continue;
        total += row.price * q;
        lines.push(`${lines.length + 1}. ${row.name} × ${q} — ${vnd(row.price * q)}`);
        cards.push(toChat({ ...row, score: 1 }));
      }
      if (!lines.length)
        return { reply: "Giỏ hàng của bạn đang trống. Bạn cần gợi ý món nào không?", products: [] };
      return {
        reply: `Giỏ hàng của bạn có ${lines.length} món, tổng ${vnd(total)}:\n${lines.join("\n")}`,
        products: cards,
        cartAction: { type: "show_cart", cart: { totalCount: lines.length, subtotal: total }, lines }
      };
    }

    // --- add: match product, check stock, PROPOSE (never add directly) ---
    const query = extractProductQuery(text);
    const anaphoric = queryTokens(query).length === 0 || ANAPHORA_RE.test(` ${clean(text)} `);
    const matches = anaphoric ? await resolveAnaphora(text, history) : await matchProducts(query);
    if (!matches.length) {
      const label = queryTokens(query).join(" ") || text.trim().slice(0, 60);
      return {
        reply: `Mình không tìm thấy sản phẩm "${label}" trong shop. Bạn kiểm tra lại tên giúp mình, hoặc xem các món bán chạy bên dưới nhé.`,
        products: (await productRepository.search({}, "popular", 3)).map((p) => toChat({ ...p, score: 0 }))
      };
    }
    // Ambiguous ("S24" -> S24 / S24+ / S24 Ultra): ask, don't guess.
    if (!anaphoric && matches.length > 1 && matches[1].score >= matches[0].score * 0.85) {
      const top = matches.slice(0, 3);
      return {
        reply: `Có ${top.length} món gần giống, bạn muốn thêm món nào? Bấm "Thêm vào giỏ" trên thẻ, hoặc nhắn "thêm" kèm tên đầy đủ nhé.`,
        products: top.map(toChat)
      };
    }
    const best = matches[0];
    if (best.stock <= 0) {
      return {
        reply: `"${best.name}" hiện đã hết hàng nên mình chưa thêm được. Bạn xem món tương tự bên dưới nhé.`,
        products: (await productRepository.findRelated({ id: best.id, category: best.category }, 3)).map((p) =>
          toChat({ ...p, score: 0 })
        )
      };
    }
    const capped = qty > best.stock;
    const finalQty = capped ? best.stock : qty;
    const variantNote = VARIANT_RE.test(` ${clean(text)} `);
    const proposal: CartProposal = {
      proposalId: randomUUID(),
      product: toChat(best),
      quantity: finalQty
    };
    return {
      reply: proposalReply(best, qty, variantNote, capped),
      products: [toChat(best)],
      cartAction: { type: "propose_add", proposal }
    };
  }
};

function viError(msg: string): string {
  if (/out of stock/i.test(msg)) return "sản phẩm đã hết hàng.";
  if (/only \d+ item/i.test(msg)) return msg.replace(/Only (\d+) item\(s\) available in stock/i, "shop chỉ còn $1 chiếc");
  if (/not found/i.test(msg)) return "không tìm thấy sản phẩm/giỏ hàng.";
  return msg;
}
