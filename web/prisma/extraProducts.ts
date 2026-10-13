// Sixty fictional catalogue entries for the classroom demo. Prices, stock,
// ratings and sales are sample data, not live merchant information.
import type { PcProduct } from "./pcProducts";

type ProductRow = [name: string, description: string, price: number, stock: number, category: string, photo: string];

const photos = {
  laptop: "1496181133206-80ce9b88a853",
  laptopLight: "1517336714731-489689fd1ca8",
  laptopGaming: "1603302576837-37561b2e2302",
  phone: "1592750475338-74b7b21085ab",
  phoneAlt: "1610945265064-0e34e5519bbf",
  tablet: "1544244015-0df4b3ffc6b0",
  headphones: "1590658268037-6bf12165a8df",
  keyboard: "1587829741301-dc798b83add3",
  mouse: "1527814050087-3793815479db",
  monitor: "1527443224154-c4a3942d3acf",
  watch: "1546868871-7041f2a55e12",
  speaker: "1608043152269-423dbba4e7e1",
  vr: "1622979135225-d2ba269cf1ac"
} as const;

const rows: ProductRow[] = [
  ["Kirk Note 14 Core i5 16GB", "Laptop học tập và văn phòng 14 inch, RAM 16GB, SSD 512GB, bàn phím có đèn nền.", 14990000, 24, "Laptops", "laptopLight"],
  ["Kirk Note 15 Ryzen 5 16GB", "Laptop 15.6 inch cho công việc hằng ngày, RAM 16GB, SSD 512GB, màn hình Full HD.", 15490000, 19, "Laptops", "laptop"],
  ["Kirk Air 13 Core i5 8GB", "Laptop nhỏ gọn 13 inch, RAM 8GB, SSD 256GB, phù hợp học tập và di chuyển.", 12990000, 28, "Laptops", "laptopLight"],
  ["Kirk Air 14 Ryzen 7 16GB", "Laptop mỏng nhẹ 14 inch, RAM 16GB, SSD 1TB, phù hợp làm việc đa nhiệm.", 20990000, 15, "Laptops", "laptopLight"],
  ["Kirk Studio 16 Core i7 32GB", "Laptop màn hình 16 inch, RAM 32GB, SSD 1TB cho thiết kế và xử lý ảnh.", 31990000, 9, "Laptops", "laptop"],
  ["Kirk Gamer 15 RTX 4050", "Laptop gaming 15.6 inch, GPU RTX 4050, RAM 16GB, SSD 512GB, màn 144Hz.", 22990000, 13, "Gaming", "laptopGaming"],
  ["Kirk Gamer 16 RTX 4060", "Laptop gaming 16 inch, GPU RTX 4060, RAM 16GB, SSD 1TB, màn 165Hz.", 29990000, 10, "Gaming", "laptopGaming"],
  ["Kirk Gamer 17 RTX 4070", "Laptop gaming 17 inch, GPU RTX 4070, RAM 32GB, SSD 1TB, tản nhiệt hai quạt.", 39990000, 6, "Gaming", "laptopGaming"],
  ["Kirk Work 15 Core i3 8GB", "Laptop phổ thông 15.6 inch, RAM 8GB, SSD 256GB cho học tập và tác vụ cơ bản.", 9990000, 35, "Laptops", "laptop"],
  ["Kirk Work 14 Ryzen 5 16GB", "Laptop làm việc 14 inch, RAM 16GB, SSD 512GB, webcam và cổng HDMI.", 13990000, 21, "Laptops", "laptopLight"],

  ["Kirk Nova A1 128GB", "Điện thoại 6.5 inch, bộ nhớ 128GB, camera kép và pin 5000mAh.", 3990000, 48, "Phones", "phone"],
  ["Kirk Nova A2 256GB", "Điện thoại phổ thông 6.6 inch, bộ nhớ 256GB, màn hình 90Hz và sạc USB-C.", 4990000, 42, "Phones", "phoneAlt"],
  ["Kirk Nova A3 5G 128GB", "Điện thoại 5G màn 6.6 inch, bộ nhớ 128GB, camera chính 50MP.", 6490000, 31, "Phones", "phone"],
  ["Kirk Nova A4 5G 256GB", "Điện thoại 5G bộ nhớ 256GB, màn 120Hz, pin 5000mAh.", 7990000, 27, "Phones", "phoneAlt"],
  ["Kirk Nova S1 256GB", "Điện thoại tầm trung màn AMOLED 6.4 inch, camera 50MP, bộ nhớ 256GB.", 8990000, 26, "Phones", "phone"],
  ["Kirk Nova S2 5G 256GB", "Điện thoại 5G màn AMOLED 120Hz, RAM 8GB, bộ nhớ 256GB.", 10990000, 22, "Phones", "phoneAlt"],
  ["Kirk Nova Pro 256GB", "Điện thoại cao cấp màn OLED 120Hz, camera góc rộng, sạc nhanh USB-C.", 15990000, 18, "Phones", "phone"],
  ["Kirk Nova Pro Max 512GB", "Điện thoại màn lớn 6.8 inch, bộ nhớ 512GB, camera ba ống kính.", 19990000, 12, "Phones", "phoneAlt"],
  ["Kirk Fold Mini 256GB", "Điện thoại gập nhỏ gọn, màn hình phụ để xem thông báo, bộ nhớ 256GB.", 22990000, 8, "Phones", "phone"],
  ["Kirk Fold Plus 512GB", "Điện thoại gập màn lớn hỗ trợ đa nhiệm, bộ nhớ 512GB, sạc USB-C.", 32990000, 5, "Phones", "phoneAlt"],
  ["Kirk Lite 64GB", "Điện thoại cơ bản cho liên lạc, màn 6.1 inch, bộ nhớ 64GB.", 2490000, 55, "Phones", "phone"],
  ["Kirk Lite Plus 128GB", "Điện thoại giá dễ tiếp cận, màn 6.5 inch, bộ nhớ 128GB, pin 5000mAh.", 3290000, 46, "Phones", "phoneAlt"],

  ["Kirk Pad 8 WiFi 64GB", "Máy tính bảng 8 inch nhỏ gọn, bộ nhớ 64GB, kết nối WiFi.", 3990000, 34, "Electronics", "tablet"],
  ["Kirk Pad 10 WiFi 128GB", "Máy tính bảng 10.1 inch, bộ nhớ 128GB, loa kép và cổng USB-C.", 5990000, 29, "Electronics", "tablet"],
  ["Kirk Pad 10 LTE 128GB", "Máy tính bảng 10.1 inch hỗ trợ LTE, bộ nhớ 128GB, phù hợp học trực tuyến.", 7490000, 21, "Electronics", "tablet"],
  ["Kirk Pad 11 2K 256GB", "Máy tính bảng 11 inch màn hình 2K, bộ nhớ 256GB, hỗ trợ bút cảm ứng.", 9990000, 17, "Electronics", "tablet"],
  ["Kirk Pad 12 Pro 256GB", "Máy tính bảng 12 inch cho làm việc và giải trí, màn 120Hz, bộ nhớ 256GB.", 14990000, 11, "Electronics", "tablet"],
  ["Kirk Pad Mini 8 LTE", "Máy tính bảng 8 inch hỗ trợ SIM LTE, bộ nhớ 128GB, dễ mang theo.", 6990000, 23, "Electronics", "tablet"],
  ["Kirk Pad Kids 10 64GB", "Máy tính bảng 10 inch cho gia đình, bộ nhớ 64GB, vỏ bảo vệ đi kèm.", 4490000, 30, "Electronics", "tablet"],
  ["Kirk Pad Studio 13 512GB", "Máy tính bảng 13 inch màn hình lớn, bộ nhớ 512GB, hỗ trợ bàn phím rời.", 21990000, 7, "Electronics", "tablet"],

  ["Kirk Buds Lite", "Tai nghe true wireless, hộp sạc USB-C, điều khiển cảm ứng.", 590000, 75, "Accessories", "headphones"],
  ["Kirk Buds Sport", "Tai nghe không dây dạng nhét tai, chống nước bắn và hộp sạc nhỏ gọn.", 890000, 62, "Accessories", "headphones"],
  ["Kirk Buds ANC", "Tai nghe true wireless có chống ồn chủ động và chế độ nghe âm thanh xung quanh.", 1490000, 44, "Accessories", "headphones"],
  ["Kirk Buds Studio", "Tai nghe không dây có chống ồn chủ động, micro đàm thoại và sạc USB-C.", 2190000, 36, "Accessories", "headphones"],
  ["Kirk Headphone Travel", "Tai nghe chụp tai gấp gọn, kết nối Bluetooth, pin dùng nhiều ngày.", 1290000, 38, "Accessories", "headphones"],
  ["Kirk Headphone Studio Pro", "Tai nghe chụp tai không dây với chống ồn chủ động và đệm tai mềm.", 3490000, 20, "Accessories", "headphones"],
  ["Kirk Watch Fit 40mm", "Đồng hồ thông minh 40mm, theo dõi vận động và nhịp tim, màn màu.", 1690000, 41, "Accessories", "watch"],
  ["Kirk Watch Active 44mm", "Đồng hồ thông minh 44mm, GPS, nhiều chế độ tập luyện và thông báo điện thoại.", 2890000, 33, "Accessories", "watch"],
  ["Kirk Speaker Mini", "Loa Bluetooth cầm tay, sạc USB-C, phù hợp không gian nhỏ.", 690000, 58, "Accessories", "speaker"],
  ["Kirk Speaker Party", "Loa Bluetooth di động công suất lớn, có quai xách và đèn trang trí.", 2990000, 25, "Accessories", "speaker"],

  ["Kirk Key 68 Mechanical", "Bàn phím cơ 68 phím, kết nối USB-C, đèn nền RGB.", 990000, 48, "Gaming", "keyboard"],
  ["Kirk Key 75 Wireless", "Bàn phím cơ 75%, Bluetooth và USB-C, phím có thể thay nóng.", 1690000, 37, "Gaming", "keyboard"],
  ["Kirk Key 98 Office", "Bàn phím 98 phím cho làm việc, kết nối không dây và bộ phím số.", 790000, 52, "Accessories", "keyboard"],
  ["Kirk Mouse Swift", "Chuột không dây gọn nhẹ, cảm biến quang, sạc USB-C.", 390000, 66, "Accessories", "mouse"],
  ["Kirk Mouse Aim 12K", "Chuột gaming cảm biến 12000 DPI, nút chỉnh độ nhạy và đèn RGB.", 790000, 54, "Gaming", "mouse"],
  ["Kirk Mouse Aim Pro 26K", "Chuột gaming 26000 DPI, thiết kế nhẹ, kết nối không dây.", 1590000, 27, "Gaming", "mouse"],
  ["Kirk Monitor Play 24 144Hz", "Màn hình gaming 24 inch Full HD, tần số quét 144Hz, cổng HDMI.", 3490000, 32, "Gaming", "monitor"],
  ["Kirk Monitor Play 27 165Hz", "Màn hình gaming 27 inch QHD, tần số quét 165Hz, chân đế điều chỉnh.", 6490000, 24, "Gaming", "monitor"],
  ["Kirk Monitor Office 24", "Màn hình văn phòng 24 inch Full HD IPS, viền mỏng, hỗ trợ treo VESA.", 2590000, 46, "Electronics", "monitor"],
  ["Kirk Monitor Creator 32 4K", "Màn hình 32 inch 4K IPS cho làm việc nhiều cửa sổ và chỉnh sửa ảnh.", 10990000, 13, "Electronics", "monitor"],

  ["Kirk View Webcam Full HD", "Webcam 1080p có micro tích hợp và kẹp gắn màn hình.", 590000, 49, "Electronics", "monitor"],
  ["Kirk View Webcam 4K", "Webcam 4K tự động lấy nét, micro kép cho họp trực tuyến.", 1890000, 22, "Electronics", "monitor"],
  ["Kirk Power 10000mAh 20W", "Pin dự phòng 10000mAh, sạc nhanh USB-C 20W, hai cổng ra.", 490000, 81, "Accessories", "phone"],
  ["Kirk Power 20000mAh 30W", "Pin dự phòng 20000mAh, sạc nhanh USB-C 30W và màn báo pin.", 790000, 64, "Accessories", "phone"],
  ["Kirk Dock USB-C 7-in-1", "Bộ chuyển USB-C có HDMI, USB-A, đầu đọc thẻ và cổng sạc xuyên qua.", 890000, 43, "Accessories", "laptop"],
  ["Kirk Hub USB-C 4-Port", "Bộ chia USB-C ra bốn cổng USB-A cho bàn làm việc.", 390000, 72, "Accessories", "laptop"],
  ["Kirk Drive Portable SSD 1TB", "Ổ cứng SSD di động 1TB, kết nối USB-C, vỏ kim loại.", 1990000, 39, "Electronics", "laptop"],
  ["Kirk Drive Portable SSD 2TB", "Ổ cứng SSD di động 2TB cho sao lưu ảnh, video và tài liệu.", 3490000, 23, "Electronics", "laptop"],
  ["Kirk Vision VR Lite", "Kính thực tế ảo độc lập với bộ điều khiển, bộ nhớ 128GB.", 8990000, 12, "Gaming", "vr"],
  ["Kirk Vision VR Pro", "Kính thực tế ảo độc lập, bộ nhớ 256GB, hỗ trợ theo dõi chuyển động.", 13990000, 8, "Gaming", "vr"]
];

export const EXTRA_PRODUCTS: PcProduct[] = rows.map(([name, description, price, stock, category, photo], index) => ({
  name,
  description,
  price,
  stock,
  category,
  image: `https://images.unsplash.com/photo-${photos[photo as keyof typeof photos]}?auto=format&fit=crop&w=800&q=80`,
  rating: Number((4.2 + (index % 8) * 0.1).toFixed(1)),
  sold: 25 + (index * 37) % 520,
  isNew: index % 7 === 0,
  isFeatured: index % 11 === 0
}));
