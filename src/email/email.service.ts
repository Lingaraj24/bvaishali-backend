import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend | null;
  private readonly from = 'B Vaishali <noreply@bvaishali.com>';
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set — emails will be skipped');
    }
  }

  private get isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendPasswordResetOtp(email: string, firstName: string, otp: string): Promise<void> {
    if (!this.isConfigured) return;
    try {
      await this.resend!.emails.send({
        from: this.from,
        to: [email],
        subject: 'Your password reset code — B Vaishali',
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Georgia, serif; background: #faf9f7; margin: 0; padding: 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #e8e0d5; border-radius: 4px;">
                <tr>
                  <td style="padding: 40px 48px 32px;">
                    <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #9b8e7e; margin: 0 0 24px;">B Vaishali</p>
                    <h1 style="font-size: 22px; font-weight: 400; color: #1a1816; margin: 0 0 16px;">Password Reset</h1>
                    <p style="color: #5a5248; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                      Hello ${firstName},<br><br>
                      Use the code below to reset your password. It expires in <strong>10 minutes</strong>.
                    </p>
                    <div style="background: #f5f1ec; border-radius: 4px; padding: 24px; text-align: center; margin-bottom: 32px;">
                      <span style="font-family: monospace; font-size: 36px; letter-spacing: 8px; color: #1a1816; font-weight: 500;">${otp}</span>
                    </div>
                    <p style="color: #9b8e7e; font-size: 13px; line-height: 1.6; margin: 0;">
                      If you did not request a password reset, please ignore this email — your account is safe.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px; border-top: 1px solid #e8e0d5;">
                    <p style="color: #bdb5ab; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} B Vaishali. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err);
    }
  }

  async sendCelebrationCoupon(
    email: string,
    firstName: string,
    occasion: 'birthday' | 'anniversary',
    daysAhead: number,
    couponCode: string,
  ): Promise<void> {
    if (!this.isConfigured) return;
    const occasionLabel = occasion === 'birthday' ? 'Birthday' : 'Anniversary';
    const greeting =
      occasion === 'birthday'
        ? `Wishing you a wonderful birthday ahead!`
        : `Wishing you a joyous anniversary celebration!`;
    const timing = daysAhead === 15 ? 'two weeks away' : 'just a week away';

    try {
      await this.resend!.emails.send({
        from: this.from,
        to: [email],
        subject: `Your ${occasionLabel} gift from B Vaishali — ₹250 off`,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Georgia, serif; background: #faf9f7; margin: 0; padding: 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background: #fff; border: 1px solid #e8e0d5; border-radius: 4px;">
                <tr>
                  <td style="padding: 40px 48px 32px;">
                    <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #9b8e7e; margin: 0 0 24px;">B Vaishali</p>
                    <h1 style="font-size: 22px; font-weight: 400; color: #1a1816; margin: 0 0 8px;">
                      A little gift for your ${occasionLabel} 🎁
                    </h1>
                    <p style="color: #5a5248; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                      Dear ${firstName},<br><br>
                      Your ${occasionLabel.toLowerCase()} is ${timing}. ${greeting}<br><br>
                      To make your special day even more memorable, here is a <strong>₹250 off</strong> coupon — our treat for you.
                    </p>
                    <div style="background: #f5f1ec; border: 2px dashed #c8a882; border-radius: 4px; padding: 24px; text-align: center; margin-bottom: 32px;">
                      <p style="color: #9b8e7e; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">Your coupon code</p>
                      <span style="font-family: monospace; font-size: 28px; letter-spacing: 6px; color: #B2351F; font-weight: 600;">${couponCode}</span>
                      <p style="color: #9b8e7e; font-size: 12px; margin: 12px 0 0;">₹250 off on your next order · Valid for 30 days</p>
                    </div>
                    <p style="color: #5a5248; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                      Shop our latest collections and apply your code at checkout. Treat yourself — you deserve it!
                    </p>
                    <a href="https://bvaishali.com/designs" style="display: inline-block; background: #1a1816; color: #fff; text-decoration: none; padding: 14px 32px; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; border-radius: 2px;">Shop Now</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px; border-top: 1px solid #e8e0d5;">
                    <p style="color: #9b8e7e; font-size: 12px; margin: 0 0 4px;">Minimum order value: ₹999. One use per customer.</p>
                    <p style="color: #bdb5ab; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} B Vaishali. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send celebration email to ${email}`, err);
    }
  }

  async sendOrderConfirmation(
    email: string,
    firstName: string,
    order: {
      orderNumber: string;
      totalAmount: number | string;
      razorpayPaymentId?: string;
      items: Array<{ snapshotName: string; quantity: number; unitPrice: number | string }>;
    },
  ): Promise<void> {
    if (!this.isConfigured) return;
    const fmt = (n: number | string) =>
      `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

    const itemRows = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0ebe4; color: #3d3730; font-size: 14px;">${item.snapshotName}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0ebe4; color: #5a5248; font-size: 14px; text-align: center;">×${item.quantity}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0ebe4; color: #3d3730; font-size: 14px; text-align: right;">${fmt(Number(item.unitPrice) * item.quantity)}</td>
        </tr>`,
      )
      .join('');

    try {
      await this.resend!.emails.send({
        from: this.from,
        to: [email],
        subject: `Order confirmed — ${order.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: Georgia, serif; background: #faf9f7; margin: 0; padding: 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background: #fff; border: 1px solid #e8e0d5; border-radius: 4px;">
                <tr>
                  <td style="padding: 40px 48px 32px;">
                    <p style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #9b8e7e; margin: 0 0 24px;">B Vaishali</p>
                    <h1 style="font-size: 22px; font-weight: 400; color: #1a1816; margin: 0 0 8px;">Thank you, ${firstName}.</h1>
                    <p style="color: #5a5248; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                      Your order has been confirmed. We'll notify you once it's dispatched.
                    </p>

                    <div style="background: #f5f1ec; border-radius: 4px; padding: 16px 20px; margin-bottom: 32px; display: flex; justify-content: space-between;">
                      <span style="color: #9b8e7e; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Order</span>
                      <span style="color: #1a1816; font-size: 14px; font-family: monospace;">${order.orderNumber}</span>
                    </div>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <thead>
                        <tr>
                          <th style="text-align: left; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #9b8e7e; padding-bottom: 8px; border-bottom: 1px solid #e8e0d5; font-weight: 400;">Item</th>
                          <th style="text-align: center; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #9b8e7e; padding-bottom: 8px; border-bottom: 1px solid #e8e0d5; font-weight: 400;">Qty</th>
                          <th style="text-align: right; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #9b8e7e; padding-bottom: 8px; border-bottom: 1px solid #e8e0d5; font-weight: 400;">Price</th>
                        </tr>
                      </thead>
                      <tbody>${itemRows}</tbody>
                      <tfoot>
                        <tr>
                          <td colspan="2" style="padding-top: 16px; font-size: 14px; color: #1a1816; font-weight: 600;">Total</td>
                          <td style="padding-top: 16px; font-size: 16px; color: #1a1816; font-weight: 600; text-align: right;">${fmt(order.totalAmount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 48px; border-top: 1px solid #e8e0d5;">
                    <p style="color: #9b8e7e; font-size: 13px; margin: 0 0 8px;">Questions? Reply to this email or reach us on WhatsApp.</p>
                    <p style="color: #bdb5ab; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} B Vaishali. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send order confirmation email to ${email}`, err);
    }
  }
}
