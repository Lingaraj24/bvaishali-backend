require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding admin user...');
  const passwordHash = await argon2.hash('Password@123');
  
  const admin = await prisma.user.upsert({
    where: { email: 'me@bvaishali.com' },
    update: {
      passwordHash,
      role: 'admin',
      isVerified: true
    },
    create: {
      email: 'me@bvaishali.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isVerified: true,
      authProvider: 'email'
    }
  });

  console.log('Admin user seeded:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
