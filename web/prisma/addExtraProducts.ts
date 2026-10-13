// Adds the extra demo catalogue without changing existing products or orders.
import { PrismaClient } from "@prisma/client";
import { EXTRA_PRODUCTS } from "./extraProducts";

const prisma = new PrismaClient();

async function main() {
  let added = 0;
  for (const product of EXTRA_PRODUCTS) {
    const existing = await prisma.product.findFirst({ where: { name: product.name }, select: { id: true } });
    if (existing) continue;
    await prisma.product.create({ data: product });
    added++;
  }
  console.log(`Added ${added} products; ${EXTRA_PRODUCTS.length - added} already existed.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
