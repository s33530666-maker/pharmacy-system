import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword() {
  const users = await prisma.user.findMany();
  console.log("Current users:");
  console.log(users.map(u => ({ id: u.id, name: u.name, role: u.role, password: u.password })));

  const adminUser = users.find(u => u.role === 'ADMIN');
  if (adminUser) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('5555', salt);
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: hashedPassword }
    });
    console.log(`Password for admin ${adminUser.name} has been reset to "5555"`);
  } else {
    console.log("No admin user found.");
  }
}

resetPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
