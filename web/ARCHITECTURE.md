# Kiến trúc và luồng hoạt động của web Kirk's Ecommerce Shop

Tài liệu này đối chiếu **code thật trong `web/server`** với các sơ đồ trong `VP/MAIN.vpp`:

| Hình | Sơ đồ trong Visual Paradigm | Dùng để kiểm tra |
|---|---|---|
| Hình 1 | `A05 - Design Class Diagram` | tên class, phương thức, quan hệ giữa các class |
| Hình 2 | Sequence `checkout` | thứ tự gọi khi thanh toán |
| Hình 4 | `A05 - Package Organization` | các tầng (package) và hướng phụ thuộc |

Phạm vi: **phần lõi** của shop (tìm sản phẩm, xem chi tiết, đăng nhập, giỏ hàng, thanh toán, tra cứu đơn).
Các tính năng AI, giao hàng bằng drone/xe tự lái, bản đồ theo dõi đơn và chatbot được thêm sau và
**không nằm trong sơ đồ** (xem mục 7).

**Mục lục**

- **Phần A: kiến trúc có đúng sơ đồ không** (mục 1 đến 8)
- **Phần B: luồng hoạt động chi tiết, để học và nhớ** (mục 9 đến 15):
  bản đồ file (9), quy ước chung (10), các luồng lõi: sản phẩm, đăng ký, đăng nhập, giỏ, thanh toán, đơn hàng, theo dõi giao hàng (11),
  các luồng AI và tính năng thêm: gợi ý cách giao, so sánh, setup theo ngân sách, chatbot, tìm bằng ảnh, tìm bằng giọng nói (12),
  dữ liệu và lệnh nạp sản phẩm (13), bảng tra endpoint (14), cách tự học (15).

# PHẦN A. KIẾN TRÚC CÓ ĐÚNG SƠ ĐỒ KHÔNG

## 1. Kết luận

| Nội dung | Kết quả |
|---|---|
| 4 tầng và các package con (`domain.customer/product/order/cart`, `infrastructure.repository`, `infrastructure.database`) | **Khớp hoàn toàn** |
| 24/24 class trong Hình 1 đều có file tương ứng trong code | **Khớp hoàn toàn** |
| Hướng phụ thuộc giữa các tầng (Hình 4) | **Khớp, 0 vi phạm** (mục 3) |
| Phương thức của 5 Service | **10/10** có trong code |
| Phương thức của 5 Controller | **10/10** (gồm `enterShipping`, `pay` trong `CheckoutController`) |
| Phương thức của 4 Repository | **7/7** (`findByUsername` cài đúng tên) |
| Phương thức của các class domain | **14/17** có trong code; 3 phương thức còn lại có lý do ở mục 6 |
| Luồng checkout (Hình 2) | **Khớp** thứ tự; code có thêm vài bước kiểm tra (mục 5) |

Nói gọn: **cấu trúc và hầu hết phương thức đúng như đã vẽ**; còn vài khác biệt nhỏ và đều có lý do ở mục 6.

## 2. Thư mục ↔ package trong sơ đồ

```
web/server/
  presentation/controller/    ← package presentation.controller   (Hình 4)
  application/service/        ← package application.service
  domain/{customer,product,order,cart}/   ← package domain.*
  infrastructure/repository/  ← package infrastructure.repository
  infrastructure/database/    ← package infrastructure.database   (prisma.ts)
web/app/api/**/route.ts       ← cổng HTTP của Next.js, chỉ chuyển cho Controller
web/app, web/components       ← giao diện (React)
```

| Package trong sơ đồ | Class trong sơ đồ | File trong code |
|---|---|---|
| presentation.controller | ProductController, CustomerController, CartController, CheckoutController, OrderController | `presentation/controller/<tên>Controller.ts` |
| application.service | ProductService, CustomerService, CartService, CheckoutService, OrderService | `application/service/<tên>Service.ts` |
| infrastructure.repository | ProductRepository, CustomerRepository, CartRepository, OrderRepository | `infrastructure/repository/<tên>Repository.ts` |
| domain.customer | Customer | `domain/customer/customer.ts` |
| domain.product | Product | `domain/product/product.ts` |
| domain.cart | Cart, CartItem | `domain/cart/cart.ts` |
| domain.order | Order, OrderItem, Shipping, Payment, IDCard, Ewallet | `domain/order/order.ts` |

Mỗi Controller, Service, Repository là một module xuất ra một object (ví dụ `export const cartService = { ... }`)
chứ không phải `class`. Tên và vai trò giữ nguyên như trong sơ đồ.
Các class domain (`Customer`, `Cart`, `CartItem`, `Order`, `OrderItem`, `Shipping`, `Payment`, `IDCard`, `Ewallet`) là `class` thật,
`IDCard` và `Ewallet` kế thừa `Payment` đúng như Hình 1. Riêng `Product` là kiểu dữ liệu thuần kèm hàm quy tắc tồn kho.

## 3. Hướng phụ thuộc và bằng chứng

Hình 4 (các tầng) cùng các thuộc tính trong Hình 1 (Controller giữ Service, Service giữ Repository) cho thấy:
`controller → service → (domain, repository)`, `repository → (domain, database)`, `domain` không phụ thuộc tầng nào
(trong domain chỉ có `cart → product` và `order`/`product` dùng lại nhau, đều nằm trong cùng tầng). Con quét toàn bộ lệnh `import` trong `web/` (bỏ qua thư viện ngoài)
và gom theo tầng:

| Từ → Đến | Số lệnh import (cặp file) | Nằm trong sơ đồ? |
|---|---|---|
| presentation → application | 13 | có (Controller gọi Service) |
| application → domain | 16 | có |
| application → repository | 15 | có |
| repository → domain | 4 | có |
| repository → database | 4 | có |
| route (`app/api`) → presentation | 18 | có (route chỉ gọi Controller) |
| domain → bất kỳ tầng nào | **0** | có (domain độc lập) |
| repository → service/controller | **0** | có (không gọi ngược lên) |
| service → controller | **0** | có |

Mỗi lệnh dưới đây chạy ở thư mục gốc của repo và **không in ra gì** nếu cấu trúc đúng:

```bash
# Controller không được đụng tới repository hay domain
git grep --untracked -nE "^import .*(infrastructure|/domain/)" -- web/server/presentation
# Domain không được phụ thuộc tầng nào
git grep --untracked -nE "^import .*(application|infrastructure|presentation)" -- web/server/domain
# Repository không được gọi ngược lên service/controller
git grep --untracked -nE "^import .*(application|presentation)" -- web/server/infrastructure
# Service không được gọi Controller
git grep --untracked -nE "^import .*presentation" -- web/server/application
# Mọi route API chỉ import Controller (kết quả phải là 0)
git grep --untracked -hE "^import" -- web/app/api | grep -vc "presentation/controller"
```

Ghi chú: các tính năng thêm sau (tìm bằng ảnh, tư vấn AI) làm `application → infrastructure.llm/weather` (7 lệnh import).
Đây là Service gọi dịch vụ ngoài, vẫn đi **xuống** dưới, không phá quy tắc một chiều.

## 4. Vì sao thiết kế này đúng

- **Mỗi tầng một trách nhiệm.** Controller chỉ đọc yêu cầu HTTP, kiểm tra đăng nhập và trả JSON.
  Service chứa luồng nghiệp vụ. Domain chứa quy tắc thuần (phí ship, kiểm tra tồn kho, kiểm tra thẻ).
  Repository chỉ gọi Prisma. Nhờ vậy mỗi lỗi có chỗ để tìm: sai tiền thì vào `domain/order`, sai SQL thì vào repository.
- **Phụ thuộc một chiều từ trên xuống.** Tầng dưới không biết tầng trên tồn tại, nên có thể thay thế tầng dưới
  mà không sửa tầng trên. Ví dụ đổi SQLite sang PostgreSQL chỉ phải sửa `infrastructure` (Prisma schema và repository).
- **Domain độc lập framework.** `domain/` không import Next.js hay Prisma. Thư viện duy nhất là `bcryptjs`, dùng để
  so khớp mật khẩu trong `Customer.login`. Nhờ vậy quy tắc kiểm thử được mà không cần CSDL
  (ví dụ `calcShipping`, `Cart.addItem`, `Order.calculateTotal`).
- **Route mỏng.** Next.js bắt buộc file route nằm trong `app/api`, nên mỗi route chỉ có một dòng gọi Controller.
  Nhờ đó cấu trúc 4 tầng không bị phụ thuộc vào cách đặt thư mục của Next.js.
- **Luồng nghiệp vụ phức tạp nằm ở đúng một chỗ.** Thanh toán đụng giỏ hàng, kho và đơn hàng nên được gom vào
  `CheckoutService` và lưu trong **một transaction** ở `OrderRepository.save`, vì vậy không bao giờ có chuyện
  trừ kho mà giỏ vẫn còn hoặc ngược lại.

## 5. Luồng checkout (Hình 2) ↔ code

`CheckoutService.checkout(cartID, userId, input)` (file `application/service/checkoutService.ts`):

| Hình 2 | Trong code |
|---|---|
| 1. `CheckoutController → checkout(cartID)` | `checkoutController.checkout` lấy phiên đăng nhập rồi gọi `checkoutService.checkout` |
| 3-4. `CartRepository.findById(cartID)` trả về `cart` | `cartRepository.findById(cartID)` |
| 5. `validateCartItems(cart)` (tự gọi) | hàm `validateCartItems(cart)`: giỏ không rỗng, mọi mặt hàng đủ tồn kho |
| 6-9. tạo `Order`, tạo các `OrderItem` (vòng lặp) | `Order.createOrder(cart, ...)` (Hình 1): tạo `Order`, mỗi dòng giỏ thành một `OrderItem` |
| 10-12. `Order.calculateTotal()` | `order.calculateTotal()` (gọi trong `createOrder`; tổng tiền hàng + phí ship) |
| 13-15. `OrderRepository.save(order)` | `orderRepository.save(order)`: tạo đơn, trừ kho và xoá giỏ trong một transaction |
| 16-18. `Cart.clear()` | `cart.clear()` |
| 19-20. trả về `order` | `return saved` rồi Controller trả JSON |

