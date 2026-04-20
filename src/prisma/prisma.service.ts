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
    
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString,
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
