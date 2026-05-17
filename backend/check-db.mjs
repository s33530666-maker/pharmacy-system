import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log('Users in DB:');
  for (const user of users) {
    console.log(`- ${user.name} (role: ${user.role})`);
    console.log(`  Hash: ${user.password}`);
    // test password 'Admin@2024' or any common test password? Let's not guess the password but see if it exists.
  }
}
check().finally(() => prisma.$disconnect());