Code có thêm các bước mà Hình 2 không vẽ: kiểm tra địa chỉ giao hàng và thông tin thanh toán ở đầu hàm
(`enterShipping`, `pay`), kiểm tra giỏ thuộc về người đang đăng nhập, gọi `payment.pay(tổng tiền)` (mô phỏng, trả "PAID")
trước khi lưu, và sinh mã đơn `ORD-năm-số`.
Đây là các bước kiểm tra phụ, không đổi thứ tự các lời gọi chính trong sơ đồ.

## 6. Những chỗ còn khác sơ đồ, và lý do

Các phương thức dưới đây **đã được cài đúng tên và đúng trách nhiệm như Hình 1**:
`Cart.addItem/removeItem/updateQuantity/calculateTotal`, `CartItem.calculateSubTotal`, `OrderItem.calculateSubTotal`,
`Order.createOrder/calculateTotal/getStatus`, `Shipping.updateShippingInfo/getShippingStatus`,
`Payment.pay/getPaymentStatus`, `Customer.login`, `CustomerRepository.findByUsername`, `CheckoutController.enterShipping/pay`.
Service gọi các phương thức domain này rồi nhờ Repository lưu (ví dụ `CartService.addItem` gọi `cart.addItem(...)`
rồi `cartRepository.save(cart)`).

Còn khác sơ đồ:

1. **`Product.search` và `Product.getDetails` không nằm trong class `Product`.** Tìm trong cả danh mục không phải việc của
   một sản phẩm đơn lẻ, và nó cần truy vấn CSDL, nên do `ProductService.search/getDetail` và `ProductRepository.search`
   đảm nhiệm. `Product` giữ các quy tắc tồn kho (`isInStock`, `hasEnoughStock`).
2. **`Cart.checkout` không có riêng.** Hình 1 vẽ hai tên cho cùng một việc (`Cart.checkout()` và `Order.createOrder(cart)`).
   Code cài **một** chỗ là `Order.createOrder(cart, ...)`, do `CheckoutService.checkout` gọi đúng như Hình 2,
   để không có hai đường tạo đơn.
3. **`enterShipping` và `pay` không nhận tham số `orderID`.** Hình 1 vẽ hai phương thức này nhận `orderID`, tức là đơn đã tồn tại.
   Trong web, đơn chỉ được tạo **sau khi thanh toán** thành công (đúng mô tả use case Check out).
   Nếu tạo đơn trước rồi mới nhập địa chỉ và thanh toán thì thẻ sai sẽ để lại một đơn dở dang đã trừ kho và xoá giỏ.
   Vì vậy hai phương thức kiểm tra thông tin ở từng bước (`POST /api/checkout/shipping` và `/api/checkout/payment`,
   giao diện gọi khi bấm "Continue to Payment" và "Review Order"), còn `checkout` mới tạo, thanh toán và lưu đơn.
4. **Hai phụ thuộc thêm so với Hình 1:** `CartService` dùng thêm `ProductRepository` (lấy sản phẩm cần thêm vào giỏ),
   và `CheckoutController` dùng thêm `CartService` để lấy mã giỏ của người đang đăng nhập.
   Cả hai vẫn đi đúng chiều controller → service → repository.
5. **Kiểu của mã định danh.** Sơ đồ ghi `String` (ví dụ `cartID: String`), CSDL dùng số nguyên `Int`.
   Đây chỉ là khác về kiểu dữ liệu, không ảnh hưởng cấu trúc.
6. **Giao diện dùng lại hằng số nghiệp vụ.** `web/lib/utils.ts` xuất lại vài hằng số của domain (phí ship, các trạng thái đơn)
   để trang web hiển thị cho khớp quy tắc. Đây là import kiểu "đọc hằng số", không gọi logic và không đi qua Service.

## 7. Phần ngoài sơ đồ

Các tính năng sau được thêm sau khi vẽ sơ đồ và **cố ý không đưa vào** Hình 1, 2, 4:
giao hàng bằng drone/xe tự lái (cột `deliveryMethod`, theo dõi đơn có bản đồ), gợi ý cách giao, so sánh sản phẩm,
tư vấn bộ sản phẩm theo ngân sách, chatbot, tìm bằng ảnh và giọng nói.
Chúng tuân theo cùng quy tắc tầng (mỗi tính năng là một Service và Controller riêng, quy tắc nằm ở `domain`,
việc gọi dịch vụ ngoài nằm ở `infrastructure.llm` và `infrastructure.weather`).
Riêng `ProductService.searchByImage`, `OrderService` (tính trạng thái theo dõi đơn) và `CheckoutService` (chọn cách giao)
nằm chung file với các Service lõi.

## 8. Tóm tắt để trình bày

> Web được tổ chức đúng 4 tầng như Hình 4. Controller chỉ gọi Service, Service gọi Domain và Repository,
> Repository chỉ gọi Prisma, còn Domain không phụ thuộc tầng nào, và các lệnh `git grep` ở mục 3 kiểm chứng điều đó.
> 24 class của Hình 1 đều có trong code; toàn bộ phương thức của Controller, Service, Repository được cài đúng tên,
> 14/17 phương thức của class domain cũng vậy; luồng checkout đi đúng thứ tự Hình 2.
> Khác biệt đáng kể duy nhất là `enterShipping/pay` không nhận `orderID`, vì đơn chỉ được tạo sau khi thanh toán.


---

# PHẦN B. LUỒNG HOẠT ĐỘNG CHI TIẾT (để học và nhớ)

Phần A (mục 1 đến 8 ở trên) trả lời "cấu trúc có đúng sơ đồ không". Phần B này trả lời
**"khi khách bấm một nút thì code nào chạy, ở file nào, nhận gì, trả gì"** cho **tất cả** các luồng,
kể cả các luồng AI. Mọi đường dẫn tính từ thư mục `web/`.

## 9. Bản đồ file: cái gì nằm ở đâu

```
web/
├─ app/                          ← các TRANG (React) và các CỔNG API của Next.js
│  ├─ page.tsx                   Trang chủ
│  ├─ products/page.tsx          Danh sách sản phẩm + bộ lọc
│  ├─ products/[id]/page.tsx     Chi tiết sản phẩm
│  ├─ search/page.tsx            Kết quả tìm kiếm chữ
│  ├─ search-image/page.tsx      Kết quả tìm bằng ảnh
│  ├─ cart/page.tsx              Giỏ hàng (khách và đã đăng nhập)
│  ├─ checkout/page.tsx          Thanh toán 3 bước
│  ├─ checkout/success/page.tsx  Đặt hàng thành công
│  ├─ orders/page.tsx            Đơn của tôi
│  ├─ orders/[id]/page.tsx       Chi tiết một đơn (chỉ chủ đơn)
│  ├─ track-order/page.tsx       Theo dõi đơn (chọn đơn hoặc nhập mã)
│  ├─ login/ và register/        Đăng nhập, đăng ký
│  ├─ compare/page.tsx           So sánh sản phẩm bằng AI
│  ├─ bundle/page.tsx            Setup theo ngân sách bằng AI
│  └─ api/**/route.ts            Cổng API: mỗi file chỉ 1 dòng gọi Controller
├─ components/                   ← mảnh giao diện dùng lại
│  ├─ Navbar, Footer, Toast, ProductCard, ProductGrid, HeroSlider
│  ├─ ShippingForm, PaymentSelector, DeliverySelector      (thanh toán)
│  ├─ OrderDetailView, OrderStatusTimeline, DeliveryTracker, DeliveryMap  (đơn và theo dõi)
│  ├─ CompareBar, SearchTools                               (so sánh, tìm giọng nói và ảnh)
│  └─ ChatWidget                                            (chatbot)
├─ lib/                          ← tiện ích dùng ở trình duyệt
│  ├─ utils.ts (định dạng tiền, nhãn, xuất lại hằng số domain)   types.ts (kiểu DTO)
│  ├─ clientCart.ts (thêm giỏ + khay so sánh)   clientImage.ts (thu nhỏ ảnh)
│  └─ geo.ts (toạ độ PTIT, tìm địa chỉ, tuyến đường, vị trí trên tuyến)
├─ server/                       ← 4 TẦNG của Phần A
│  ├─ presentation/controller/   Controller + http.ts (cookie, đăng nhập, lỗi)
│  ├─ application/service/       Service (luồng nghiệp vụ)
│  ├─ domain/{customer,product,order,cart}/   quy tắc thuần + domainError.ts
│  └─ infrastructure/
│     ├─ repository/             gọi Prisma
│     ├─ database/prisma.ts      kết nối CSDL
│     ├─ llm/                    gọi Groq (chat, nhìn ảnh, giọng nói)
│     └─ weather/                gọi Open-Meteo (thời tiết)
├─ prisma/                       ← CSDL SQLite: schema.prisma, migrations/, seed và các script thêm sản phẩm
└─ public/                       ← ảnh tĩnh (logo, ảnh quảng cáo, ảnh sản phẩm trong public/products)
```

## 10. Quy ước chung của mọi luồng (đọc trước, nhớ một lần)

**Đường đi chuẩn của một yêu cầu**

