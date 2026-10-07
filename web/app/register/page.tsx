"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.password || !form.confirmPassword) {
      setError("All fields are required."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Invalid email format."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirmPassword) { setError("Password and confirmation must match."); return; }
    setBusy(true);
    const r = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setError(d.error || "Registration failed."); return; }
    // merge guest cart into server cart
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
    toast("Registration successful. You are now logged in.");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Register Account</h1>
        <p className="mt-1 text-sm text-gray-500">Create a customer account to shop and checkout.</p>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Full name *</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nguyen Van A" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email *</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password (min 6 chars) *</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirm password *</label>
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="••••••" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#B31942]" />
          </div>
          <button disabled={busy} className="w-full rounded-lg bg-[#0A3161] py-2.5 text-sm font-bold text-white hover:bg-[#B31942] disabled:opacity-60">
            {busy ? "Registering..." : "Register"}
          </button>
        </form>
        <p className="mt-3 text-center text-sm">Already have an account? <Link href="/login" className="font-semibold text-[#0A3161] hover:underline">Login</Link></p>
      </div>
    </div>
  );
}
