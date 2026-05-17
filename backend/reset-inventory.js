import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.batch.updateMany({ data: { quantity: 0 } });
  await prisma.drug.updateMany({ data: { stock: 0 } });
  console.log('All quantities reset to 0 successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
