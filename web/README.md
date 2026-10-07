# Kirk's Ecommerce Shop — ISAD E-commerce Demo

Complete functional e-commerce website for the university **Information Systems Analysis & Design** project.
Implements all Customer use cases: Register → Login → Search → Product Detail → Add to Cart → Manage Cart → Checkout (Shipping + Simulated Card/E-wallet Payment) → Order → Track Order.

## Technology stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, responsive design
- **Backend:** Next.js API Routes (REST-style: `/api/auth`, `/api/products`, `/api/cart`, `/api/orders`)
- **Database:** Prisma ORM + SQLite (local file `prisma/dev.db`, no external services)
- **Auth:** Email + password, bcryptjs hashing, JWT in httpOnly cookie (7 days)
- **Payment:** SIMULATED only — card format validation + fake e-wallet QR confirmation. Card numbers are never stored.

## Project structure

```
app/
  page.tsx                 Homepage (hero, categories, featured/new/best-selling)
  products/page.tsx        Product list + filters
  products/[id]/page.tsx   Product detail
  search/page.tsx          Search results (name/category/description + filters/sort)
  login/page.tsx, register/page.tsx
  cart/page.tsx            Manage cart (guest localStorage + logged-in DB cart)
  checkout/page.tsx        3 steps: Shipping → Payment → Confirm
  checkout/success/page.tsx Order success + order code
  orders/page.tsx          My Orders (owner only)
  orders/[id]/page.tsx     Private order detail (403 for other users)
  track-order/page.tsx     Public order lookup by order code + timeline
  api/
    auth/register, login, logout, me
    products, products/[id]
    cart, cart/[productId]
    orders (GET mine / POST checkout), orders/[id], orders/by-code/[code]
components/
  Navbar, Footer, Toast, ProductCard, ProductGrid,
  ShippingForm, PaymentSelector, OrderStatusTimeline, OrderDetailView
lib/  utils.ts, types.ts   (shared by pages; business rules are re-exported from the domain layer)
server/                    Layered architecture (Architecture Design, Hình 3 and Hình 4)
  presentation/controller/ CustomerController, ProductController, CartController,
                           CheckoutController, OrderController, ChatController (+ http.ts: session cookie, error mapping)
  application/service/     CustomerService, ProductService, CartService,
                           CheckoutService (checkout), OrderService, ChatService (+ appError.ts)
  domain/
    customer/              Customer, SessionUser, registration rules
    product/               Product, stock rules
    cart/                  Cart, CartItem, subtotal rules
    order/                 Order, OrderItem, Shipping/Payment validation, shipping fee, order code
  infrastructure/
    repository/            CustomerRepository, ProductRepository, CartRepository, OrderRepository (Prisma only)
    database/              prisma.ts (shared Prisma client)
prisma/ schema.prisma, seed.ts
```

Names follow Hình 1 / Hình 2: `CheckoutService.checkout(cartID)` (+ `enterShipping`, `pay`), `CartService.addItem/updateQuantity/removeItem(cartID, ...)`,
`CartRepository` / `OrderRepository` `findById` + `save`, `Order.calculateTotal()`, `Cart.clear()`, `Payment` → `IDCard` / `Ewallet`.

Dependency direction (matches Hình 4): `app/api/*/route.ts` → controller → service → domain and repository;
repository → domain; domain imports nothing from the other layers. The route files in `app/api` only forward
to a controller, because Next.js requires route handlers to live under `app/`.

## Database (Prisma + SQLite)

- **User**(id, fullName, email unique, passwordHash, createdAt)
- **Product**(id, name, description, price, stock, image, category, rating, sold, isNew, isFeatured, createdAt)
- **Cart**(id, userId unique) → **CartItem**(cartId, productId, quantity, unique[cartId,productId])
- **Order**(id, orderCode unique `ORD-YYYY-00001`, userId, totalAmount, subtotal, shippingFee, paymentMethod `CARD|MOMO|ZALOPAY|VNPAY`, paymentStatus `PAID`, orderStatus 6-step, shipping fields, note, createdAt) → **OrderItem**(orderId, productId, productName, price, quantity)

Order statuses: `Order Placed → Confirmed → Processing → Shipped → Out for Delivery → Delivered` (rendered as progress timeline).

## Installation & run (classroom demo)

```bash
npm install
npx prisma migrate dev --name init   # creates prisma/dev.db
npx prisma db seed                   # 20 products + test customer
npm run dev                          # open http://localhost:3000
```

One-liner alternative: `npm run db:setup` (migrate + seed).

Build check: `npm run build` · `npx tsc --noEmit`.

## Test accounts & payment

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@example.com` | `123456` |

Simulated card (any valid-format card passes; this one is pre-filled):
- Number `4111 1111 1111 1111`, Expiry `12/30`, CVV `123`, holder any name.

E-wallets: choose **MoMo / ZaloPay / VNPay**, tick *"I have completed payment"* (= Confirm Payment).

Shipping fee: 30,000 VND, **free over 500,000 VND**.

## Main use cases covered

1. Register (validation: required, email format, min 6 chars, match, unique email; auto-login)
2. Login/Logout (error `Invalid email or password.`, navbar shows user)
3. Search (header bar; empty → `Please enter a product keyword.`; none → `No products found.`; filters: category, price, sort)
4. Product detail (stock, rating, qty selector; out-of-stock disables Add to Cart)
5. Add to Cart (stock check, merge duplicates, toast `Product added to cart successfully.`)
6. Manage Cart (qty +/−/edit, remove, clear with confirm, totals, `Your cart is empty.`)
7. Checkout (login gate → redirect login → 3 steps, order summary always visible, empty cart blocked)
8. Shipping form (required validation, phone regex, cannot continue until valid)
9. Payment (Card form validation / E-wallet QR + confirm; success → `Payment successful.`)
10. Order creation (`ORD-YYYY-00001`, decrements stock, clears cart, success page + Track button)
11. Track Order (`Order not found.` on invalid code; timeline; My Orders owner-scoped, 403 for others)

Business rules enforced server-side: stock limits, login before checkout, shipping before payment, payment before order, stock decrement + cart clear in one transaction, per-user order isolation.

## Demo script (for lecturer, ~5 minutes)

1. Open `/register` → create account → auto-login to homepage.
2. Or login with `customer@example.com / 123456`.
3. Header search `Laptop` → results → category/price/sort filters.
4. Click a laptop → detail → quantity → Add to Cart (toast).
5. Open Cart → change quantity, see totals → Proceed to Checkout.
6. Step 1: fill shipping (name, phone `0901234567`, address, city, district, ward).
7. Step 2: keep Card with test card `4111 1111 1111 1111 / 12/30 / 123` (or switch to MoMo + tick confirm).
8. Step 3: review → Pay & Place Order → success page shows `ORD-2026-00001`.
9. Click Track Order → timeline `Order Placed`.
10. Try invalid code `ORD-2026-99999` → `Order not found.`
11. Open My Orders → click order → detail. Logout → try `/checkout` → redirected to login.

## Limitations

- SQLite single-file DB (fine for demo, not concurrent production use).
- JWT in cookie without refresh rotation; no email verification / password reset.
- Images via `picsum.photos` placeholders (needs internet; product data works offline).
- Order status stays `Order Placed` (no admin panel to advance status — timeline component supports all 6 states).
- Guest cart is localStorage-only until login (then merged to server cart).
