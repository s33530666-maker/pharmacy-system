const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumn() {
  try {
    await prisma.$connect();
    console.log('Connected to DB');

    // Check if column exists
    const result = await prisma.$queryRaw`PRAGMA table_info(SaleItem)`;
    const hasReturnedQty = result.some(col => col.name === 'returnedQty');

    if (!hasReturnedQty) {
      await prisma.$executeRaw`ALTER TABLE SaleItem ADD COLUMN returnedQty INTEGER DEFAULT 0`;
      console.log('Column returnedQty added successfully');
    } else {
      console.log('Column returnedQty already exists');
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

addColumn();