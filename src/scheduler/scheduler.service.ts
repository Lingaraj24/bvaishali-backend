import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';

/**
 * SchedulerService
 *
 * Runs a daily job at 8 PM IST (14:30 UTC) that:
 * 1. Finds all non-admin users whose birthday or anniversary is exactly 15 days away
 * 2. Finds all non-admin users whose birthday or anniversary is exactly 7 days away
 * 3. Generates a unique ₹250 flat discount coupon for each qualifying user
 * 4. Sends an email + WhatsApp notification with the coupon
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // 8 PM IST = 14:30 UTC
  @Cron('30 14 * * *', { timeZone: 'UTC' })
  async handleCelebrationReminders() {
    this.logger.log('Running birthday/anniversary coupon reminder job');

    await Promise.allSettled([
      this.processOccasion('dateOfBirth', 'birthday', 15),
      this.processOccasion('dateOfBirth', 'birthday', 7),
      this.processOccasion('anniversaryDate', 'anniversary', 15),
      this.processOccasion('anniversaryDate', 'anniversary', 7),
    ]);
  }

  private async processOccasion(
    field: 'dateOfBirth' | 'anniversaryDate',
    occasion: 'birthday' | 'anniversary',
    daysAhead: number,
  ) {
    let users: Array<{
      id: string;
      email: string | null;
      phone: string | null;
      first_name: string | null;
      alternate_phone: string | null;
    }>;

    try {
      users = await this.usersService.findUsersWithUpcomingDate(field, daysAhead);
    } catch (err) {
      this.logger.error(`Failed to query users for ${field} in ${daysAhead} days`, err);
      return;
    }

    this.logger.log(
      `Found ${users.length} user(s) with ${occasion} in ${daysAhead} days`,
    );

    for (const user of users) {
      try {
        const couponCode = await this.createCelebrationCoupon(user.id, occasion, daysAhead);

        // Send email
        if (user.email) {
          await this.emailService.sendCelebrationCoupon(
            user.email,
            user.first_name || 'Valued Customer',
            occasion,
            daysAhead,
            couponCode,
          );
        }

        // Send WhatsApp
        const phone = user.alternate_phone || user.phone;
        if (phone) {
          await this.sendWhatsAppCelebration(phone, user.first_name || 'Valued Customer', occasion, daysAhead, couponCode);
        }
      } catch (err) {
        this.logger.error(`Failed to process celebration for user ${user.id}`, err);
      }
    }
  }

  /**
   * Creates a unique ₹250 flat discount code for the user.
   * Valid for 30 days, limited to 1 use, min order ₹999.
   * Uses upsert so re-runs on same day don't create duplicates.
   */
  private async createCelebrationCoupon(
    userId: string,
    occasion: string,
    daysAhead: number,
  ): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = userId.slice(-6).toUpperCase();
    const code = `${occasion === 'birthday' ? 'BDAY' : 'ANNIV'}${daysAhead}D${suffix}${today}`;

    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    // Upsert: create only if code doesn't already exist
    await this.prisma.discountCode.upsert({
      where: { code },
      update: {},
      create: {
        code,
        discountType: 'flat',
        discountValue: 250,
        minOrderValue: 999,
        maxDiscountCap: null,
        usageLimit: 1,
        perUserLimit: 1,
        validFrom,
        validUntil,
        isActive: true,
        createdBy: 'system',
      },
    });

    return code;
  }

  private async sendWhatsAppCelebration(
    phone: string,
    firstName: string,
    occasion: 'birthday' | 'anniversary',
    daysAhead: number,
    couponCode: string,
  ) {
    const apiUrl = this.config.get<string>('WATI_API_URL');
    const apiKey = this.config.get<string>('WATI_API_KEY');
    const template = this.config.get<string>('WATI_CELEBRATION_TEMPLATE', 'celebration_coupon');

    if (!apiUrl || !apiKey) {
      this.logger.warn('WATI not configured — WhatsApp celebration skipped');
      return;
    }

    const normalised = phone.replace(/\D/g, '').replace(/^0+/, '');
    const e164 = normalised.startsWith('91') ? normalised : `91${normalised}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${e164}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          template_name: template,
          broadcast_name: `${occasion}_${daysAhead}d_${e164}`,
          parameters: [
            { name: 'first_name', value: firstName },
            { name: 'occasion', value: occasion === 'birthday' ? 'birthday' : 'anniversary' },
            { name: 'days_ahead', value: String(daysAhead) },
            { name: 'coupon_code', value: couponCode },
            { name: 'discount_amount', value: '₹250' },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`WhatsApp celebration send failed (${res.status}): ${body}`);
      } else {
        this.logger.log(`WhatsApp celebration sent to ${e164}`);
      }
    } catch (err) {
      this.logger.error('WhatsApp celebration HTTP error', err);
    }
  }
}
