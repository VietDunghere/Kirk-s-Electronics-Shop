// 20 more consumer-tech products (consoles, cameras, smart home, wearables...) plus one traditional-craft item.
// Prices, stock, ratings and sales are fictional classroom demo data. Photos: Wikimedia Commons, saved in public/products (see CREDITS.md) so the pages load fast and work offline.
import type { PcProduct } from "./pcProducts";

/** The old Galaxy Tab S9 picture looked like a cut-out screenshot; this is a real photo of the tablet. */
export const TAB_S9_FE_NAME = "Samsung Galaxy Tab S9 FE 6/128GB";
export const TAB_S9_FE_IMAGE = "/products/galaxy-tab-s9.jpg";

export const MORE_PRODUCTS: PcProduct[] = [
  // ---- Gaming
  {
    name: "Sony PlayStation 5 + tay cầm DualSense",
    description: "Máy chơi game PlayStation 5 bản đĩa, ổ SSD siêu tốc, hỗ trợ 4K 120Hz và ray tracing, kèm tay cầm DualSense có phản hồi xúc giác.",
    price: 12990000, stock: 14, image: "/products/ps5.jpg", category: "Gaming", rating: 4.9, sold: 640, isFeatured: true
  },
  {
    name: "Xbox Series X 1TB",
    description: "Máy chơi game Xbox Series X ổ SSD 1TB, xuất hình 4K 120fps, Quick Resume, tương thích ngược hàng nghìn game Xbox, kèm tay cầm không dây.",
    price: 12490000, stock: 10, image: "/products/xbox-series-x.jpg", category: "Gaming", rating: 4.8, sold: 410
  },
  {
    name: "Nintendo Switch Neon Joy-Con",
    description: "Máy chơi game cầm tay lai máy console Nintendo Switch, Joy-Con đỏ xanh Neon, chơi trên TV qua dock hoặc cầm tay mọi lúc.",
    price: 7490000, stock: 22, image: "/products/nintendo-switch.jpg", category: "Gaming", rating: 4.8, sold: 520
  },
  {
    name: "Meta Quest 3 128GB",
    description: "Kính thực tế ảo hỗn hợp Meta Quest 3 chạy độc lập, màn hình độ phân giải cao, camera màu passthrough, không cần dây hay máy tính.",
    price: 13990000, stock: 9, image: "/products/meta-quest-3.jpg", category: "Gaming", rating: 4.7, sold: 150, isNew: true
  },
  // ---- Electronics
  {
    name: "Sony Alpha 7R IV Full-frame Mirrorless",
    description: "Máy ảnh mirrorless full-frame Sony A7R IV cảm biến 61MP, lấy nét theo mắt thời gian thực, quay video 4K, chống rung 5 trục.",
    price: 69990000, stock: 4, image: "/products/sony-a7r4.jpg", category: "Electronics", rating: 4.9, sold: 38
  },
  {
    name: "Amazon Kindle Paperwhite 6.8 inch",
    description: "Máy đọc sách Kindle Paperwhite màn hình e-ink 6.8 inch không chói, chống nước IPX8, đèn nền ấm, pin dùng vài tuần.",
    price: 3490000, stock: 30, image: "/products/kindle-paperwhite.jpg", category: "Electronics", rating: 4.8, sold: 360
  },
  {
    name: "Raspberry Pi 4 Model B 4GB",
    description: "Máy tính nhúng Raspberry Pi 4 Model B RAM 4GB, CPU 4 nhân 1.5GHz, 2 cổng micro HDMI 4K, WiFi, Bluetooth. Dùng cho học lập trình và IoT.",
    price: 1890000, stock: 40, image: "/products/raspberry-pi-4.jpg", category: "Electronics", rating: 4.7, sold: 280
  },
  {
    name: "TP-Link TL-WR740N Router WiFi 150Mbps",
    description: "Router WiFi chuẩn N tốc độ 150Mbps, ăng-ten ngoài, 4 cổng LAN, cài đặt nhanh qua trình duyệt. Phù hợp phòng nhỏ và ký túc xá.",
    price: 350000, stock: 70, image: "/products/tplink-wr740n.jpg", category: "Electronics", rating: 4.4, sold: 920
  },
  {
    name: "LG OLED TV 55 inch",
    description: "Tivi LG OLED 55 inch màn hình OLED đen sâu, độ tương phản vô hạn, góc nhìn rộng, hỗ trợ HDR và Smart TV webOS.",
    price: 24990000, stock: 6, image: "/products/lg-oled-tv.jpg", category: "Electronics", rating: 4.8, sold: 95
  },
  {
    name: "Amazon Echo Dot (thế hệ 3) loa thông minh",
    description: "Loa thông minh Echo Dot thế hệ 3 vỏ vải, trợ lý ảo Alexa điều khiển giọng nói, phát nhạc, hẹn giờ và điều khiển thiết bị nhà thông minh.",
    price: 1190000, stock: 33, image: "/products/echo-dot-3.jpg", category: "Electronics", rating: 4.5, sold: 240
  },
  {
    name: "Prusa Mini+ máy in 3D",
    description: "Máy in 3D Original Prusa Mini+ in FDM khổ 18x18x18cm, tự cân bàn in, màn hình điều khiển màu, in chính xác cho mô hình và linh kiện.",
    price: 12990000, stock: 5, image: "/products/prusa-mini.jpg", category: "Electronics", rating: 4.8, sold: 47
  },
  {
    name: "iRobot Roomba robot hút bụi",
    description: "Robot hút bụi iRobot Roomba tự động dọn nhà, cảm biến tránh vật cản, tự quay về sạc, lực hút mạnh cho sàn gỗ và thảm.",
    price: 9990000, stock: 11, image: "/products/roomba.jpg", category: "Electronics", rating: 4.6, sold: 130
  },
  {
    name: "Canon PIXMA TS5380 máy in phun đa năng",
    description: "Máy in phun màu Canon PIXMA TS5380 in, scan, copy, in WiFi và in từ điện thoại, in ảnh sắc nét, kích thước gọn cho gia đình.",
    price: 2590000, stock: 18, image: "/products/canon-pixma-ts5380.jpg", category: "Electronics", rating: 4.4, sold: 175
  },
  // ---- Accessories / wearables
  {
    name: "Apple Watch Series 8 GPS 41mm",
    description: "Đồng hồ thông minh Apple Watch Series 8 vỏ nhôm Midnight, màn hình Retina luôn bật, đo nhịp tim, ECG, theo dõi giấc ngủ và nhiệt độ cơ thể.",
    price: 9990000, stock: 17, image: "/products/apple-watch-8.jpg", category: "Accessories", rating: 4.8, sold: 290
  },
  {
    name: "Apple AirTag",
    description: "Thiết bị định vị Apple AirTag tìm đồ thất lạc qua mạng Find My, chống nước, pin thay được, gắn vào ví, chìa khoá hoặc balo.",
    price: 790000, stock: 85, image: "/products/airtag.jpg", category: "Accessories", rating: 4.6, sold: 740
  },
  {
    name: "Logitech MX Master 3S chuột không dây",
    description: "Chuột không dây Logitech MX Master 3S cảm biến 8000 DPI, nút chuột yên tĩnh, cuộn MagSpeed siêu nhanh, kết nối đa thiết bị, pin sạc USB-C.",
    price: 2490000, stock: 26, image: "/products/mx-master-3s.jpg", category: "Accessories", rating: 4.9, sold: 330
  },
  {
    name: "Xiaomi Mi Band 6 vòng đeo tay thông minh",
    description: "Vòng đeo tay Xiaomi Mi Band 6 màn hình AMOLED 1.56 inch, đo SpO2, nhịp tim, hơn 30 chế độ thể thao, pin dùng khoảng 2 tuần.",
    price: 990000, stock: 60, image: "/products/mi-band-6.jpg", category: "Accessories", rating: 4.5, sold: 860
  },
  {
    name: "Garmin Instinct 2S đồng hồ thể thao GPS",
    description: "Đồng hồ thể thao Garmin Instinct 2S độ bền chuẩn quân đội, GPS đa hệ, theo dõi nhịp tim và sức khoẻ, pin dùng nhiều ngày, kích thước nhỏ gọn.",
    price: 7990000, stock: 13, image: "/products/garmin-instinct-2s.jpg", category: "Accessories", rating: 4.7, sold: 110
  },
  {
    name: "JBL Flip loa Bluetooth chống nước",
    description: "Loa Bluetooth JBL Flip dạng trụ, âm thanh JBL Original Pro mạnh, chống nước IPX7, pin phát nhạc khoảng 12 giờ, ghép đôi nhiều loa.",
    price: 1990000, stock: 41, image: "/products/jbl-flip.jpg", category: "Accessories", rating: 4.6, sold: 480
  },
  {
    name: "Anker sạc nhanh 5 cổng USB 40W",
    description: "Củ sạc Anker 5 cổng USB tổng công suất 40W, sạc cùng lúc điện thoại, máy tính bảng, tai nghe, nhận diện thiết bị thông minh, gọn nhẹ.",
    price: 590000, stock: 75, image: "/products/anker-40w.jpg", category: "Accessories", rating: 4.6, sold: 650
  },
  // ---- the extra: a traditional Vietnamese craft item, added for fun
  {
    name: "Điếu cày Thanh Hóa",
    description: "Điếu cày truyền thống xứ Thanh, thân gốm men lam hoạ tiết rồng, đồ thủ công mỹ nghệ làm quà tặng hoặc trưng bày sưu tầm. Sản phẩm trưng bày, không kèm thuốc.",
    price: 250000, stock: 12, image: "/products/dieu-cay.jpg", category: "Accessories", rating: 4.9, sold: 69, isNew: true
  }
];