```
Trang React ──fetch("/api/...")──► app/api/.../route.ts  (1 dòng)
   ──► Controller  (đọc HTTP, kiểm tra đăng nhập, định dạng JSON)
   ──► Service     (luồng nghiệp vụ; ném AppError khi sai)
   ──► Domain      (quy tắc thuần)   và   Repository ──► Prisma ──► SQLite
JSON trả ngược lại: { ... dữ liệu ... }  hoặc  { "error": "thông báo" } kèm mã HTTP
```

**Xử lý lỗi.** Service ném `AppError(mã, thông báo)` (`application/service/appError.ts`). Controller bắt lỗi bằng
`fail(e)` (`presentation/controller/http.ts`) và trả `{ "error": thông báo }` với đúng mã. Lỗi lạ (không phải `AppError`)
thành mã 500 với thông báo chung. Domain ném `DomainError` (`domain/domainError.ts`); Service đổi nó thành `AppError`
(400, hoặc 404 khi `notFound`).

**Đăng nhập.** Sau khi đăng ký hoặc đăng nhập, server đặt cookie `shopviet_token` (JWT, hiệu lực 7 ngày, `httpOnly`,
`sameSite=lax`). `getSessionUser()` đọc cookie và kiểm tra người dùng còn trong CSDL (cookie cũ sau khi reseed thành "chưa đăng nhập").
`requireSession(thông báo)` ném 401 khi chưa đăng nhập.

**Khách chưa đăng nhập.** Giỏ của khách nằm ở `localStorage["guest_cart"]` (mảng `{productId, qty}`). Khi đăng nhập hoặc đăng ký,
trang gộp giỏ này vào giỏ trên server rồi xoá `guest_cart`.

**Sự kiện và bộ nhớ trình duyệt**

| Tên | Loại | Ý nghĩa |
|---|---|---|
| `cart-updated` | sự kiện `window` | giỏ vừa đổi, Navbar đọc lại số lượng |
| `auth-updated` | sự kiện `window` | vừa đăng nhập hoặc đăng xuất, Navbar đọc lại người dùng |
| `compare-updated` | sự kiện `window` | khay so sánh vừa đổi |
| `guest_cart` | localStorage | giỏ của khách |
| `compare_ids` | localStorage | tối đa 3 mã sản phẩm đang chọn để so sánh |
| `kirk_chat_history` | localStorage | lịch sử chatbot đã lưu |
| `voice_search_lang` | localStorage | ngôn ngữ nói đã chọn (`vi-VN` hoặc `en-US`) |
| `image_search_photo` | sessionStorage | ảnh vừa chọn, chuyển sang trang `/search-image` |
| `last_order_code` | sessionStorage | mã đơn vừa đặt |

**Biến môi trường** (`web/.env`, không đưa lên GitHub): `DATABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`
(bật các tính năng AI), `GROQ_MODEL` (chat, mặc định `openai/gpt-oss-120b`), `GROQ_VISION_MODEL` (đọc ảnh, mặc định `qwen/qwen3.8-27b`),
`GROQ_STT_MODEL` (giọng nói, mặc định `whisper-large-v3`). Không có `GROQ_API_KEY` thì các tính năng AI tự dùng quy tắc dự phòng,
riêng tìm bằng ảnh và giọng nói trả 503.

---

## 11. Các luồng lõi

### 11.1 Xem trang chủ, danh sách, tìm kiếm chữ và chi tiết sản phẩm

**Kích hoạt:** mở `/`, `/products`, gõ vào ô tìm kiếm (Navbar), mở `/products/12`.

| Việc | File (thư mục) | Vai trò |
|---|---|---|
| Trang chủ | `app/page.tsx` | trang server, gọi `productController.homePage()` trực tiếp, không qua API |
| Danh sách | `app/products/page.tsx` | tự gọi `GET /api/products?...` khi đổi bộ lọc |
| Tìm kiếm | `app/search/page.tsx`, `components/Navbar.tsx` | Navbar chuyển tới `/search?q=...` |
| Chi tiết | `app/products/[id]/page.tsx` | gọi `GET /api/products/{id}` |
| Cổng API | `app/api/products/route.ts`, `app/api/products/[id]/route.ts` | gọi `search`, `viewDetail` |
| Controller | `presentation/controller/productController.ts` | `homePage`, `search`, `viewDetail` |
| Service | `application/service/productService.ts` | `getHomeSections`, `search`, `getDetail` |
| Repository | `infrastructure/repository/productRepository.ts` | `search`, `findById`, `findRelated`, `findFeatured`, `findNewest`, `findBestSelling` |

**Chạy thế nào (tìm kiếm / danh sách)**
1. Trang gom bộ lọc thành chuỗi truy vấn và gọi `GET /api/products?q=&category=&minPrice=&maxPrice=&sort=&limit=`.
2. `productController.search` đọc tham số: `q`, `category`, `minPrice`, `maxPrice`, `featured` (`1`), `sort` (mặc định `newest`), `limit` (mặc định 100, tối đa 100).
3. `productService.search` cắt `limit` về tối đa 100 rồi gọi `productRepository.search(bộ lọc, sort, limit)`.
4. Repository dựng điều kiện Prisma: `q` khớp (chứa) tên, mô tả hoặc danh mục; `category` đúng bằng; khoảng giá; `featured`.
   Thứ tự sắp: `newest` (mới nhất), `price-asc`, `price-desc`, `name`, `popular` (bán nhiều), `rating`.
5. Trả `{ "products": [...] }`; trang hiển thị lưới thẻ `ProductCard`.
   Nếu `q` rỗng, trang `/search` hiện "Please enter a product keyword."; không có kết quả hiện "No products found.".

**Chạy thế nào (chi tiết)**: `GET /api/products/{id}` → `productService.getDetail(id)`: `id` không hợp lệ ném 400 "Invalid product id.";
không có sản phẩm ném 404 "Product not found."; có thì lấy thêm 4 sản phẩm cùng danh mục (`findRelated`).

**Chạy thế nào (trang chủ)**: `getHomeSections` lấy song song 8 sản phẩm nổi bật (`isFeatured`), 8 sản phẩm mới nhất, 8 sản phẩm bán chạy nhất.

| | Nội dung |
|---|---|
| **Input** | tham số truy vấn như trên; hoặc `id` sản phẩm trên đường dẫn |
| **Output** | `{ products: Product[] }` hoặc `{ product, related: Product[] }` |
| **Lỗi** | 400 id sai; 404 không có sản phẩm |

### 11.2 Đăng ký

**Kích hoạt:** nút Register ở `/register`.

| Việc | File |
|---|---|
| Trang | `app/register/page.tsx` |
| Cổng API | `app/api/auth/register/route.ts` → `customerController.register` |
| Service | `application/service/customerService.ts` → `register` |
| Domain | `domain/customer/customer.ts` → `validateRegistration`, `normalizeEmail` |
| Repository | `infrastructure/repository/customerRepository.ts` → `findByUsername`, `save` |

**Chạy thế nào**
1. Trang gửi `POST /api/auth/register` với `{ fullName, email, password, confirmPassword }`.
2. `validateRegistration` kiểm tra theo thứ tự: đủ trường ("All fields are required."), email hợp lệ ("Invalid email format."),
   mật khẩu từ 6 ký tự, mật khẩu khớp xác nhận.
3. Email được chuẩn hoá (chữ thường, bỏ khoảng trắng hai đầu). Nếu đã có người dùng email này ném 409 "Email already exists.".
4. Mật khẩu được băm bằng `bcrypt` (cost 10), lưu bằng `customerRepository.save`.
5. Service ký JWT (7 ngày) từ `{id, fullName, email}`. Controller trả 201 và đặt cookie `shopviet_token`.
6. Trang gộp giỏ khách (nếu có) vào giỏ server, báo thành công và về trang chủ.

| | Nội dung |
|---|---|
| **Input** | JSON `{ fullName, email, password, confirmPassword }` |
| **Output** | 201 `{ message: "Registration successful.", user: {id, fullName, email} }` + cookie đăng nhập |
| **Lỗi** | 400 dữ liệu sai; 409 email đã tồn tại |

### 11.3 Đăng nhập, đăng xuất, kiểm tra phiên

**Kích hoạt:** nút Login ở `/login` (ô email và mật khẩu mặc định đã điền tài khoản demo); nút Logout ở Navbar; Navbar tự hỏi "tôi là ai" khi tải trang.

| Việc | File |
|---|---|
| Trang | `app/login/page.tsx`, `components/Navbar.tsx` |
| Cổng API | `app/api/auth/login/route.ts`, `logout/route.ts`, `me/route.ts` → `customerController.login/logout/me` |
| Service | `customerService.login`, `resolveSession`, `getProfile`, `signToken`, `verifyToken` |
| Domain | `Customer.login(email, password)` trong `domain/customer/customer.ts` |
| Repository | `customerRepository.findByUsername`, `findProfileById` |

**Đăng nhập, chạy thế nào**
1. `POST /api/auth/login` với `{ email, password }`. Thiếu một trong hai ném 400 "Email and password are required.".
2. `customerService.login` chuẩn hoá email, tìm khách bằng `customerRepository.findByUsername` (user name chính là email).
3. Gọi `customer.login(email, password)`: so email, rồi `bcrypt.compare` với mã băm đã lưu. Sai hoặc không có khách đều ném **cùng một** thông báo
   401 "Invalid email or password." (không lộ email nào tồn tại).
4. Thành công: ký JWT, đặt cookie, trả `{ message: "Login successful.", user }`.
5. Trang gộp giỏ khách vào giỏ server (mỗi dòng gọi `POST /api/cart`), xoá `guest_cart`, phát `auth-updated` và `cart-updated`,
   rồi chuyển tới trang `redirect` (mặc định `/`).

