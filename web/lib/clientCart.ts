// Browser helper: add a product to the cart (logged-in cart in the DB, otherwise the guest cart in localStorage).
export async function addProductToCart(productId: number, quantity: number, stock: number): Promise<{ ok: boolean; message: string }> {
  try {
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity })
    });
    if (r.status === 401) {
      const raw = localStorage.getItem("guest_cart");
      const items: { productId: number; qty: number }[] = raw ? JSON.parse(raw) : [];
      const found = items.find((i) => i.productId === productId);
      if (found) found.qty = Math.min(found.qty + quantity, stock);
      else items.push({ productId, qty: Math.min(quantity, stock) });
      localStorage.setItem("guest_cart", JSON.stringify(items));
      window.dispatchEvent(new Event("cart-updated"));
      return { ok: true, message: "Product added to cart successfully." };
    }
    const d = await r.json();
    if (!r.ok) return { ok: false, message: d.error || "Could not add to cart." };
    window.dispatchEvent(new Event("cart-updated"));
    return { ok: true, message: "Product added to cart successfully." };
  } catch {
    return { ok: false, message: "Could not add to cart." };
  }
}

// Compare tray: product ids kept in localStorage (max 3).
export const COMPARE_KEY = "compare_ids";
export const COMPARE_MAX = 3;

export function readCompare(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
    return Array.isArray(v) ? v.map(Number).filter(Boolean).slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

export function writeCompare(ids: number[]) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.slice(0, COMPARE_MAX)));
  } catch {
    /* storage unavailable: the tray just will not persist */
  }
  window.dispatchEvent(new Event("compare-updated"));
}
