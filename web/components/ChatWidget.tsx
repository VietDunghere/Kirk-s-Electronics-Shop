"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatVND } from "@/lib/utils";
import { useToast } from "./Toast";

type ChatProduct = { id: number; name: string; price: number; stock: number; image: string };
type RecommendedProduct = ChatProduct & { reason?: string };
type CartProposal = { proposalId: string; product: ChatProduct; quantity: number };
type CartAction =
  | { type: "propose_add"; proposal: CartProposal }
  | { type: "added"; product: ChatProduct; quantity: number; cart: { totalCount: number; subtotal: number }; guest?: boolean }
  | { type: "show_cart"; cart: { totalCount: number; subtotal: number }; lines: string[] };
type Message = { role: "user" | "assistant"; content: string; products?: ChatProduct[]; recommendations?: RecommendedProduct[]; cartAction?: CartAction };

const GREETING: Message = {
  role: "assistant",
  content: "Xin chào! Mình là trợ lý của Kirk's Shop. Bạn cần tư vấn sản phẩm hay tra cứu đơn hàng?"
};
const SUGGESTIONS = ["Gợi ý laptop dưới 20 triệu", "Thêm DJI Mini 4 Pro vào giỏ", "Giỏ hàng của tôi có gì?", "Tra cứu đơn ORD-2026-00001"];

const CHAT_HISTORY_KEY = "kirk_chat_history";