**Phiên:** `GET /api/auth/me` → `customerController.me` → `getSessionUser()` (đọc cookie, xác minh chữ ký JWT, kiểm tra người dùng còn trong CSDL)
rồi `getProfile`. Trả `{ user: {...} }` hoặc `{ user: null }` (không phải lỗi). **Đăng xuất:** `POST /api/auth/logout` xoá cookie (`maxAge: 0`).

| | Nội dung |
|---|---|
| **Input** | login: `{ email, password }`; me, logout: không có (dùng cookie) |
| **Output** | `{ message, user }` + cookie; `{ user }`; `{ message: "Logged out." }` |
| **Lỗi** | 400 thiếu trường; 401 sai email hoặc mật khẩu |

### 11.4 Giỏ hàng

**Kích hoạt:** nút Add to Cart (thẻ sản phẩm, trang chi tiết, trang so sánh, bộ setup, chatbot), trang `/cart` (tăng giảm, xoá, xoá hết).

| Việc | File |
|---|---|
| Trang và nút | `app/cart/page.tsx`, `components/ProductCard.tsx`, `app/products/[id]/page.tsx`, `lib/clientCart.ts` |
| Cổng API | `app/api/cart/route.ts` (GET, POST, DELETE), `app/api/cart/[productId]/route.ts` (PUT, DELETE) |
| Controller | `cartController.ts`: `viewCart`, `addToCart`, `updateQuantity`, `removeItem`, `clearCart` |
| Service | `cartService.ts`: `getCartId`, `getOrCreateCartId`, `getCart`, `addItem`, `updateQuantity`, `removeItem`, `clear` |
| Domain | `domain/cart/cart.ts`: `Cart.addItem/removeItem/updateQuantity/calculateTotal/clear`, `CartItem.calculateSubTotal`; `domain/product/product.ts`: `isInStock`, `hasEnoughStock` |
| Repository | `cartRepository.ts`: `findById`, `findByUserId`, `findOrCreateByUserId`, `save` |

**Thêm vào giỏ (đã đăng nhập), chạy thế nào**
1. Trang gửi `POST /api/cart` với `{ productId, quantity }`.
2. `cartController.addToCart` đòi đăng nhập (401 "Login required."), lấy hoặc tạo giỏ của khách (`getOrCreateCartId`), gọi `cartService.addItem(cartId, productId, quantity)`.
3. Service đổi `productId`, `quantity` thành số (số lượng tối thiểu 1; `productId` rỗng ném 400 "Invalid product."), lấy sản phẩm (404 "Product not found.").
4. Service nạp giỏ (`cartRepository.findById`) và gọi **`cart.addItem(product, quantity)`**: hết hàng thì ném "This product is out of stock.";
   nếu (số lượng đang có trong giỏ + số thêm) vượt tồn kho thì ném "Only N item(s) available in stock."; còn lại thì gộp vào dòng sẵn có hoặc thêm dòng mới.
5. `cartRepository.save(cart)` lưu trong một transaction: xoá dòng bị bỏ, cập nhật số lượng dòng đổi, tạo dòng mới.
6. Service nạp lại giỏ rồi trả DTO. Controller trả `{ message: "Product added to cart successfully.", cart }`.
7. Trang phát `cart-updated`, Navbar cập nhật số trên biểu tượng giỏ.

**Khách chưa đăng nhập:** bước 2 trả 401, nút bắt mã 401 và tự ghi vào `localStorage["guest_cart"]` (gộp số lượng, giới hạn theo tồn kho).
Trang `/cart` của khách đọc `guest_cart` rồi gọi `GET /api/products/{id}` cho từng dòng để lấy tên, giá, ảnh.
Khách không thanh toán được: nút Proceed to Checkout chuyển tới `/login?redirect=/checkout`.

**Sửa số lượng:** `PUT /api/cart/{productId}` với `{ quantity }` → `cartService.updateQuantity`: số lượng không hợp lệ ném 400 "Invalid quantity.";
`cart.updateQuantity` ném 404 "Item not in cart." hoặc "Only N item(s) available in stock.". **Xoá một món:** `DELETE /api/cart/{productId}`
(`cart.removeItem`, không báo lỗi nếu món không có). **Xoá hết:** `DELETE /api/cart` (`cart.clear`, trang hỏi xác nhận trước).

| | Nội dung |
|---|---|
| **Input** | thêm: `{ productId, quantity }`; sửa: `{ quantity }` kèm `productId` trên đường dẫn; các việc khác không có thân |
| **Output** | xem: `{ cart: { items: [{id, productId, quantity, product, subtotal}], totalCount, subtotal } }`; thêm: `{ message, cart }`; sửa, xoá: `{ message }` |
| **Lỗi** | 401 chưa đăng nhập; 400 sản phẩm hoặc số lượng sai, hết hàng, vượt tồn kho; 404 không có sản phẩm hoặc món không có trong giỏ |

### 11.5 Thanh toán (checkout) và đặt đơn

**Kích hoạt:** Proceed to Checkout ở `/cart`, rồi 3 bước ở `/checkout`.

| Việc | File |
|---|---|
| Trang | `app/checkout/page.tsx`, `components/ShippingForm.tsx`, `DeliverySelector.tsx`, `PaymentSelector.tsx` |
| Trang thành công | `app/checkout/success/page.tsx` |
| Cổng API | `app/api/checkout/shipping/route.ts`, `app/api/checkout/payment/route.ts`, `app/api/orders/route.ts` (POST) |
| Controller | `checkoutController.ts`: `enterShipping`, `pay`, `checkout` |
| Service | `checkoutService.ts`: `enterShipping`, `pay`, `checkout` (+ hàm nội bộ `validateCartItems`) |
| Domain | `domain/order/order.ts`: `Shipping`, `Payment`/`IDCard`/`Ewallet`, `Order.createOrder`, `OrderItem`, `calcDeliveryFee`, `generateOrderCode`; `domain/order/delivery.ts`: `isDeliveryMethod` |
| Repository | `cartRepository.findById`, `orderRepository.lastId`, `orderRepository.save` |

**Khi vào `/checkout`:** trang gọi `GET /api/auth/me` (chưa đăng nhập thì chuyển tới `/login?redirect=/checkout`) và `GET /api/cart`
(giỏ rỗng thì báo "Your cart is empty." và chuyển về `/cart`). Cột bên phải luôn hiện tóm tắt đơn: tạm tính, phí giao theo cách giao đang chọn, tổng.

**Bước 1: thông tin giao hàng và cách giao**
1. Khách điền họ tên, số điện thoại, địa chỉ, tỉnh, quận, phường (ghi chú tuỳ chọn) và chọn cách giao: giao thường, drone, xe tự lái.
   Phí: giao thường miễn phí từ 500.000đ (dưới đó 30.000đ); drone 99.000đ; xe tự lái 59.000đ (`calcDeliveryFee`).
2. Bấm "Continue to Payment": trang kiểm tra nhanh phía trình duyệt rồi gọi `POST /api/checkout/shipping` với `{ shipping }`.
3. `checkoutController.enterShipping` đòi đăng nhập, gọi `checkoutService.enterShipping`, tạo `Shipping.from(...)` rồi `validate()`:
   thiếu trường ném 400 "Please complete shipping information."; số điện thoại sai (9 đến 15 ký tự gồm số, `+`, khoảng trắng) ném 400 "Invalid phone number.".
4. Trả `{ message: "Shipping information is valid.", status: "Ready" }` thì sang bước 2.

**Bước 2: phương thức thanh toán**
1. Thẻ: tên chủ thẻ, số thẻ, hạn, CVV. Ví điện tử: chọn MoMo, ZaloPay hoặc VNPay và tick xác nhận đã thanh toán trong ví.
2. Bấm "Review Order": trang kiểm tra thẻ ở trình duyệt, rồi gọi `POST /api/checkout/payment` với `{ paymentMethod, card, walletConfirmed }`.
3. `checkoutService.pay` dựng `Payment.of(method, ...)` (thẻ → `IDCard`, ví → `Ewallet`; phương thức lạ ném 400 "Please choose a payment method.") rồi `validate()`:
   thẻ kiểm tra tên, 16 chữ số, hạn `MM/YY` chưa hết, CVV 3 đến 4 số; ví kiểm tra đã tick xác nhận ("Please confirm e-wallet payment.").
4. Trả `{ message: "Payment information is valid.", method, status: "Pending" }`. Chưa trừ tiền và **không lưu** số thẻ.

**Bước 3: xác nhận và đặt đơn** (nút "Pay ... & Place Order")
1. Trang gửi `POST /api/orders` với `{ shipping, paymentMethod, deliveryMethod, card, walletConfirmed }`.
2. `checkoutController.checkout` đòi đăng nhập, lấy mã giỏ của khách, gọi `checkoutService.checkout(cartID, userId, input)`.
3. Các bước trong `checkout` (khớp Hình 2):
   1. `enterShipping(...)` và `pay(...)` kiểm tra lại phía server; cách giao phải thuộc `STANDARD | DRONE | ROBOT_CAR` (nếu không, 400 "Please choose a delivery method.").
   2. `cartRepository.findById(cartID)`; không có giỏ ném 400 "Your cart is empty."; giỏ của người khác ném 403.
   3. `validateCartItems(cart)`: giỏ phải có hàng và mọi dòng đủ tồn kho (nếu không, 400 "<Tên>: only N item(s) available.").
   4. `Order.createOrder(cart, {...})`: tạo `Order` (mã `ORD-năm-số thứ tự 5 chữ số`, trạng thái "Order Placed", trạng thái thanh toán "PENDING"),
      mỗi dòng giỏ thành một `OrderItem` (giá chép tại thời điểm này), rồi `calculateTotal()` = tạm tính + phí giao.
   5. `payment.pay(tổng)`: mô phỏng thanh toán thành công, đặt trạng thái "PAID"; gán `order.paymentStatus`.
   6. `orderRepository.save(order)`: **một transaction** tạo đơn và các dòng, trừ tồn kho và cộng số đã bán của từng sản phẩm, xoá các dòng của giỏ.
   7. `cart.clear()` rồi trả đơn.
