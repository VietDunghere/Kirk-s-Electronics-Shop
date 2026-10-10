"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import EagleLogo from "./EagleLogo";

type Me = { id: number; fullName: string; email: string } | null;

export default function Navbar() {
  const [me, setMe] = useState<Me>(null);
  const [cartCount, setCartCount] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const refreshMe = async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await r.json();
      setMe(d.user ?? null);
    } catch {
      setMe(null);
    }
  };

  const refreshCart = async () => {
    try {
      const r = await fetch("/api/cart", { cache: "no-store" });
      if (!r.ok) {
        // guest cart from localStorage
        const raw = localStorage.getItem("guest_cart");
        if (raw) {
          const items = JSON.parse(raw) as { qty: number }[];
          setCartCount(items.reduce((s, i) => s + (i.qty || 0), 0));
        } else setCartCount(0);
        return;
      }
      const d = await r.json();
      setCartCount(d.cart?.totalCount ?? 0);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    refreshMe();
    refreshCart();
    const h = () => {
      refreshMe();
      refreshCart();
    };
    window.addEventListener("cart-updated", h);
    window.addEventListener("auth-updated", h);
    return () => {
      window.removeEventListener("cart-updated", h);
      window.removeEventListener("auth-updated", h);
    };
  }, []);

  const doSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!keyword.trim()) {
      toast("Please enter a product keyword.", "error");
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(keyword.trim())}`);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    window.dispatchEvent(new Event("auth-updated"));
    window.dispatchEvent(new Event("cart-updated"));
    toast("Logged out successfully.");
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* US flag stripe — red / white / navy */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#B31942] via-[#B31942] to-[#0A3161]" style={{ background: "linear-gradient(to right, #B31942 0 33%, #ffffff 33% 34%, #B31942 34% 38%, #ffffff 38% 39%, #0A3161 39% 100%)" }} />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-[#0A3161]">
          <EagleLogo size={36} />
          <span className="leading-tight">Kirk&apos;s <span className="text-[#B31942]">Ecommerce</span> Shop</span>
        </Link>
        <form onSubmit={doSearch} className="hidden flex-1 items-center md:flex">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search products, categories..."
            className="w-full rounded-l-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-[#B31942]"
          />
          <button className="rounded-r-lg bg-[#0A3161] px-5 py-2 text-sm font-semibold text-white hover:bg-[#B31942]">
            Search
          </button>
        </form>
        <nav className="ml-auto hidden items-center gap-4 text-sm font-medium lg:flex">
          <Link href="/" className="hover:text-[#B31942]">Home</Link>
          <Link href="/products" className="hover:text-[#B31942]">Products</Link>
          <Link href="/bundle" className="hover:text-[#B31942]">🤖 AI Setup</Link>
          <Link href="/track-order" className="hover:text-[#B31942]">Track Order</Link>
          {me && <Link href="/orders" className="hover:text-[#B31942]">My Orders</Link>}
        </nav>
        <Link href="/cart" className="relative rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50">
          🛒 Cart
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B31942] px-1 text-xs text-white">
              {cartCount}
            </span>
          )}
        </Link>
        {me ? (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="max-w-32 truncate text-sm font-semibold" title={me.email}>{me.fullName}</span>
            <button onClick={logout} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold hover:bg-gray-200">
              Logout
            </button>
          </div>
        ) : (
          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/login" className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-gray-50">Login</Link>
            <Link href="/register" className="rounded-lg bg-[#0A3161] px-3 py-2 text-sm font-semibold text-white hover:bg-[#B31942]">Register</Link>
          </div>
        )}
        <button className="rounded-lg border px-3 py-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <form onSubmit={doSearch} className="flex">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-l-lg border border-gray-300 px-4 py-2 text-sm outline-none"
          />
          <button className="rounded-r-lg bg-[#0A3161] px-4 py-2 text-sm font-semibold text-white">Go</button>
        </form>
      </div>
      {menuOpen && (
        <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm font-medium lg:hidden">
          <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/products" onClick={() => setMenuOpen(false)}>Products</Link>
          <Link href="/bundle" onClick={() => setMenuOpen(false)}>🤖 AI Setup</Link>
          <Link href="/track-order" onClick={() => setMenuOpen(false)}>Track Order</Link>
          {me ? (
            <>
              <Link href="/orders" onClick={() => setMenuOpen(false)}>My Orders ({me.fullName})</Link>
              <button onClick={logout} className="text-left text-red-600">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
