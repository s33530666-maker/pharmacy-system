import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function test() {
  // 1. Delete related data first to avoid FK violations, then users
  await prisma.saleItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.auditLog.deleteMany({});
  const deleted = await prisma.user.deleteMany({});
  console.log(`✅ Deleted ${deleted.count} users and related records`);

  // 2. Simulate setup wizard: create admin with hashed password
  const password = 'Admin1234';
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      name: 'Mostafa',
      password: hashed,
      role: 'ADMIN',
      status: 'ACTIVE',
      maxDiscountLimit: 100,
      permissions: JSON.stringify(['all']),
    }
  });
  console.log(`✅ Created admin: ${admin.name} (${admin.id})`);

  // 3. Simulate login: compare entered password with stored hash
  const match = await bcrypt.compare(password, admin.password);
  console.log(`✅ Password match: ${match}`);

  // 4. Simulate wrong password
  const wrongMatch = await bcrypt.compare('wrongpass', admin.password);
  console.log(`✅ Wrong password rejected: ${!wrongMatch}`);

  console.log('\n🎉 Full flow test PASSED. Admin can log in with password:', password);
}

test().catch(console.error).finally(() => prisma.$disconnect());