4. Controller trả 201 `{ message: "Order placed successfully.", order }`. Trang phát `cart-updated`, lưu `last_order_code` rồi chuyển tới `/checkout/success?code=...`.
5. Trang thành công gọi `GET /api/orders/by-code/{code}` để hiện mã đơn, số món, phương thức thanh toán, tổng tiền và nút "Track Order".

| | Nội dung |
|---|---|
| **Input** | bước 1: `{ shipping }`; bước 2: `{ paymentMethod, card?, walletConfirmed? }`; bước 3: `{ shipping, paymentMethod, deliveryMethod, card?, walletConfirmed? }` |
| **Output** | 201 `{ message, order }` (đơn đầy đủ: mã, tổng, phí giao, cách giao, địa chỉ, các dòng, trạng thái) |
| **Lỗi** | 401 chưa đăng nhập; 400 thông tin sai, giỏ rỗng, hết hàng; 403 giỏ không phải của khách |
| **Lưu ý** | đơn chỉ được tạo **sau khi** mọi kiểm tra đạt, nên thẻ sai không để lại đơn dở dang hay trừ kho |

### 11.6 Đơn hàng của tôi, chi tiết đơn, theo dõi bằng mã, chọn đơn để theo dõi

**Kích hoạt:** menu My Orders, mở một đơn, menu Track Order.

| Việc | File |
|---|---|
| Trang | `app/orders/page.tsx`, `app/orders/[id]/page.tsx`, `app/track-order/page.tsx`, `components/OrderDetailView.tsx`, `OrderStatusTimeline.tsx` |
| Cổng API | `app/api/orders/route.ts` (GET), `app/api/orders/[id]/route.ts`, `app/api/orders/by-code/[code]/route.ts` |
| Controller | `orderController.ts`: `listMine`, `detail`, `trackOrder` |
| Service | `orderService.ts`: `listMine`, `getForOwner`, `getStatus` (đều gắn thêm thông tin theo dõi giao hàng) |
| Repository | `orderRepository.ts`: `findByUser`, `findById`, `findByCode` |

**Chạy thế nào**
1. **Đơn của tôi:** `GET /api/orders` (đăng nhập) trả các đơn của khách, mới nhất trước. Chưa đăng nhập: trang chuyển tới `/login?redirect=/orders`.
2. **Chi tiết đơn:** `GET /api/orders/{id}`: `id` sai ném 400; không có đơn ném 404 "Order not found."; đơn của người khác ném 403
   "You do not have permission to view this order.". Trang `OrderDetailView` hiện mã, thời điểm đặt, trạng thái 6 bước, sản phẩm, tổng tiền, địa chỉ, thanh toán.
3. **Theo dõi bằng mã (công khai, không cần đăng nhập):** `GET /api/orders/by-code/{code}`: service giải mã, cắt khoảng trắng, đổi chữ hoa rồi `findByCode`;
   không có thì 404 "Order not found.". Trang `/track-order` hiện lỗi "Order not found." hoặc "Please enter an order ID." (ô trống).
4. **Chọn đơn khi có nhiều đơn:** khách đã đăng nhập thấy hàng thẻ **"Your orders (N)"** ở `/track-order` (mã đơn, trạng thái, cách giao, giờ đặt).
   Bấm thẻ nào thì tra đơn đó. Vào trang không kèm mã thì tự mở đơn mới nhất. Danh sách tự làm mới mỗi 5 giây khi còn đơn drone hoặc xe đang chạy.
5. Cả ba luồng đi qua `withTracking(order)` trong `orderService.ts`: với đơn drone hoặc xe tự lái, nó thêm `tracking` và **ghi đè** `orderStatus` bằng trạng thái tính theo thời gian (xem 11.7).
   Đơn giao thường giữ trạng thái đã lưu ("Order Placed").

| | Nội dung |
|---|---|
| **Input** | `id` hoặc `code` trên đường dẫn; danh sách đơn không có thân |
| **Output** | `{ orders: Order[] }` hoặc `{ order }`, trong đó mỗi đơn có `tracking` (hoặc `null`) |
| **Lỗi** | 401 (đơn của tôi, chi tiết) chưa đăng nhập; 400 id sai; 403 không phải chủ đơn; 404 không có đơn |

### 11.7 Theo dõi giao hàng bằng drone và xe tự lái (có bản đồ, mô phỏng)

**Kích hoạt:** mở chi tiết đơn hoặc `/track-order` của đơn có cách giao DRONE hoặc ROBOT_CAR. Không có xe thật: tiến trình **tính theo thời gian** kể từ lúc đặt.

| Việc | File |
|---|---|
| Quy tắc và dữ liệu | `domain/order/delivery.ts`: `computeTracking`, `DELIVERY_INFO`, `isDeliveryMethod` |
| Gắn vào đơn | `application/service/orderService.ts`: `withTracking` |
| Khung hiển thị | `components/OrderDetailView.tsx` (cập nhật 3 giây một lần), `DeliveryTracker.tsx` |
| Bản đồ | `components/DeliveryMap.tsx` (Leaflet + OpenStreetMap), `lib/geo.ts` |

**Chạy thế nào**
1. `computeTracking(order, bây giờ)` tính số giây đã trôi qua từ lúc đặt. Bảng mốc (giây):

   | Trạng thái | Drone | Xe tự lái |
   |---|---|---|
   | Order Placed | 0 | 0 |
   | Confirmed | 8 | 10 |
   | Processing | 25 | 30 |
   | Shipped (xuất phát) | 50 | 60 |
   | Out for Delivery | 130 | 200 |
   | Delivered | 170 | 260 |

   Trạng thái hiện tại là mốc gần nhất đã qua. `progress` (0 đến 1) chỉ chạy từ Shipped đến Delivered.
2. Kết quả `tracking` gồm: `method`, `vehicleId` ("Drone KD-xx" hoặc "RoboCar EV-xx"), `status`, `delivered`, `progress`, `etaSeconds`,
   `events[]` (mỗi mốc có tiêu đề, địa điểm, giờ, đã qua hay chưa), `transit {startMs, endMs}`, `serverNowMs`.
3. Trình duyệt hỏi lại `GET /api/orders/by-code/{mã}` mỗi 3 giây cho đến khi giao xong. Giữa hai lần hỏi, `DeliveryTracker` tự tính vị trí mới mỗi 0,5 giây từ `transit` và độ lệch đồng hồ với server.
4. `DeliveryMap` (chỉ chạy ở trình duyệt):
   1. Tìm điểm đến: địa chỉ có chữ "PTIT" thì dùng toạ độ trường PTIT; còn lại hỏi Nominatim (OpenStreetMap); không tìm thấy thì dùng điểm cố định gần trạm.
   2. Điểm xuất phát là trạm giả lập gần AEON Mall Hà Đông (`Kirk Drone Hub` hoặc `Kirk Robo Garage`).
   3. Tuyến: drone bay đường cong; xe tự lái lấy đường phố thật từ dịch vụ OSRM (lỗi thì dùng đường thẳng).
   4. Vẽ tuyến nét đứt, phần đã đi nét liền đỏ, biểu tượng drone hoặc xe di chuyển theo `progress`; các ô tốc độ, độ cao, pin, quãng đường còn lại tính từ `progress`.
5. Cột lịch sử sự kiện kiểu DHL hiện các mốc, mới nhất ở trên.

| | Nội dung |
|---|---|
| **Input** | đơn (cách giao, giờ đặt, địa chỉ) và giờ hiện tại |
| **Output** | đối tượng `tracking` (mục 2 ở trên); bản đồ và các ô thông số trên trang |
| **Cần mạng** | bản đồ, tìm địa chỉ, tuyến xe; mất mạng thì tuyến thành đường thẳng và điểm đến thành điểm cố định |

---

## 12. Các luồng AI và tính năng thêm

Nguyên tắc chung của mọi luồng AI trong web: **code quyết định, AI chỉ viết lời hoặc đề xuất, code kiểm tra lại**.
Sản phẩm, giá, tồn kho luôn lấy từ CSDL, nên AI không thể bịa ra sản phẩm. Không có `GROQ_API_KEY` thì mọi luồng (trừ tìm bằng ảnh và giọng nói) vẫn chạy bằng quy tắc dự phòng.
Hai file gọi AI dùng chung: `infrastructure/llm/groqClient.ts` (hàm `askLLM(system, user, maxTokens, temperature)`, trả `null` nếu không có khoá hoặc lỗi)
và riêng cho chatbot là `chatService.ts` (gọi Groq trực tiếp).

### 12.1 Gợi ý cách giao hàng (AI chọn drone, xe tự lái hay giao thường)

**Kích hoạt:** nút "Suggest delivery" ở bước 1 của checkout (cần đăng nhập và giỏ có hàng).

| Việc | File |
|---|---|
| Giao diện | `components/DeliverySelector.tsx` |
| Cổng API | `app/api/delivery-advice/route.ts` → `deliveryAdvisorController.advise` |
| Controller | `presentation/controller/deliveryAdvisorController.ts` |
| Service | `application/service/deliveryAdvisorService.ts` → `advise(userId, input)` |
| Domain (quy tắc) | `domain/order/deliveryAdvice.ts`: `adviseMethods`, `pickBest`, `totalWeightKg`, `unitWeightKg`, `isFragile`, `LIMITS` |
| Hạ tầng | `infrastructure/weather/weatherClient.ts` (Open-Meteo), `infrastructure/llm/groqClient.ts`, `repository/cartRepository.ts` |