export default function ChatWidget() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // Restore a previously saved conversation (text + product cards only;
  // pending cart proposals are never restored — they can't be confirmed later).
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) return saved as Message[];
      }
    } catch {
      /* corrupted save -> start fresh */
    }
    return [GREETING];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [pendingProposal, setPendingProposal] = useState<CartProposal | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open, showClosePrompt]);

  function readGuestCart(): { productId: number; qty: number }[] {
    try {
      const raw = localStorage.getItem("guest_cart");
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  // Same guest-cart rule as ProductCard: merge into localStorage, never a separate AI cart.
  function applyGuestAdd(productId: number, qty: number, stockCap: number) {
    const items = readGuestCart();
    const found = items.find((i) => i.productId === productId);
    if (found) found.qty = Math.min(found.qty + qty, stockCap);
    else items.push({ productId, qty: Math.min(qty, stockCap) });
    localStorage.setItem("guest_cart", JSON.stringify(items));
    window.dispatchEvent(new Event("cart-updated"));
  }

  async function send(text: string, proposalOverride?: CartProposal | null) {
    const content = text.trim();
    if (!content || loading) return;
    setShowClosePrompt(false); // user keeps chatting -> dismiss the close question
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          proposal: proposalOverride !== undefined ? proposalOverride : pendingProposal,
          guestCart: readGuestCart()
        })
      });
      const data = await res.json();
      const action = data.cartAction as CartAction | undefined;
      if (action?.type === "propose_add") setPendingProposal(action.proposal);
      else if (action?.type === "added") {
        setPendingProposal(null);
        if (action.guest) applyGuestAdd(action.product.id, action.quantity, action.product.stock);
        else window.dispatchEvent(new Event("cart-updated"));
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply || data.error || "Có lỗi xảy ra.",
          products: data.products,
          recommendations: data.recommendations,
          cartAction: action
        }
      ]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Không kết nối được chatbot, bạn thử lại sau nhé." }]);
    } finally {
      setLoading(false);
    }
  }

  // Explicit confirm button: re-sends "Đồng ý" together with the pending proposal.
  async function confirmProposal(p: CartProposal) {
    if (confirming || loading) return;
    setConfirming(true);
    try {
      await send("Đồng ý", p);
    } finally {
      setConfirming(false);
    }
  }

  // Closing flow: with an ongoing conversation the bot asks to keep or wipe it.
  function requestClose() {
    if (messages.length > 1 && !showClosePrompt) {
      setShowClosePrompt(true);
      return;
    }
    if (showClosePrompt) {
      setShowClosePrompt(false); // dismiss the question, keep chatting
      return;
    }
    doClose(false); // nothing to keep -> close directly
  }

  function doClose(keep: boolean) {
    if (keep) {
      try {
        // cartAction is display-only state (incl. one-time proposals) -> drop it.
        const stored = messages.map(({ cartAction: _c, ...m }) => m);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(stored));
      } catch {
        /* storage full/blocked -> just close */
      }
    } else {
      try {
        localStorage.removeItem(CHAT_HISTORY_KEY);
      } catch {
        /* ignore */
      }
      setMessages([GREETING]);
      setPendingProposal(null);
    }
    setShowClosePrompt(false);
    setOpen(false);
  }

  // One card UI for every product the bot mentions: detail link + add-to-cart.
  function renderProductCard(p: ChatProduct | RecommendedProduct) {
    return (
      <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-2">
        <Link href={`/products/${p.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 hover:opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-gray-900">{p.name}</span>
            <span className="block text-xs font-semibold text-usa-red">{formatVND(p.price)}</span>
            {p.stock > 0 ? (
              <span className="block text-[10px] font-medium text-green-600">Còn {p.stock} chiếc</span>
            ) : (
              <span className="block text-[10px] font-medium text-red-600">Hết hàng</span>
            )}
          </span>
        </Link>
        {"reason" in p && p.reason && <p className="mt-1 text-[11px] italic leading-snug text-gray-600">✓ {p.reason}</p>}
        <div className="mt-1.5 flex gap-1.5">
          <Link
            href={`/products/${p.id}`}
            onClick={() => setOpen(false)}
            className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            Chi tiết
          </Link>
          <button
            onClick={() => addToCart(p)}
            disabled={p.stock <= 0 || addingId === p.id}
            className="flex-1 rounded-lg bg-usa-navy px-2 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {addingId === p.id ? "Đang thêm..." : "Thêm vào giỏ"}
          </button>
        </div>
      </div>
    );
  }

  // Same add-to-cart flow as ProductCard: login cart, else guest localStorage cart.
  async function addToCart(p: ChatProduct) {
    if (p.stock <= 0) {
      toast("Sản phẩm này đã hết hàng.", "error");
      return;
    }
    setAddingId(p.id);
    try {
      const r = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, quantity: 1 })
      });
      const d = await r.json();
      if (r.status === 401) {
        applyGuestAdd(p.id, 1, p.stock);
        toast("Đã thêm vào giỏ hàng.");
        return;
      }
      if (!r.ok) {
        toast(d.error || "Không thêm được vào giỏ.", "error");
        return;
      }
      window.dispatchEvent(new Event("cart-updated"));
      toast("Đã thêm vào giỏ hàng.");
    } catch {
      toast("Không thêm được vào giỏ.", "error");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-usa-navy px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Trợ lý Kirk&apos;s Shop</p>
              <p className="text-xs text-white/70">Tư vấn sản phẩm · Tra cứu đơn</p>
            </div>
            <button onClick={requestClose} aria-label="Đóng chat" className="text-xl leading-none text-white/80 hover:text-white">
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={
                      "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm " +
                      (m.role === "user" ? "bg-usa-red text-white" : "border border-gray-200 bg-white text-gray-800")
                    }
                  >
                    {m.content}
                  </div>
                  {m.recommendations?.length
                    ? m.recommendations.map(renderProductCard)
                    : m.products?.map(renderProductCard)}
                  {m.cartAction && m.cartAction.type === "propose_add" && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => confirmProposal((m.cartAction as { proposal: CartProposal }).proposal)}
                        disabled={confirming}
                        className="flex-1 rounded-lg bg-usa-red px-2 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {confirming
                          ? "Đang thêm..."
                          : `Xác nhận thêm ${(m.cartAction as { proposal: CartProposal }).proposal.quantity} chiếc`}
                      </button>
                      <button
                        onClick={() => {
                          setPendingProposal(null);
                          setMessages((prev) => [...prev, { role: "assistant", content: "Mình đã hủy đề xuất. Bạn cần gì khác không?" }]);
                        }}
                        disabled={confirming}
                        className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                  {m.cartAction?.type === "added" && (
                    <Link
                      href="/cart"
                      onClick={() => setOpen(false)}
                      className="block rounded-lg bg-green-50 px-2 py-1.5 text-center text-[11px] font-semibold text-green-700 hover:bg-green-100"
                    >
                      Xem giỏ hàng →
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-usa-navy/30 bg-white px-3 py-1 text-xs text-usa-navy hover:bg-brand-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {loading && <p className="text-xs text-gray-500">Đang trả lời...</p>}
            <div ref={endRef} />
          </div>

          {showClosePrompt && (
            <div className="border-t border-gray-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-gray-800">
                Bạn muốn lưu trữ cuộc trò chuyện này hay xóa cuộc trò chuyện này?
              </p>
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={() => doClose(true)}
                  className="flex-1 rounded-lg bg-usa-navy px-2 py-1.5 text-[11px] font-semibold text-white hover:opacity-90"
                >
                  Lưu trữ
                </button>
                <button
                  onClick={() => doClose(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Xóa
                </button>
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-gray-200 bg-white p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Nhập câu hỏi..."
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-usa-navy"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-usa-navy px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => (open ? requestClose() : setOpen(true))}
        aria-label={open ? "Đóng chat" : "Mở chat tư vấn"}
        title={open ? "Đóng chat" : "Chat với trợ lý"}
        className="relative flex items-end justify-center text-5xl transition-transform hover:scale-105"
      >
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/kirk.png"
            alt="Chat với trợ lý"
            onError={() => setImgOk(false)}
            className="h-32 w-auto select-none drop-shadow-xl md:h-44"
            draggable={false}
          />
        ) : (
          "💬"
        )}
        {!open && (
          <span className="pointer-events-none absolute -top-11 right-2 whitespace-nowrap rounded-2xl rounded-br-sm border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-usa-navy shadow-lg">
            Tôi là chatbot tư vấn
          </span>
        )}
        {open && (
          <span className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-usa-red text-lg leading-none text-white shadow">×</span>
        )}
      </button>
    </div>
  );
}
