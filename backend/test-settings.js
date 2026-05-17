import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.systemSettings.create({ data: { lowStockThreshold: 5 }});
  console.log('Settings:', settings);
}
main().catch(console.error).finally(() => prisma.$disconnect());
