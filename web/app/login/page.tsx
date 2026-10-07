"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";

function LoginInner() {
  const [email, setEmail] = useState("customer@example.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("redirect") || "/";
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setBusy(true);
    const r = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error || "Invalid email or password."); return; }
    try {
      const raw = localStorage.getItem("guest_cart");
      if (raw) {
        const items = JSON.parse(raw) as { productId: number; qty: number }[];
        for (const it of items) {
          await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: it.productId, quantity: it.qty }) });
        }
        localStorage.removeItem("guest_cart");
      }
    } catch { /* ignore */ }
    window.dispatchEvent(new Event("auth-updated"));
    window.dispatchEvent(new Event("cart-updated"));
    toast("Login successful.");
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back. Demo account is pre-filled.</p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Email *</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password *</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <button disabled={busy} className="w-full rounded-lg bg-[#0A3161] py-2.5 text-sm font-bold text-white hover:bg-[#B31942] disabled:opacity-60">
            {busy ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="mt-3 text-center text-sm">No account? <Link href="/register" className="font-semibold text-[#0A3161] hover:underline">Register</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center">Loading...</p>}>
      <LoginInner />
    </Suspense>
  );
}