**Chạy thế nào**
1. Khách chọn ưu tiên: **Fastest** (`fast`), **Cheapest** (`cheap`) hoặc **Eco-friendly** (`eco`). Trang gửi `POST /api/delivery-advice` với `{ priority, address }` (địa chỉ ghép từ ô địa chỉ, phường, quận, tỉnh).
2. Controller đòi đăng nhập (401 "Please login before checkout."). Service lấy giỏ của khách (`findByUserId`); rỗng ném 400 "Your cart is empty.".
3. Service gom các món (tên, danh mục, giá, số lượng), tính tạm tính (`cart.calculateTotal()`).
4. **Thời tiết thật:** `currentWeather()` gọi Open-Meteo cho một điểm cố định ở Hà Đông (toạ độ 20,98 và 105,79), chờ tối đa 3 giây, lấy mã thời tiết, lượng mưa (mm), gió (km/h), nhiệt độ.
   Lỗi thì dùng "Trời quang (mô phỏng)", mưa 0, gió 12, và gắn nhãn `simulated`.
5. **Khoảng cách ước lượng:** địa chỉ có chữ "PTIT" thì 5,4 km; còn lại 8 km (server không tra địa chỉ).
6. `adviseMethods` chấm điểm từng cách giao:
   - Cân nặng ước lượng theo tên và danh mục (laptop 2,4 kg, điện thoại 0,5 kg, màn hình 7 kg, ghế 18 kg, drone 1,8 kg...), nhân số lượng.
   - **Drone** bị loại nếu: nặng quá 2,5 kg, xa quá 10 km, mưa trên 0,2 mm, gió trên 25 km/h. Trừ điểm nếu đơn trên 30 triệu (thả hàng không có người ký nhận) hoặc hàng dễ vỡ.
   - **Xe tự lái** bị loại nếu nặng quá 20 kg hoặc xa quá 15 km; trừ điểm nếu mưa trên 8 mm.
   - **Giao thường** luôn dùng được.
   - Điểm = (trọng số tốc độ × tốc độ + trọng số giá × (1 − phí/150.000) + trọng số môi trường × mức thân thiện) × 100 × (1 − điểm trừ).
     Trọng số theo ưu tiên: `fast` (3, 1, 0,5), `cheap` (0,5, 3, 0,5), `eco` (0,5, 1, 3). Cách bị loại có điểm 0.
7. `pickBest` chọn cách có điểm cao nhất trong số cách dùng được.
8. Lời giải thích: `askLLM` (tối đa 350 token) viết 2 đến 3 câu tiếng Việt dựa **chỉ** trên dữ kiện đã tính; không có khoá thì dùng câu quy tắc.
9. Trang đánh dấu cách được chọn bằng nhãn "AI pick", làm mờ cách không dùng được kèm lý do, và có nút "Use ..." để áp dụng.

| | Nội dung |
|---|---|
| **Input** | `{ priority: "fast" \| "cheap" \| "eco", address: string }` + giỏ hàng của khách (trên server) |
| **Output** | `{ advice: { recommended, options[{method, available, fee, score, reasons[], warnings[]}], weather{source, description, rainMm, windKmh, tempC}, weightKg, distanceKm, priority, explanation, usedAI } }` |
| **Lỗi** | 401 chưa đăng nhập; 400 giỏ rỗng |
| **Giới hạn** | thời tiết lấy một điểm cố định, chỉ là hiện tại; khoảng cách và cân nặng là ước lượng |

### 12.2 So sánh sản phẩm bằng AI

**Kích hoạt:** tick "Compare" ở 2 đến 3 thẻ sản phẩm, rồi nút "AI compare" ở khay nổi góc trái dưới.

| Việc | File |
|---|---|
| Chọn sản phẩm | `components/ProductCard.tsx` (ô tick), `components/CompareBar.tsx` (khay), `lib/clientCart.ts` (`readCompare`, `writeCompare`, lưu `compare_ids`) |
| Trang | `app/compare/page.tsx` (đọc `?ids=1,2,3`) |
| Cổng API | `app/api/compare/route.ts` → `compareController.compare` |
| Service | `application/service/compareService.ts` → `compare(ids, need)` |
| Repository | `productRepository.findById` |

**Chạy thế nào**
1. Khay lưu tối đa 3 mã sản phẩm trong `localStorage["compare_ids"]`; có từ 2 mã mới hiện nút "AI compare" (chuyển tới `/compare?ids=...`).
2. Trang gọi `POST /api/compare` với `{ ids, need }` (`need` là nhu cầu khách nhập, ví dụ "chơi game", tối đa 200 ký tự). Không cần đăng nhập.
3. Service loại mã trùng và mã không hợp lệ; còn dưới 2 hoặc trên 3 sản phẩm ném 400 "Please choose 2 to 3 products to compare."; thiếu sản phẩm ném 404.
4. Service tự tính bốn danh hiệu: **rẻ nhất**, **đánh giá cao nhất**, **bán chạy nhất**, **đáng tiền nhất**
   (điểm = 0,4 × đánh giá/5 + 0,3 × (1 − giá/giá cao nhất) + 0,3 × số bán/số bán cao nhất).
5. Lời kết luận: `askLLM` (tối đa 500 token) nhận tên, giá, đánh giá, số bán, tồn kho, mô tả (300 ký tự đầu) và nhu cầu, viết tối đa 5 câu;
   không có khoá thì ghép câu từ bốn danh hiệu.
6. Trang vẽ bảng so sánh, ô tốt nhất tô xanh, hiện huy hiệu danh hiệu và nút Add to Cart cho từng cột.

| | Nội dung |
|---|---|
| **Input** | `{ ids: number[2..3], need?: string }` |
| **Output** | `{ comparison: { products[{id,name,image,category,price,rating,sold,stock,description}], best{cheapest, topRated, bestSeller, bestValue}, verdict, usedAI } }` |
| **Lỗi** | 400 số lượng sản phẩm sai; 404 không có sản phẩm |

### 12.3 Setup theo ngân sách (AI thiết kế, code kiểm tra)

**Kích hoạt:** menu "AI Setup" (`/bundle`): gõ "setup gaming 45 triệu", hoặc chọn mục đích và ngân sách.

| Việc | File |
|---|---|
| Trang | `app/bundle/page.tsx` (tab "Set 1, 2, 3", nút thêm cả bộ vào giỏ) |
| Cổng API | `app/api/bundle/route.ts` → `bundleController.build` |
| Service | `application/service/bundleService.ts` → `build`, `parseProposal`, `proposeWithLLM` |
| Domain (quy tắc) | `domain/product/bundle.ts`: `BUNDLES` (khuôn từng mục đích), `detectUsage`, `planVariant`, `planBundles`, `checkProposedSet` |
| Hạ tầng | `groqClient.ts` (`askLLM`), `productRepository.search`, `recommendationService.parseShoppingIntent` (đọc ngân sách từ câu chữ) |

**Chạy thế nào**
1. Trang gửi `POST /api/bundle` với `{ text, usage?, budget? }` (ngân sách trong ô nhập tính bằng triệu, trang nhân 1.000.000). Không cần đăng nhập.
2. Service xác định **ngân sách**: lấy `budget` nếu có, nếu không đọc từ câu chữ ("30 triệu"). Dưới 500.000đ hoặc không đọc được ném 400 "Vui lòng nhập ngân sách, ví dụ: 30 triệu.".
3. Xác định **mục đích** (`gaming`, `study`, `creator`, `mobile`, `entertainment`) từ `usage` hoặc từ từ khoá trong câu; không biết ném 400.
4. Tải toàn bộ sản phẩm (tối đa 500).
5. **Nhánh AI** (khi có khoá): gửi cho Groq danh sách sản phẩm còn hàng (`id|tên|danh mục|giá|đánh giá`), nhu cầu và ngân sách, yêu cầu trả **một JSON**
   gồm tối đa 3 bộ khác hướng. `parseProposal` đọc JSON; mỗi bộ đi qua **`checkProposedSet`** (domain), bộ nào vi phạm bị loại:
   mọi sản phẩm phải có thật và còn hàng, không lặp món, tổng không vượt ngân sách và dùng ít nhất một nửa ngân sách,
   và PC tự lắp phải đủ CPU, mainboard, card đồ họa, RAM, nguồn, case (có một trong các linh kiện này thì phải đủ cả sáu).
6. **Nhánh quy tắc** (luôn chạy để bù chỗ trống tới tối đa 3 bộ): với mỗi khuôn của mục đích đó (ví dụ gaming có "laptop gaming", "PC dựng sẵn", "PC tự lắp"),
   `planVariant` duyệt các tổ hợp sản phẩm thật (mỗi vị trí giữ 3 ứng viên tốt nhất và 1 ứng viên rẻ nhất), chọn tổ hợp có điểm cao nhất trong ngân sách,
   không lặp món; bỏ qua vị trí chính bị phạt rất nặng. Nếu chưa đủ 3 bộ, thêm một bản "tiết kiệm" khoảng 70% ngân sách.
7. Không bộ nào mua nổi thì ném 400 "Ngân sách ... chưa đủ cho bộ ... Cần tối thiểu khoảng ...".
8. Trang hiện từng bộ (nhãn "AI" hoặc "template"), lý do (nếu AI viết), tổng tiền và tiền dư; nút "Add Set N to cart" thêm từng món qua `POST /api/cart`.

