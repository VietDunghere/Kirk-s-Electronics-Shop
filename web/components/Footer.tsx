import EagleLogo from "./EagleLogo";

export default function Footer() {
  return (
    <footer className="mt-12 border-t bg-[#0A3161] text-slate-200">
      {/* US flag stripe */}
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(to right, #B31942 0 33%, #ffffff 33% 34%, #B31942 34% 38%, #ffffff 38% 39%, #B31942 39% 100%)" }} />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <EagleLogo size={32} />
            <h3 className="text-lg font-bold text-white">Kirk&apos;s Ecommerce Shop</h3>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            University ISAD demo e-commerce website. Simulated payments only — no real money involved.
          </p>
          <p className="mt-2 text-xs text-slate-500">Test card: 4111 1111 1111 1111 · 12/30 · 123</p>
        </div>
        <div>
          <h4 className="font-semibold text-white">Quick links</h4>
          <ul className="mt-2 space-y-1 text-sm">
            <li><a href="/" className="hover:underline">Home</a></li>
            <li><a href="/products" className="hover:underline">Products</a></li>
            <li><a href="/cart" className="hover:underline">Cart</a></li>
            <li><a href="/track-order" className="hover:underline">Track Order</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white">Demo account</h4>
          <p className="mt-2 text-sm">Email: customer@example.com</p>
          <p className="text-sm">Password: 123456</p>
        </div>
      </div>
      <div className="border-t border-white/20 py-4 text-center text-xs text-slate-300">
        Kirk&apos;s Ecommerce Shop © 2026 · IS Analysis & Design coursework
      </div>
    </footer>
  );
}
