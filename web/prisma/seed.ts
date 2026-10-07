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