| | Nội dung |
|---|---|
| **Input** | `{ text?: string (≤300 ký tự), usage?: "gaming" \| "study" \| "creator" \| "mobile" \| "entertainment", budget?: number (VND) }` |
| **Output** | `{ bundle: { usage, usageLabel, budget, options[{id, label, source: "ai" \| "rules", why, total, remaining, items[{slot, core, reason, product}], notes[]}], summary, usedAI } }` |
| **Lỗi** | 400 thiếu ngân sách, thiếu mục đích, ngân sách quá thấp |
| **Vì sao an toàn** | AI chỉ đề xuất mã sản phẩm; mọi mã đều bị đối chiếu với CSDL, nên không thể xuất hiện món không có hay hết hàng |

### 12.4 Chatbot tư vấn (hỏi sản phẩm, tra đơn, thêm vào giỏ bằng lời)

**Kích hoạt:** biểu tượng chat góc phải dưới (bong bóng "I'm your shopping advisor bot"), gõ tiếng Việt hoặc tiếng Anh.

| Việc | File |
|---|---|
| Giao diện | `components/ChatWidget.tsx` (lịch sử lưu ở `kirk_chat_history`, thẻ sản phẩm, nút Xác nhận) |
| Cổng API | `app/api/chat/route.ts` → `chatController.chat` |
| Controller | `presentation/controller/chatController.ts` (đọc JSON, lấy người dùng nếu có đăng nhập; đăng nhập không bắt buộc) |
| Service chính | `application/service/chatService.ts` → `reply(messages, {userId, proposal, guestCart})` |
| Gợi ý mua sắm | `application/service/recommendationService.ts` → `isRecommendationRequest`, `recommend`, `formatForLLM`, `formatFallbackReply` |
| Thêm giỏ bằng lời | `application/service/cartAssistantService.ts` → `detectCartIntent`, `handle`; dùng `cartService` |
| Hạ tầng | `productRepository`, `orderRepository`, gọi Groq trực tiếp trong `chatService.ts` |

**Trình duyệt gửi gì:** `POST /api/chat` với `{ messages: [{role, content}...], proposal, guestCart }`:
lịch sử hội thoại, đề xuất thêm giỏ đang chờ xác nhận (nếu có) và giỏ của khách chưa đăng nhập.

**`chatService.reply` chạy theo thứ tự (nhánh nào khớp trước thì trả về)**
1. **Làm sạch** (`sanitize`): chỉ giữ 8 tin nhắn gần nhất, mỗi tin tối đa 600 ký tự; tin cuối phải là của khách, nếu không ném 400 "Bad request.".
2. **Thêm giỏ bằng lời** (`detectCartIntent` trên tin cuối):
   - `show` ("giỏ hàng của tôi có gì?"): liệt kê giỏ. Khách đăng nhập: đọc giỏ trên server (`cartService.getCart`); khách chưa đăng nhập: dùng `guestCart` do trình duyệt gửi.
   - `add` ("thêm iPhone 15 vào giỏ"): đọc số lượng (chữ hoặc số), tách tên sản phẩm; từ tham chiếu như "cái đó", "món rẻ hơn bạn vừa gợi ý" thì chạy lại lần gợi ý trước để biết món nào;
     còn lại tìm trong CSDL (tên 3 điểm, danh mục 1, mô tả 0,5, số hiệu như "s24" cộng 8, trùng cả tên cộng 10; một từ đặc trưng không khớp gì thì loại cả câu).
     Không thấy: báo không có. Nhiều món gần giống (điểm thứ hai ≥ 85% điểm thứ nhất): hỏi lại kèm tối đa 3 thẻ. Hết hàng: báo và gợi ý món cùng loại.
     Còn hàng: **không thêm ngay**, trả `cartAction: propose_add` kèm một `proposalId` (UUID) và số lượng đã giới hạn theo tồn kho; giao diện hiện nút "Xác nhận".
   - `confirm` ("đồng ý", bấm Xác nhận): **chỉ chạy khi có `proposal` đang chờ**. Server kiểm tra lại sản phẩm tồn tại và còn đủ hàng;
     khách đăng nhập: gọi `cartService.addItem` (cùng quy tắc với trang giỏ hàng); khách chưa đăng nhập: server chỉ kiểm tra rồi trả `added` với `guest: true`,
     và trình duyệt tự gộp vào `localStorage["guest_cart"]`. Trả `cartAction: added` kèm số món và tổng giỏ.
   Nếu nhánh này trả kết quả thì dừng ở đây.
3. **Gợi ý mua sắm:** nếu tin cuối là lời nhờ tư vấn mua ("laptop dưới 20 triệu chơi game") và không nhắc mã đơn,
   `recommend(text)` hiểu nhu cầu (nhóm hàng, mục đích, ngân sách, kiểu sắp xếp) rồi chọn 2 đến 5 sản phẩm thật có lý do. Nếu không có món nào đúng ngân sách thì thử lần lượt:
   nới ngân sách 50%, bỏ ngân sách, bỏ nhóm hàng, cuối cùng lấy món bán chạy; mỗi lần nới đều ghi chú để báo thật với khách.
4. **Tra cứu thông thường** (`buildContext`): nếu tin nhắn có mã `ORD-xxxx-xxxxx` thì tra đơn công khai (trạng thái, thanh toán, tổng, các món; **không** có địa chỉ);
   rồi tìm sản phẩm: đổi từ tiếng Việt sang từ khoá tiếng Anh (bảng từ đồng nghĩa), bỏ từ thừa, đọc ràng buộc giá ("dưới 20 triệu", "rẻ nhất"),
   tìm tối đa 30 sản phẩm rồi chấm điểm theo độ hiếm của từ (từ ít sản phẩm có thì nặng điểm), giữ 6 món. Câu hỏi nối tiếp ngắn dùng lại ngữ cảnh tin trước.
5. **Có khoá Groq:** gửi `SYSTEM_PROMPT` (luật: trả lời bằng ngôn ngữ khách dùng, chỉ nói về shop, chỉ dùng dữ liệu cửa hàng được gửi kèm, không bịa, nói rõ hết hàng)
   cùng lịch sử; tin cuối được nối thêm khối `[DỮ LIỆU CỬA HÀNG]` (và `[HƯỚNG DẪN]` nếu là gợi ý). Tham số: nhiệt độ 0,1, tối đa 1200 token.
   Lỗi 429 báo "quá tải, thử lại sau"; lỗi khác báo "đang gặp sự cố".
   **Không có khoá:** nhánh gợi ý dùng câu có sẵn (`formatFallbackReply`), nhánh tra cứu báo "Chatbot AI chưa có API key..." kèm thẻ sản phẩm.
6. **Thẻ sản phẩm kèm câu trả lời:** nhánh gợi ý trả đúng các món đã chọn; nhánh tra cứu trả các sản phẩm mà câu trả lời nhắc đến (so khớp tên, tối đa 6).

| | Nội dung |
|---|---|
| **Input** | `{ messages, proposal?, guestCart? }`; tuỳ chọn có cookie đăng nhập |
| **Output** | `{ reply: string, products: [...], recommendations?: [{..., reason}], cartAction?: propose_add \| added \| show_cart }` |
| **Lỗi** | 400 "Bad request." (JSON hoặc tin nhắn sai); lỗi khác trả câu xin lỗi trong `reply` |
| **Vì sao an toàn** | AI không ghi vào giỏ; mọi thao tác giỏ đi qua `CartService`, và thêm giỏ luôn cần khách xác nhận |

### 12.5 Tìm bằng hình ảnh

**Kích hoạt:** biểu tượng máy ảnh cạnh ô tìm kiếm; chọn ảnh JPG, PNG hoặc WebP.

| Việc | File |
|---|---|
| Nút chọn ảnh | `components/SearchTools.tsx`, thu nhỏ ảnh ở `lib/clientImage.ts` |
| Trang kết quả | `app/search-image/page.tsx` |
| Cổng API | `app/api/products/search-image/route.ts` → `productController.searchByImage` |
| Service | `application/service/productService.ts` → `searchByImage(image, describe?)` |
| Domain | `domain/product/imageMatch.ts` → `imageMatchScore`, `rankByImage` |
| Hạ tầng | `infrastructure/llm/groqVision.ts` → `describeProductImage`, `productRepository.search` |

**Chạy thế nào**
1. Trình duyệt thu nhỏ ảnh về cạnh dài tối đa 512 px, đổi thành JPEG chất lượng 0,8 (nền trong suốt thành nền trắng), lưu vào `sessionStorage["image_search_photo"]` và chuyển tới `/search-image`.
2. Trang gửi `POST /api/products/search-image` với `{ image: "data:image/jpeg;base64,..." }`. Không cần đăng nhập.
3. Service kiểm tra: đúng dạng `data:image/(jpeg|png|webp);base64,...` (sai ném 400 "Please upload a JPG, PNG or WebP image."), không quá 3.000.000 ký tự
   (400 "The image is too large..."); không có `GROQ_API_KEY` ném 503 "Image search needs the AI service...".
4. `describeProductImage` gửi ảnh cho mô hình đọc ảnh của Groq (mặc định `qwen/qwen3.8-27b`), yêu cầu trả JSON `{ label, category, keywords[] }`
   (tên ngắn tiếng Anh, danh mục trong shop, 6 đến 10 từ khoá Anh và Việt). Bị giới hạn lượt thì ném 429 "The AI service is busy..."; không đọc được ném 502.
5. Service tìm trong CSDL các sản phẩm khớp một trong các từ khoá (tối đa 200, bán chạy trước).
6. `rankByImage` chấm điểm: khớp trong tên +3, trong danh mục +2, trong mô tả +1, cùng danh mục mô hình nêu +2, hết hàng −1. Giữ sản phẩm từ 2 điểm trở lên, tối đa 12, điểm cao trước (hoà thì bán nhiều trước).
7. Trang hiện ảnh gốc, nhãn "Looks like: ...", và lưới sản phẩm; không có thì hiện "No similar products found in the shop.".

