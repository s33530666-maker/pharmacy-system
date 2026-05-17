import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDb() {
  await prisma.saleItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.auditLog.deleteMany({});
  const deleted = await prisma.user.deleteMany({});
  console.log(`✅ Deleted ${deleted.count} users. Database is clear and ready for setup wizard.`);
}

clearDb().catch(console.error).finally(() => prisma.$disconnect());
