import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const email = 'me@bvaishali.com';

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`Current user: ${user.email}, role: ${user.role}`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'admin' },
    });

    console.log(`Updated user: ${updatedUser.email}, role: ${updatedUser.role}`);
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