| | Nội dung |
|---|---|
| **Input** | `{ image: string (data URL, ≤ 3.000.000 ký tự) }` |
| **Output** | `{ detected: { label, keywords[], category }, products: Product[] }` |
| **Lỗi** | 400 ảnh sai hoặc quá lớn; 429 AI bận; 502 AI không đọc được; 503 chưa có khoá |
| **Giới hạn** | bản miễn phí của mô hình đọc ảnh chỉ cho vài ảnh mỗi phút |

### 12.6 Tìm bằng giọng nói (tiếng Việt hoặc tiếng Anh)

**Kích hoạt:** biểu tượng micro cạnh ô tìm kiếm; bảng nhỏ giữa màn hình hiện ra như Google và YouTube.

| Việc | File |
|---|---|
| Nút và bảng "đang nghe" | `components/SearchTools.tsx` |
| Cổng API (nhánh dự phòng) | `app/api/speech/route.ts` → `speechController.transcribe` |
| Service | `application/service/speechService.ts` → `transcribe`, `fixBrandNames` |
| Hạ tầng | `infrastructure/llm/groqWhisper.ts` (`transcribeAudio`), `groqClient.ts` (sửa tên hãng), `productRepository` (danh sách tên sản phẩm) |

**Có hai đường, tự chọn**
- **Đường 1, nhận giọng của trình duyệt** (Chrome, Edge): Web Speech API, ngôn ngữ `vi-VN` hoặc `en-US` (hai nút đổi ngôn ngữ trong bảng, lưu ở `voice_search_lang`).
  Chữ hiện **ngay khi đang nói** (kết quả tạm). Khi có kết quả cuối, bảng hiện dấu tích và câu nghe được trong 0,7 giây rồi tìm kiếm.
- **Đường 2, ghi âm rồi gửi AI** (Firefox, Safari, hoặc khi Web Speech báo lỗi mạng): ghi âm tối đa 7 giây (hiện đếm ngược; nút Done dừng sớm),
  gửi lên server, nhận chữ về.

**Đường 2, chạy thế nào**
1. Trình duyệt ghi âm bằng `MediaRecorder` (WebM hoặc MP4), gửi `POST /api/speech` dạng `multipart/form-data` với trường `audio`.
2. `speechController.transcribe` đọc file; `speechService.transcribe` kiểm tra: có file (400 "No audio received."), không quá 5 MB (400 "The recording is too long..."),
   đúng loại âm thanh (400 "Unsupported audio format."), có khoá (503 "Voice search needs the AI service...").
3. `transcribeAudio` gửi file cho Whisper của Groq (`whisper-large-v3`), **không ép ngôn ngữ** nên tự nhận tiếng Việt hoặc tiếng Anh; kèm gợi ý từ vựng sản phẩm (laptop, iPhone, DJI, tai nghe...).
   Giới hạn lượt thì 429 "The AI service is busy..."; lỗi khác 502; không nghe thấy gì thì 422 "I did not hear anything...".
4. **Sửa tên hãng** (`fixBrandNames`): người nói tiếng Việt hay làm tên hãng bị nghe sai ("AirPods" thành "ẻ tuột", "DJI Mini" thành "giờ ZE mini").
   Service gửi chữ vừa nhận cùng **danh sách tên sản phẩm thật của shop** cho mô hình ngôn ngữ để sửa các từ nghe giống tên hãng; không xoá từ nào; lỗi thì giữ nguyên chữ gốc.
5. Trả `{ text }`. Trình duyệt đặt chữ vào ô tìm kiếm và chuyển tới `/search?q=...`, tức là đi tiếp luồng 11.1.

| | Nội dung |
|---|---|
| **Input** | đường 1: tiếng nói qua micro; đường 2: file âm thanh (`audio`) tối đa 5 MB |
| **Output** | `{ text: string }`, sau đó là trang kết quả tìm kiếm |
| **Lỗi** | 400 file sai; 422 không nghe thấy; 429 AI bận; 502 AI lỗi; 503 chưa có khoá |

### 12.7 Các phần giao diện nhỏ khác

- **Slideshow trang chủ** (`components/HeroSlider.tsx`): 3 slide tự chuyển sau 5 giây (cửa hàng, giao hàng bằng drone, giao hàng bằng xe tự lái). Rê chuột vào thì dừng.
  Phí hiển thị trong quảng cáo lấy từ hằng số `DRONE_FEE`, `ROBOT_CAR_FEE` nên luôn khớp với khi thanh toán.
- **Thông báo** (`components/Toast.tsx`): `toast(thông báo, loại)` ở góc màn hình.
- **Navbar** (`components/Navbar.tsx`): gọi `GET /api/auth/me` và `GET /api/cart` khi tải trang và khi nhận `auth-updated`, `cart-updated`; chứa ô tìm kiếm và nút micro, máy ảnh.

---

## 13. Dữ liệu và các lệnh nạp sản phẩm

CSDL là SQLite ở `prisma/dev.db` (không đưa lên GitHub). Bảng: `User`, `Product`, `Cart`, `CartItem`, `Order` (có cột `deliveryMethod`), `OrderItem`.
Định nghĩa ở `prisma/schema.prisma`; lịch sử thay đổi ở `prisma/migrations/`.

| Lệnh (chạy trong `web/`) | Làm gì | Có xoá dữ liệu cũ? |
|---|---|---|
| `npm run db:setup` | tạo CSDL từ các migration, nạp dữ liệu mẫu, tạo CSDL theo ERD của nhóm | **có** (bước nạp mẫu xoá đơn, giỏ, người dùng, sản phẩm rồi nạp lại) |
| `npm run db:seed` | chỉ nạp dữ liệu mẫu: tài khoản demo `customer@example.com` / `123456` và toàn bộ sản phẩm | **có** |
| `npm run db:add-pc` | thêm 17 sản phẩm PC và gaming (`prisma/pcProducts.ts`) | không |
| `npm run db:add-extra` | thêm 60 sản phẩm của nhóm (`prisma/extraProducts.ts`) | không |
| `npm run db:add-more` | thêm 21 sản phẩm công nghệ (`prisma/moreProducts.ts`) và cập nhật ảnh | không |
| `npm run db:vp` | tạo `prisma/vp_catalog.db` đúng 8 bảng của ERD để nộp bài | không (tạo file riêng) |

Các lệnh `db:add-*` chạy lại nhiều lần được: món đã có (so theo tên) chỉ được cập nhật đường dẫn ảnh.

## 14. Bảng tra nhanh: endpoint ↔ Controller ↔ Service

| Endpoint | Cần đăng nhập | Controller.phương thức | Service.phương thức |
|---|---|---|---|
| `GET /api/products` | không | `productController.search` | `productService.search` |
| `GET /api/products/{id}` | không | `productController.viewDetail` | `productService.getDetail` |
| `POST /api/products/search-image` | không | `productController.searchByImage` | `productService.searchByImage` |
| `POST /api/auth/register` | không | `customerController.register` | `customerService.register` |
| `POST /api/auth/login` | không | `customerController.login` | `customerService.login` |
| `POST /api/auth/logout` | không | `customerController.logout` | (xoá cookie) |
| `GET /api/auth/me` | không (trả `user: null` nếu chưa) | `customerController.me` | `customerService.getProfile` |
| `GET /api/cart` | có | `cartController.viewCart` | `cartService.getCart` |
| `POST /api/cart` | có | `cartController.addToCart` | `cartService.addItem` |
| `PUT /api/cart/{productId}` | có | `cartController.updateQuantity` | `cartService.updateQuantity` |
| `DELETE /api/cart/{productId}` | có | `cartController.removeItem` | `cartService.removeItem` |
| `DELETE /api/cart` | có | `cartController.clearCart` | `cartService.clear` |
| `POST /api/checkout/shipping` | có | `checkoutController.enterShipping` | `checkoutService.enterShipping` |
| `POST /api/checkout/payment` | có | `checkoutController.pay` | `checkoutService.pay` |
| `POST /api/orders` | có | `checkoutController.checkout` | `checkoutService.checkout` |
| `GET /api/orders` | có | `orderController.listMine` | `orderService.listMine` |
| `GET /api/orders/{id}` | có (chủ đơn) | `orderController.detail` | `orderService.getForOwner` |
| `GET /api/orders/by-code/{code}` | không | `orderController.trackOrder` | `orderService.getStatus` |
| `POST /api/delivery-advice` | có | `deliveryAdvisorController.advise` | `deliveryAdvisorService.advise` |
| `POST /api/compare` | không | `compareController.compare` | `compareService.compare` |
| `POST /api/bundle` | không | `bundleController.build` | `bundleService.build` |
| `POST /api/chat` | không (có thì dùng giỏ thật) | `chatController.chat` | `chatService.reply` |
| `POST /api/speech` | không | `speechController.transcribe` | `speechService.transcribe` |

## 15. Cách tự học luồng này

1. Chọn một nút trên giao diện, mở file trang ở cột "Trang" của luồng đó và tìm lệnh `fetch("/api/...")`.
2. Mở file `route.ts` tương ứng ở mục 14 (chỉ một dòng) để biết Controller nào được gọi.
3. Đọc Controller (đọc yêu cầu, kiểm tra đăng nhập), rồi Service (luồng nghiệp vụ), rồi các file Domain và Repository mà Service gọi.
4. Đối chiếu từng bước với bảng "Chạy thế nào" của luồng. Thử gọi API bằng tài khoản demo để xem đúng `Output` và đúng thông báo lỗi.
5. Muốn kiểm tra cấu trúc 4 tầng còn đúng sau khi sửa code, chạy lại 5 lệnh `git grep` ở mục 3; kết quả phải rỗng.
