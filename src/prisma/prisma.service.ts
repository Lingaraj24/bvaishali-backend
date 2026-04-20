import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv'; // 1. Add this import

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    dotenv.config(); // 2. Add this line here to ensure variables are loaded
    
    const connectionString = process.env.DATABASE_URL;
    
    // Safety check: log if the URL is missing (useful for debugging logs)
    if (!connectionString || connectionString === 'base') {
       console.error("CRITICAL: DATABASE_URL is missing or set to 'base'");
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  // ... rest of your code
}
