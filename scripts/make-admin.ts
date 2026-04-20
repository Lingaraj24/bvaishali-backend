import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const rawUrl = new URL(process.env.DATABASE_URL!);
  rawUrl.searchParams.delete('sslmode');
  const pool = new Pool({ connectionString: rawUrl.toString(), ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as any);
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
