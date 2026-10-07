"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" | "info" };
const ToastCtx = createContext<{ toast: (msg: string, kind?: Toast["kind"]) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = seq++;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              t.kind === "success" ? "bg-green-600" : t.kind === "error" ? "bg-red-600" : "bg-slate-800"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
