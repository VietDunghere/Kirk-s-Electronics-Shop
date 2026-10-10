// PC parts, gaming gear and gaming laptops. Used by seed.ts and by `npm run db:add-pc` (adds only the missing ones).
// Photos: Wikimedia Commons (file names checked through the Commons API).
export type PcProduct = {
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  rating: number;
  sold: number;
  isNew?: boolean;
  isFeatured?: boolean;
};

const commons = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURI(file.replace(/ /g, "_"))}?width=800`;

export const PC_PRODUCTS: PcProduct[] = [
  // ---- PC components (one platform: Intel LGA1700, so every CPU / mainboard pair is compatible)
  {
    name: "Intel Core i5-12400F (LGA1700)",
    description: "CPU Intel Core i5 thế hệ 12, 6 nhân 12 luồng, xung nhịp tối đa 4.4GHz, socket LGA1700. Lựa chọn tối ưu cho PC gaming tầm trung.",
    price: 3190000, stock: 40, image: commons("Intel-Core-5-Badge-2023.png"), category: "PC", rating: 4.7, sold: 640
  },
  {
    name: "Intel Core i7-12700KF (LGA1700)",
    description: "CPU Intel Core i7 thế hệ 12 mở khóa xung nhịp, 12 nhân 20 luồng, socket LGA1700. Mạnh cho game nặng, stream và dựng phim.",
    price: 8490000, stock: 18, image: commons("2023 Intel Core i7 12700KF (5).jpg"), category: "PC", rating: 4.8, sold: 310, isFeatured: true
  },
  {
    name: "ASUS ROG STRIX Z690-A GAMING WIFI (LGA1700)",
    description: "Mainboard ATX socket LGA1700 chipset Z690, WiFi 6E, PCIe 5.0, khe M.2 tốc độ cao, đèn RGB. Tương thích CPU Intel Core thế hệ 12.",
    price: 7990000, stock: 12, image: commons("2023 Płyta główna Asus ROG STRIX Z690-A GAMING WIFI.jpg"), category: "PC", rating: 4.7, sold: 120
  },
  {
    name: "MSI GeForce RTX 3070 VENTUS 3X OC 8GB",
    description: "Card đồ họa RTX 3070 8GB GDDR6, 3 quạt tản nhiệt Tri Frozr, chơi mượt game 1440p, hỗ trợ ray tracing và DLSS.",
    price: 11900000, stock: 14, image: commons("MSI GeForce RTX 3070 VENTUS 3X OC.jpg"), category: "PC", rating: 4.7, sold: 210
  },
  {
    name: "Gigabyte GeForce RTX 3090 Eagle OC 24GB",
    description: "Card đồ họa RTX 3090 24GB GDDR6X dành cho game 4K, render 3D và AI. Tản nhiệt 3 quạt, ép xung sẵn.",
    price: 32900000, stock: 5, image: commons("Gigabyte GeForce RTX 3090 Eagle OC 24G, 24576 MiB GDDR6X Front 20201114 DSC5880.jpg"), category: "PC", rating: 4.8, sold: 40
  },
  {
    name: "Corsair Vengeance RGB RAM 32GB (2x16GB)",
    description: "Bộ nhớ RAM desktop Corsair Vengeance RGB dung lượng 32GB (2x16GB), đèn RGB, tản nhiệt nhôm, bus cao cho gaming.",
    price: 2590000, stock: 60, image: commons("2023 Pamięci Corsair Vengeance RGB.jpg"), category: "PC", rating: 4.8, sold: 520
  },
  {
    name: "PSU 750W 80 Plus Gold Full Modular",
    description: "Nguồn máy tính 750W chuẩn 80 Plus Gold, full modular dây rời gọn gàng, đủ tải cho CPU Core i7 và card RTX 3070.",
    price: 2490000, stock: 30, image: commons("Full modular ATX power supply unit.jpg"), category: "PC", rating: 4.6, sold: 260
  },
  {
    name: "Aerocool XPredator Avenger PC Case",
    description: "Vỏ case ATX mid tower gaming, mặt hông trong suốt, hỗ trợ quạt RGB và tản nhiệt nước, nhiều khay ổ cứng.",
    price: 1890000, stock: 25, image: commons("Aerocool XPredator Avenger IMG 0541 cropped.JPG"), category: "PC", rating: 4.4, sold: 150
  },
  {
    name: "Cooler Master Hyper 212 EVO CPU Cooler",
    description: "Tản nhiệt khí CPU tháp đơn, quạt 120mm PWM, 4 ống đồng tiếp xúc trực tiếp, hỗ trợ LGA1700 qua bracket đi kèm.",
    price: 790000, stock: 50, image: commons("Cooler Master Hyper 212 EVO - CPU Cooler with 120mm PWM Fan (RR-212E-20PK-R2).jpg"), category: "PC", rating: 4.7, sold: 480
  },
  // ---- Ready-built gaming PCs
  {
    name: "Kirk PC Gaming Starter (i5-12400F / RTX 3070 / 16GB / 1TB)",
    description: "PC gaming dựng sẵn: Intel Core i5-12400F, card RTX 3070 8GB, RAM 16GB, SSD NVMe 1TB, nguồn 650W. Lắp sẵn, cắm điện là chơi.",
    price: 23900000, stock: 8, image: commons("Gaming computers (1).jpg"), category: "PC", rating: 4.5, sold: 75, isNew: true
  },
  {
    name: "Kirk PC Gaming Pro (i7-12700KF / RTX 3090 / 32GB / 2TB)",
    description: "PC gaming cao cấp dựng sẵn: Intel Core i7-12700KF, card RTX 3090 24GB, RAM 32GB, SSD NVMe 2TB, tản nhiệt tốt, đèn RGB. Chiến game 4K.",
    price: 59900000, stock: 3, image: commons("Gaming PC-Setup - Astaroth- The Completed System.jpg"), category: "PC", rating: 4.8, sold: 18, isNew: true
  },
  // ---- Gaming gear
  {
    name: "Gaming Headset RGB 7.1",
    description: "Tai nghe gaming chụp tai âm thanh vòm 7.1, micro chống ồn, đệm tai mềm, đèn RGB, kết nối USB.",
    price: 1290000, stock: 45, image: commons("RGB gaming headset on desk with ambient lighting.jpg"), category: "Gaming", rating: 4.5, sold: 310
  },
  {
    name: "Gaming Monitor 27 inch 165Hz QHD",
    description: "Màn hình gaming 27 inch độ phân giải 2K QHD, tần số quét 165Hz, tấm nền IPS, phản hồi 1ms, hỗ trợ G-Sync Compatible.",
    price: 6490000, stock: 16, image: commons("Gaming-Monitor ausgestellt 20190202 185511 Kopie.jpg"), category: "Gaming", rating: 4.6, sold: 140
  },
  {
    name: "Gamepad Controller Wireless",
    description: "Tay cầm chơi game không dây dùng được cho PC và điện thoại, rung kép, pin 20 giờ, thiết kế công thái học.",
    price: 1090000, stock: 40, image: commons("Gamepad xbox.jpg"), category: "Gaming", rating: 4.5, sold: 220
  },
  {
    name: "ASUS ROG Strix G16 Gaming Laptop (i7 / RTX 4070)",
    description: "Laptop gaming 16 inch, Intel Core i7, card RTX 4070 8GB, RAM 16GB, SSD 1TB, màn hình 165Hz, bàn phím RGB.",
    price: 42990000, stock: 6, image: commons("ROG Strix G16 2026-08-08 ASUS 01.jpg"), category: "Gaming", rating: 4.7, sold: 60, isNew: true
  },
  {
    name: "ASUS ROG Zephyrus G14 Gaming Laptop (Ryzen 9 / RTX 4060)",
    description: "Laptop gaming mỏng nhẹ 14 inch, Ryzen 9, card RTX 4060, RAM 16GB, SSD 1TB, màn hình OLED 120Hz, pin lâu.",
    price: 39990000, stock: 7, image: commons("ASUS ROG Zephyrus 2026-08-15 G14.jpg"), category: "Gaming", rating: 4.8, sold: 85, isNew: true
  },
  {
    name: "USB Streaming Microphone Snowflake",
    description: "Micro condenser USB cho stream, podcast và họp online, cắm là chạy, chân đế gấp gọn, thu âm rõ.",
    price: 1490000, stock: 35, image: commons("Blue Snowflake USB microphone.jpg"), category: "Accessories", rating: 4.5, sold: 190
  }
];
