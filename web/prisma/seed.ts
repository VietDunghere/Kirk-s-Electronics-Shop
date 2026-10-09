import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedProduct = {
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

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;
const pexels = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;
// Wikimedia Commons exact product shots (hotlink via Special:FilePath, verified file names)
const wikimedia = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=800`;

// Real product photos (verified live): Unsplash for most, Pexels where it has the exact item.
// Premium/dark backgrounds where possible for a classy look.
const PHOTOS: Record<string, string> = {
  "laptop-pro14": unsplash("1496181133206-80ce9b88a853"), // MacBook Pro on wooden desk
  "laptop-air13": unsplash("1517336714731-489689fd1ca8"), // slim silver laptop keyboard
  "gaming-nitro": unsplash("1603302576837-37561b2e2302"), // gaming laptop with RGB
  "phone-s24": unsplash("1610945265064-0e34e5519bbf"), // Samsung flagship phone
  "phone-pixel": unsplash("1598327105666-5b89351aff97"), // Google Pixel phone
  "phone-iphone15": unsplash("1592750475338-74b7b21085ab"), // iPhone
  "buds-pro": unsplash("1590658268037-6bf12165a8df"), // wireless earbuds
  "keyboard-k87": unsplash("1587829741301-dc798b83add3"), // RGB mechanical keyboard
  "mouse-viper": unsplash("1527814050087-3793815479db"), // gaming mouse on pad
  "monitor-4k": unsplash("1527443224154-c4a3942d3acf"), // monitor desk setup
  "watch-s2": unsplash("1546868871-7041f2a55e12"), // smartwatch
  "tablet-11": unsplash("1544244015-0df4b3ffc6b0"), // tablet
  "speaker-boom": unsplash("1608043152269-423dbba4e7e1"), // bluetooth speaker
  "ssd-1tb": pexels("35984425"), // Lexar NVMe SSD on circuit board
  "powerbank-20k": pexels("3921696"), // power bank with USB-C cable on marble
  "chair-ergo": pexels("13871156"), // DXRacer gaming chair close-up
  "webcam-4k": pexels("7172701"), // webcam mounted on laptop at workplace
  "stand-alu": pexels("4792717"), // laptop on ergonomic stand
  "phone-nova12": unsplash("1511707171634-5f897ff02aa9"), // hand holding smartphone
  "vr-vision": unsplash("1622979135225-d2ba269cf1ac"), // VR headset
  // --- 20 new products: iPhone / iPad / AirPods / Samsung / Huawei ---
  "iphone-16pm": unsplash("1695048133142-1a20484d2569"), // iPhone Pro titanium
  "iphone-16": unsplash("1605236453806-6ff36851218e"), // blue iPhone
  "iphone-15": unsplash("1510557880182-3d4d3cba35a5"), // iPhone in hand
  "iphone-14": unsplash("1580910051074-3eb694886505"), // iPhone with case
  "ipad-pro-m4": unsplash("1561154464-82e9adf32764"), // iPad Pro + Pencil
  "ipad-air-m2": unsplash("1585790050230-5dd28404ccb9"), // iPad on desk
  "ipad-gen10": unsplash("1542751110-97427bbecf20"), // iPad tablet
  "ipad-mini6": unsplash("1544244015-0df4b3ffc6b0"), // tablet with keyboard
  "airpods-pro2": unsplash("1606220945770-b5b6c2c55bf1"), // AirPods Pro
  "airpods-3": unsplash("1572569511254-d8f925fe2cbb"), // AirPods
  "airpods-max": unsplash("1600294037681-c80b4cb5b434"), // over-ear headphones
  "samsung-s25u": wikimedia("Samsung_Galaxy_S25_Ultra.jpg"), // Galaxy S25 Ultra thật (Wikimedia)
  "samsung-fold6": wikimedia("Samsung_Galaxy_Z_Fold_6.jpg"), // Z Fold 6 thật (Wikimedia)
  "samsung-flip6": wikimedia("Samsung_Galaxy_Z_Flip_6.jpg"), // Z Flip 6 thật (Wikimedia)
  "samsung-tab-s9": wikimedia("Samsung_Galaxy_Tab_S9.png"), // Galaxy Tab S9 thật (Wikimedia)
  "samsung-buds2": wikimedia("Pair_of_lavender_Samsung_Galaxy_Buds2_Pro.jpg"), // Buds 2 Pro thật (Wikimedia)
  "samsung-watch6": wikimedia("Samsung_Galaxy_Watch_6_Classic.jpg"), // Watch 6 Classic thật (Wikimedia)
  "huawei-pura70": "https://fdn2.gsmarena.com/vv/pics/huawei/huawei-pura70-ultra-1.jpg", // Pura 70 Ultra official render lớn (GSMArena)
  "huawei-watch-gt4": "https://fdn2.gsmarena.com/vv/pics/huawei/huawei-watch-gt4-1.jpg", // Watch GT 4 official render lớn (GSMArena)
  "huawei-matepad": "https://fdn2.gsmarena.com/vv/pics/huawei/huawei-matepad-115-1.jpg", // MatePad 11.5 official render lớn (GSMArena)
  // --- 5 drones DJI (ảnh official DJI Việt Nam, nền trắng vuông vừa khung card) ---
  "dji-mini4pro": "https://product.hstatic.net/200000843159/product/mini_4pro_deb45ae4395c409b8245c65009fdf62c_master.jpg",
  "dji-mini5pro": "https://cdn.hstatic.net/products/200000843159/artboard_1_620373862ae841968d5b68e8b3edecf9_master.jpg",
  "dji-air3s": "https://product.hstatic.net/200000843159/product/air3s_7d145e4acd484ca9b59d2cbdd52fe424_master.jpg",
  "dji-mavic4pro": "https://product.hstatic.net/200000843159/product/artboard_1_6a9965a47413439e95d97886b33a422d_master.png",
  "dji-avata2": "https://cdn.hstatic.net/products/200000843159/main_avatar_ab94a9cc57424ae9a06162c2624cd574_master.jpg",
};

const img = (seed: string) => PHOTOS[seed] ?? `https://picsum.photos/seed/${seed}/600/600`;

const products: SeedProduct[] = [
  {
    name: "Laptop Pro 14 M3 Ultra",
    description: "14-inch laptop with high-performance chip, 16GB RAM, 512GB SSD, retina display. Ideal for developers, designers and office work.",
    price: 28990000, stock: 15, image: img("laptop-pro14"), category: "Laptops", rating: 4.8, sold: 320, isFeatured: true
  },
  {
    name: "Laptop Air 13 Lightweight",
    description: "Ultra-light 13-inch laptop, 1.2kg, 18-hour battery, perfect for students and frequent travellers.",
    price: 19990000, stock: 22, image: img("laptop-air13"), category: "Laptops", rating: 4.7, sold: 410, isFeatured: true, isNew: true
  },
  {
    name: "Gaming Laptop Nitro X15",
    description: "Gaming laptop with RTX 4060, 144Hz screen, RGB keyboard, dual-fan cooling. Built for esports and 3D work.",
    price: 25990000, stock: 10, image: img("gaming-nitro"), category: "Gaming", rating: 4.6, sold: 180, isFeatured: true
  },
  {
    name: "Smartphone Galaxy S24 Ultra",
    description: "6.8-inch flagship phone, 200MP camera, S-Pen, 5000mAh battery, 5G support.",
    price: 22990000, stock: 30, image: img("phone-s24"), category: "Phones", rating: 4.9, sold: 520, isFeatured: true, isNew: true
  },
  {
    name: "Smartphone Pixel 8a",
    description: "Compact phone with excellent camera, clean Android, long-term updates, great value.",
    price: 12490000, stock: 25, image: img("phone-pixel"), category: "Phones", rating: 4.5, sold: 290
  },
  {
    name: "iPhone 15 Pro Max 256GB",
    description: "Titanium flagship, A17 Pro chip, 48MP camera system, USB-C, Action Button.",
    price: 29990000, stock: 12, image: img("phone-iphone15"), category: "Phones", rating: 4.9, sold: 610, isFeatured: true
  },
  {
    name: "Wireless Headphones Buds Pro",
    description: "True wireless earbuds with active noise cancelling, 30-hour case battery, Bluetooth 5.3.",
    price: 2490000, stock: 60, image: img("buds-pro"), category: "Accessories", rating: 4.6, sold: 890, isFeatured: true
  },
  {
    name: "Mechanical Keyboard K87 RGB",
    description: "TKL mechanical keyboard, hot-swap switches, PBT keycaps, RGB, wired + wireless modes.",
    price: 1890000, stock: 45, image: img("keyboard-k87"), category: "Gaming", rating: 4.7, sold: 350, isNew: true
  },
  {
    name: "Gaming Mouse Viper 26K",
    description: "Esports gaming mouse 26000 DPI, 59g ultralight, optical switches, 90-hour battery.",
    price: 1490000, stock: 50, image: img("mouse-viper"), category: "Gaming", rating: 4.5, sold: 420
  },
  {
    name: "4K Monitor UltraView 27",
    description: "27-inch 4K IPS monitor, 99% sRGB, HDR400, height-adjustable stand. Great for design.",
    price: 8990000, stock: 18, image: img("monitor-4k"), category: "Electronics", rating: 4.7, sold: 150, isFeatured: true
  },
  {
    name: "Smart Watch Fit S2",
    description: "Smartwatch with AMOLED display, heart-rate + SpO2 sensors, GPS, 14-day battery.",
    price: 3290000, stock: 40, image: img("watch-s2"), category: "Accessories", rating: 4.4, sold: 470, isNew: true
  },
  {
    name: "Tablet Tab 11 LTE",
    description: "11-inch tablet, 2K display, quad speakers, 8GB RAM, LTE + WiFi, stylus support.",
    price: 9490000, stock: 20, image: img("tablet-11"), category: "Electronics", rating: 4.5, sold: 210
  },
  {
    name: "Bluetooth Speaker Boom 360",
    description: "360-degree portable speaker, deep bass, IPX7 waterproof, 24-hour playtime.",
    price: 1990000, stock: 55, image: img("speaker-boom"), category: "Accessories", rating: 4.6, sold: 380
  },
  {
    name: "SSD 1TB NVMe Gen4",
    description: "1TB NVMe Gen4 SSD, 7000MB/s read, graphene heatsink, 5-year warranty.",
    price: 2190000, stock: 70, image: img("ssd-1tb"), category: "Electronics", rating: 4.8, sold: 640
  },
  {
    name: "Power Bank 20000mAh 65W",
    description: "20000mAh power bank, 65W fast charging, charges laptop + phone simultaneously.",
    price: 990000, stock: 80, image: img("powerbank-20k"), category: "Accessories", rating: 4.5, sold: 720, isNew: true
  },
  {
    name: "Gaming Chair Ergo Pro",
    description: "Ergonomic gaming chair, lumbar support, 4D armrests, reclines 180 degrees.",
    price: 4990000, stock: 14, image: img("chair-ergo"), category: "Gaming", rating: 4.4, sold: 95
  },
  {
    name: "Webcam Studio 4K Pro",
    description: "4K webcam with auto-focus, dual noise-cancelling mics, great for online classes and streaming.",
    price: 1790000, stock: 35, image: img("webcam-4k"), category: "Electronics", rating: 4.3, sold: 130
  },
  {
    name: "Laptop Stand Aluminium X",
    description: "CNC aluminium laptop stand, foldable, cooling design, fits 11-17 inch laptops.",
    price: 490000, stock: 100, image: img("stand-alu"), category: "Accessories", rating: 4.6, sold: 540
  },
  {
    name: "Smartphone Nova 12 Budget",
    description: "Affordable smartphone with 90Hz screen, 50MP camera, 5000mAh battery. Best for students.",
    price: 4990000, stock: 0, image: img("phone-nova12"), category: "Phones", rating: 4.2, sold: 300
  },
  {
    name: "VR Headset Vision One",
    description: "All-in-one VR headset, 4K display, 6DoF tracking, 256GB storage. Experience the metaverse.",
    price: 12990000, stock: 8, image: img("vr-vision"), category: "Gaming", rating: 4.7, sold: 75, isFeatured: true, isNew: true
  },
  // ---------- 20 NEW: iPhone / iPad / AirPods / Samsung / Huawei ----------
  {
    name: "iPhone 16 Pro Max 256GB",
    description: "Flagship Apple 6.9-inch, chip A18 Pro, khung Titanium, camera 48MP Fusion, nút Camera Control, USB-C.",
    price: 34990000, stock: 15, image: img("iphone-16pm"), category: "Phones", rating: 4.9, sold: 210, isFeatured: true, isNew: true
  },
  {
    name: "iPhone 16 128GB",
    description: "iPhone 16 6.1-inch, chip A18, camera kép 48MP, Dynamic Island, pin cả ngày, USB-C.",
    price: 22990000, stock: 25, image: img("iphone-16"), category: "Phones", rating: 4.8, sold: 340, isFeatured: true, isNew: true
  },
  {
    name: "iPhone 15 128GB",
    description: "iPhone 15 6.1-inch, Dynamic Island, camera 48MP, chip A16 Bionic, USB-C. Giá tốt nhất phân khúc Apple mới.",
    price: 19490000, stock: 30, image: img("iphone-15"), category: "Phones", rating: 4.8, sold: 560
  },
  {
    name: "iPhone 14 128GB",
    description: "iPhone 14 6.1-inch, chip A15, camera kép 12MP, Face ID, kháng nước IP68. Lựa chọn tiết kiệm.",
    price: 16490000, stock: 20, image: img("iphone-14"), category: "Phones", rating: 4.7, sold: 480
  },
  {
    name: "iPad Pro 11 M4 256GB WiFi",
    description: "iPad Pro 11-inch chip M4, màn hình Ultra Retina XDR OLED 120Hz, hỗ trợ Apple Pencil Pro, mỏng 5.3mm.",
    price: 28990000, stock: 12, image: img("ipad-pro-m4"), category: "Electronics", rating: 4.9, sold: 120, isFeatured: true, isNew: true
  },
  {
    name: "iPad Air 11 M2 128GB WiFi",
    description: "iPad Air 11-inch chip M2, màn hình Liquid Retina, Touch ID, hỗ trợ Pencil Pro, pin 10 giờ.",
    price: 16990000, stock: 18, image: img("ipad-air-m2"), category: "Electronics", rating: 4.8, sold: 190, isFeatured: true
  },
  {
    name: "iPad Gen 10 10.9 64GB WiFi",
    description: "iPad thế hệ 10 màn 10.9-inch, chip A14, Touch ID cạnh viền, camera ngang 12MP. Phù hợp học sinh, sinh viên.",
    price: 10490000, stock: 35, image: img("ipad-gen10"), category: "Electronics", rating: 4.6, sold: 320
  },
  {
    name: "iPad mini 6 64GB WiFi",
    description: "iPad mini 8.3-inch nhỏ gọn, chip A15, màn Liquid Retina, hỗ trợ Apple Pencil 2. Mang đi mọi nơi.",
    price: 13990000, stock: 16, image: img("ipad-mini6"), category: "Electronics", rating: 4.7, sold: 150, isNew: true
  },
  {
    name: "AirPods Pro 2 USB-C",
    description: "Tai nghe Apple chống ồn chủ động 2x, chip H2, hộp sạc USB-C MagSafe, âm thanh không gian cá nhân hóa.",
    price: 5990000, stock: 50, image: img("airpods-pro2"), category: "Accessories", rating: 4.9, sold: 680, isFeatured: true
  },
  {
    name: "Tai nghe AirPods 3 Lightning",
    description: "AirPods 3 âm thanh không gian, chống mồ hôi IPX4, pin 30 giờ cùng hộp sạc. Đàm thoại rõ ràng.",
    price: 4190000, stock: 45, image: img("airpods-3"), category: "Accessories", rating: 4.7, sold: 520
  },
  {
    name: "Tai nghe AirPods Max",
    description: "Tai nghe chụp tai cao cấp Apple, chip H1, chống ồn chủ động, âm thanh Hi-Fi, đệm vải dệt thoáng khí.",
    price: 12990000, stock: 10, image: img("airpods-max"), category: "Accessories", rating: 4.8, sold: 90, isFeatured: true
  },
  {
    name: "Samsung Galaxy S25 Ultra 12/256GB",
    description: "Flagship Samsung 6.9-inch QHD+ 120Hz, Snapdragon 8 Elite, camera 200MP, bút S-Pen, pin 5000mAh, Galaxy AI.",
    price: 33990000, stock: 20, image: img("samsung-s25u"), category: "Phones", rating: 4.9, sold: 180, isFeatured: true, isNew: true
  },
  {
    name: "Samsung Galaxy Z Fold 6 12/256GB",
    description: "Điện thoại gập 7.6-inch AMOLED, Snapdragon 8 Gen 3, đa nhiệm Flex, kháng nước IPX8, Galaxy AI.",
    price: 43990000, stock: 8, image: img("samsung-fold6"), category: "Phones", rating: 4.7, sold: 60, isFeatured: true, isNew: true
  },
  {
    name: "Samsung Galaxy Z Flip 6 12/256GB",
    description: "Điện thoại gập vỏ sò 6.7-inch, màn phụ FlexWindow 3.4-inch, camera 50MP, pin 4000mAh. Nhỏ gọn thời trang.",
    price: 27990000, stock: 12, image: img("samsung-flip6"), category: "Phones", rating: 4.6, sold: 85, isNew: true
  },
  {
    name: "Samsung Galaxy Tab S9 FE 6/128GB",
    description: "Máy tính bảng Samsung 10.9-inch 90Hz, chip Exynos 1380, bút S-Pen kèm sẵn, kháng nước IP68, pin 8000mAh.",
    price: 10990000, stock: 22, image: img("samsung-tab-s9"), category: "Electronics", rating: 4.6, sold: 140
  },
  {
    name: "Samsung Galaxy Buds 2 Pro",
    description: "Tai nghe Samsung chống ồn ANC, âm thanh Hi-Fi 24bit, 3 mic đàm thoại, pin 29 giờ, kháng nước IPX7.",
    price: 2990000, stock: 55, image: img("samsung-buds2"), category: "Accessories", rating: 4.6, sold: 410
  },
  {
    name: "Samsung Galaxy Watch 6 Classic 47mm",
    description: "Đồng hồ Samsung mặt xoay, màn AMOLED, đo ECG, huyết áp, SpO2, GPS, pin 40 giờ, kháng nước 5ATM.",
    price: 7490000, stock: 28, image: img("samsung-watch6"), category: "Accessories", rating: 4.7, sold: 230, isNew: true
  },
  {
    name: "Huawei Pura 70 Ultra 16/512GB",
    description: "Flagship Huawei camera Ultra Lighting 50MP, màn 6.8-inch LTPO 120Hz, pin 5200mAh sạc nhanh 100W.",
    price: 23990000, stock: 10, image: img("huawei-pura70"), category: "Phones", rating: 4.7, sold: 70, isFeatured: true, isNew: true
  },
  {
    name: "Huawei Watch GT 4 46mm",
    description: "Đồng hồ Huawei pin 14 ngày, màn AMOLED 1.43-inch, đo nhịp tim, SpO2, 100+ chế độ thể thao, nghe gọi Bluetooth.",
    price: 4990000, stock: 32, image: img("huawei-watch-gt4"), category: "Accessories", rating: 4.6, sold: 260
  },
  {
    name: "Huawei MatePad 11.5 8/128GB",
    description: "Máy tính bảng Huawei 11.5-inch 2.2K 120Hz, chip Snapdragon 7 Gen 1, 4 loa, pin 7700mAh. Kèm bút M-Pencil.",
    price: 9990000, stock: 20, image: img("huawei-matepad"), category: "Electronics", rating: 4.5, sold: 110, isNew: true
  },
  // ---------- 5 DRONES DJI (giá tham khảo DJI Việt Nam / DJI Store) ----------
  {
    name: "DJI Mini 4 Pro (DJI RC-N2)",
    description: "Flycam siêu nhẹ dưới 249g, camera 48MP CMOS 1/1.3-inch, quay dọc 4K/60fps HDR, tránh chướng ngại vật đa hướng, ActiveTrack 360°, bay 34 phút, truyền video 20km.",
    price: 17790000, stock: 14, image: img("dji-mini4pro"), category: "Drones", rating: 4.8, sold: 160, isFeatured: true
  },
  {
    name: "DJI Mini 5 Pro (DJI RC-N3)",
    description: "Flycam mini mới 2025, cảm biến CMOS 1-inch 50MP f/1.8, gimbal xoay 225° quay dọc, LiDAR tránh vật cản ban đêm, ActiveTrack 360°, bay 36 phút, truyền video O4+ 20km.",
    price: 21990000, stock: 10, image: img("dji-mini5pro"), category: "Drones", rating: 4.9, sold: 85, isFeatured: true, isNew: true
  },
  {
    name: "DJI Air 3S (DJI RC-N3)",
    description: "Drone camera kép du lịch: góc rộng CMOS 1-inch 50MP + tele 70mm 48MP, quay 4K/120fps HDR 14 stops, LiDAR ban đêm, RTH thông minh, bay 45 phút, truyền 20km.",
    price: 25000000, stock: 12, image: img("dji-air3s"), category: "Drones", rating: 4.8, sold: 120, isFeatured: true
  },
  {
    name: "DJI Mavic 4 Pro (DJI RC 2)",
    description: "Flycam flagship 2025: camera Hasselblad 4/3 CMOS 100MP quay HDR 6K/60fps, tele kép 70mm + 168mm, gimbal xoay 360°, ActiveTrack 360°, bay 51 phút, truyền O4+ 30km.",
    price: 49990000, stock: 6, image: img("dji-mavic4pro"), category: "Drones", rating: 5.0, sold: 45, isFeatured: true, isNew: true
  },
  {
    name: "DJI Avata 2 Fly More Combo (3 pin)",
    description: "Flycam FPV nhập vai kèm kính Goggles 3 + tay RC Motion 3 + 3 pin: cảm biến 1/1.3-inch quay 4K/60fps HDR góc siêu rộng 155°, RockSteady, bảo vệ cánh liền khối, bay 23 phút.",
    price: 25990000, stock: 9, image: img("dji-avata2"), category: "Drones", rating: 4.7, sold: 95, isNew: true
  }
];

async function main() {
  console.log("Seeding database...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("123456", 10);
  await prisma.user.create({
    data: {
      fullName: "Test Customer",
      email: "customer@example.com",
      passwordHash
    }
  });
  console.log("Created test user: customer@example.com / 123456");

  for (const p of products) {
    await prisma.product.create({ data: p });
  }
  console.log(`Created ${products.length} products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
