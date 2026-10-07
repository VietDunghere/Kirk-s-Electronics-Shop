"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatVND } from "@/lib/utils";

type ChatProduct = { id: number; name: string; price: number; stock: number; image: string };
type Message = { role: "user" | "assistant"; content: string; products?: ChatProduct[] };

const GREETING: Message = {
  role: "assistant",
  content: "Xin chào! Mình là trợ lý của Kirk's Shop. Bạn cần tư vấn sản phẩm hay tra cứu đơn hàng?"
};
const SUGGESTIONS = ["Gợi ý laptop dưới 20 triệu", "Phí ship tính thế nào?", "Tra cứu đơn ORD-2026-00001"];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) })
      });
      const data = await res.json();
      setMessages([
        ...next,
        { role: "assistant", content: data.reply || data.error || "Có lỗi xảy ra.", products: data.products }
      ]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Không kết nối được chatbot, bạn thử lại sau nhé." }]);
    } finally {
      setLoading(false);
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
            <button onClick={() => setOpen(false)} aria-label="Đóng chat" className="text-xl leading-none text-white/80 hover:text-white">
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
                  {m.products?.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 hover:border-usa-navy"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-gray-900">{p.name}</span>
                        <span className="block text-xs font-semibold text-usa-red">{formatVND(p.price)}</span>
                        {p.stock <= 0 && <span className="block text-[10px] text-gray-500">Hết hàng</span>}
                      </span>
                    </Link>
                  ))}
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
        onClick={() => setOpen((v) => !v)}
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
