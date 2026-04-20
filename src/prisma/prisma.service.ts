import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    dotenv.config();
    
    // Strip sslmode from the URL — pg parses it from the connection string
    // and it overrides the ssl object below, causing cert verification to fail.
    const rawUrl = new URL(process.env.DATABASE_URL!);
    rawUrl.searchParams.delete('sslmode');

    const pool = new Pool({
      connectionString: rawUrl.toString(),
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
    });
  }

  // --- THESE WERE MISSING OR OUTSIDE THE CLASS ---
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
