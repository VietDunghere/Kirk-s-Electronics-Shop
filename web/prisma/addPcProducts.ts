// Adds the PC / gaming products that are not in the database yet. Nothing is deleted: orders, carts and users stay.
import { PrismaClient } from "@prisma/client";
import { PC_PRODUCTS } from "./pcProducts";

const prisma = new PrismaClient();

async function main() {
  let added = 0;
  for (const p of PC_PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (exists) continue;
    await prisma.product.create({ data: p });
    added++;
  }
  console.log(`Added ${added} products (${PC_PRODUCTS.length - added} already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
