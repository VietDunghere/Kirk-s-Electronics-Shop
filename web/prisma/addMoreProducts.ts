// Adds the 21 extra products (and fixes the Galaxy Tab S9 FE photo) without touching users, carts or orders.
// Running it again only refreshes the photo paths of products that already exist.
import { PrismaClient } from "@prisma/client";
import { MORE_PRODUCTS, TAB_S9_FE_IMAGE, TAB_S9_FE_NAME } from "./moreProducts";

const prisma = new PrismaClient();

async function main() {
  let added = 0;
  for (const p of MORE_PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { name: p.name }, select: { id: true } });
    if (exists) {
      await prisma.product.update({ where: { id: exists.id }, data: { image: p.image } }); // keep the photo path in sync
      continue;
    }
    await prisma.product.create({ data: p });
    added++;
  }
  const fixed = await prisma.product.updateMany({ where: { name: TAB_S9_FE_NAME }, data: { image: TAB_S9_FE_IMAGE } });
  console.log(`Added ${added} products (${MORE_PRODUCTS.length - added} already existed). Tab S9 FE photo updated: ${fixed.count}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
