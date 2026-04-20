/**
 * One-off script: update admin passwords to Pa55word@098
 * Run: npx ts-node -r tsconfig-paths/register scripts/update-admin-passwords.ts
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const newHash = await argon2.hash('Pa55word@098');

  const emails = ['me@bvaishali.com', 'lingarajmahanta24@gmail.com'];

  for (const email of emails) {
    const result = await prisma.user.updateMany({
      where: { email },
      data: { passwordHash: newHash, role: 'admin', isVerified: true },
    });
    if (result.count > 0) {
      console.log(`✓ Updated: ${email}`);
    } else {
      // User doesn't exist yet — create them
      await prisma.user.create({
        data: {
          email,
          passwordHash: newHash,
          firstName: email === 'me@bvaishali.com' ? 'Vaishali' : 'Lingaraj',
          lastName:  email === 'me@bvaishali.com' ? 'B' : 'Mahanta',
          role: 'admin',
          authProvider: 'email',
          isVerified: true,
        },
      });
      console.log(`✓ Created: ${email}`);
    }
  }

  console.log('\nDone. Login with Pa55word@098');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
