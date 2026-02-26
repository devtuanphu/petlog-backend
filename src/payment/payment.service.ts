import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PayOS } = require('@payos/node');
import { Payment } from '../entities/payment.entity';
import { PricingPlan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { SystemConfig } from '../entities/system-config.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger('PaymentService');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private payos: any;

  constructor(
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(PricingPlan) private planRepo: Repository<PricingPlan>,
    @InjectRepository(Subscription) private subRepo: Repository<Subscription>,
    @InjectRepository(SystemConfig)
    private configRepo: Repository<SystemConfig>,
  ) {
    const clientId = process.env.PAYOS_CLIENT_ID || '';
    const apiKey = process.env.PAYOS_API_KEY || '';
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

    if (clientId && apiKey && checksumKey) {
      this.payos = new PayOS({ clientId, apiKey, checksumKey });
      this.logger.log('✅ PayOS initialized');
    } else {
      this.logger.warn('⚠️ PayOS credentials not set — payment disabled');
    }
  }

  // ─── Plans ───
  async getActivePlans() {
    return this.planRepo.find({
      where: { is_active: true },
      order: { sort_order: 'ASC' },
    });
  }

  // ─── Calculate Upgrade Cost (Prorated) ───
  async calculateUpgrade(hotelId: number, newPlanName: string) {
    const sub = await this.subRepo.findOne({ where: { hotel_id: hotelId } });
    if (!sub) throw new NotFoundException('Subscription không tồn tại');

    const newPlan = await this.planRepo.findOne({
      where: { name: newPlanName, is_active: true },
    });
    if (!newPlan) throw new NotFoundException('Gói mới không tồn tại');

    const currentPlan = await this.planRepo.findOne({
      where: { name: sub.plan },
    });

    // If trial/free → full price (no proration)
    if (sub.plan === 'trial' || sub.plan === 'free' || !sub.expires_at) {
      return {
        type: 'new' as const,
        current_plan: sub.plan,
        new_plan: newPlanName,
        new_plan_display: newPlan.display_name,
        new_price: newPlan.price,
        current_price: 0,
        days_remaining: 0,
        total_days: 30,
        prorated_amount: 0,
        amount: newPlan.price, // Full price for 1 month
        message: `Đăng ký gói ${newPlan.display_name}`,
      };
    }

    // Paid plan → calculate prorated upgrade
    const now = new Date();
    const expiresAt = new Date(sub.expires_at);
    const startedAt = new Date(sub.started_at);

    const totalDays = Math.max(
      1,
      Math.ceil(
        (expiresAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );

    if (daysRemaining <= 0) {
      // Expired → full price
      return {
        type: 'new' as const,
        current_plan: sub.plan,
        new_plan: newPlanName,
        new_plan_display: newPlan.display_name,
        new_price: newPlan.price,
        current_price: currentPlan?.price || 0,
        days_remaining: 0,
        total_days: totalDays,
        prorated_amount: 0,
        amount: newPlan.price,
        message: `Gói hiện tại đã hết hạn. Đăng ký gói ${newPlan.display_name} mới.`,
      };
    }

    // Prorated calculation:
    // Amount = (newPrice - oldPrice) × (daysRemaining / totalDays)
    const currentPrice = currentPlan?.price || 0;
    const priceDiff = newPlan.price - currentPrice;

    if (priceDiff <= 0) {
      throw new BadRequestException(
        'Không thể hạ gói. Vui lòng chờ gói hiện tại hết hạn.',
      );
    }

    const proratedAmount = Math.ceil(priceDiff * (daysRemaining / totalDays));
    // Round to nearest 1000 VND
    const roundedAmount = Math.ceil(proratedAmount / 1000) * 1000;

    return {
      type: 'upgrade' as const,
      current_plan: sub.plan,
      new_plan: newPlanName,
      new_plan_display: newPlan.display_name,
      new_price: newPlan.price,
      current_price: currentPrice,
      days_remaining: daysRemaining,
      total_days: totalDays,
      prorated_amount: roundedAmount,
      amount: roundedAmount,
      expires_at: sub.expires_at,
      message: `Nâng cấp: chênh lệch ${(roundedAmount / 1000).toFixed(0)}k cho ${daysRemaining} ngày còn lại. Ngày hết hạn giữ nguyên.`,
    };
  }

  // ─── Create Payment Link ───
  async createPaymentLink(
    hotelId: number,
    planName: string,
    months: number,
    returnUrl: string,
    cancelUrl: string,
    isUpgrade = false,
  ) {
    if (!this.payos) {
      throw new BadRequestException('PayOS chưa được cấu hình');
    }

    const plan = await this.planRepo.findOne({
      where: { name: planName, is_active: true },
    });
    if (!plan) throw new NotFoundException('Gói không tồn tại');

    let amount: number;
    let description: string;
    let upgradeKeepExpiry = false;

    if (isUpgrade) {
      // Prorated upgrade
      const calc = await this.calculateUpgrade(hotelId, planName);
      amount = calc.amount;
      description = `PetLog up ${planName}`;
      upgradeKeepExpiry = calc.type === 'upgrade';
    } else {
      // Normal purchase
      const discount = months === 12 ? 0.9 : 1;
      amount = Math.ceil((plan.price * months * discount) / 1000) * 1000;
      description = `PetLog ${planName} ${months}T`;
    }

    if (amount <= 0) {
      // Free upgrade (e.g. same price) → activate directly
      await this.activateSubscription(
        hotelId,
        planName,
        isUpgrade ? 0 : months,
        upgradeKeepExpiry,
      );
      return { checkoutUrl: `${returnUrl}`, orderCode: 0, amount: 0 };
    }

    const orderCode = Date.now();

    const paymentData = {
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
      items: [
        {
          name: isUpgrade
            ? `Nâng cấp → ${plan.display_name}`
            : `${plan.display_name} x ${months} tháng`,
          quantity: 1,
          price: amount,
        },
      ],
    };

    this.logger.log(`📤 Creating PayOS payment: orderCode=${orderCode}, amount=${amount}, plan=${planName}`);

    let response: { checkoutUrl: string };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      response = await this.payos.paymentRequests.create(paymentData);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number; body?: unknown };
      this.logger.error(`❌ PayOS error: ${e.message}`, JSON.stringify(e.body || e));
      throw new BadRequestException(`Lỗi tạo link thanh toán: ${e.message || 'PayOS error'}`);
    }

    // Save payment record
    const payment = this.paymentRepo.create({
      hotel_id: hotelId,
      order_code: orderCode,
      amount,
      plan_name: planName,
      months: isUpgrade ? 0 : months, // 0 = upgrade (keep expiry)
      status: 'pending',
      checkout_url: response.checkoutUrl,
      payos_data: response as unknown as Record<string, unknown>,
    });
    await this.paymentRepo.save(payment);

    return {
      checkoutUrl: response.checkoutUrl,
      orderCode,
      amount,
    };
  }

  // ─── Handle Webhook ───
  async handleWebhook(webhookData: Record<string, unknown>) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const verifiedData = await this.payos.webhooks.verify(webhookData);

      if (!verifiedData) {
        this.logger.warn('Invalid webhook signature');
        return { success: false };
      }

      const orderCode = verifiedData.orderCode;
      const payment = await this.paymentRepo.findOne({
        where: { order_code: orderCode },
      });

      if (!payment) {
        this.logger.warn(`Payment not found for orderCode: ${orderCode}`);
        return { success: false };
      }

      if (payment.status === 'paid') {
        return { success: true }; // Already processed
      }

      // Update payment
      payment.status = 'paid';
      payment.paid_at = new Date();
      payment.payos_data = verifiedData as unknown as Record<string, unknown>;
      await this.paymentRepo.save(payment);

      // Activate — months=0 means upgrade (keep expiry)
      const isUpgrade = payment.months === 0;
      await this.activateSubscription(
        payment.hotel_id,
        payment.plan_name,
        payment.months,
        isUpgrade,
      );

      this.logger.log(
        `✅ Payment confirmed: hotel=${payment.hotel_id}, plan=${payment.plan_name}, ${isUpgrade ? 'UPGRADE' : `${payment.months}m`}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error('Webhook processing error:', error);
      return { success: false };
    }
  }

  // ─── Handle Return URL (check payment status) ───
  async handlePaymentReturn(orderCode: number) {
    const payment = await this.paymentRepo.findOne({
      where: { order_code: orderCode },
    });
    if (!payment) throw new NotFoundException('Thanh toán không tìm thấy');

    if (this.payos) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const info = await this.payos.paymentRequests.get(orderCode);
        if (info.status === 'PAID' && payment.status !== 'paid') {
          payment.status = 'paid';
          payment.paid_at = new Date();
          await this.paymentRepo.save(payment);

          const isUpgrade = payment.months === 0;
          await this.activateSubscription(
            payment.hotel_id,
            payment.plan_name,
            payment.months,
            isUpgrade,
          );
        }
      } catch {
        // PayOS info fetch failed, rely on webhook
      }
    }

    return payment;
  }

  // ─── Activate Subscription ───
  private async activateSubscription(
    hotelId: number,
    planName: string,
    months: number,
    keepExpiry = false,
  ) {
    const plan = await this.planRepo.findOne({ where: { name: planName } });
    if (!plan) return;

    let sub = await this.subRepo.findOne({ where: { hotel_id: hotelId } });
    if (!sub) {
      sub = this.subRepo.create({ hotel_id: hotelId });
    }

    sub.plan = planName;
    sub.max_rooms = plan.max_rooms;
    sub.is_active = true;

    if (keepExpiry) {
      // Upgrade: keep the same expires_at, just change plan & max_rooms
      this.logger.log(
        `↗️ Upgrade: hotel=${hotelId} → ${planName}, keeping expires_at=${sub.expires_at?.toISOString()}`,
      );
    } else {
      // New purchase or renewal: set new expiry (1 month = 30 days)
      sub.started_at = new Date();
      const daysToAdd = (months || 1) * 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysToAdd);
      sub.expires_at = expiresAt;
    }

    await this.subRepo.save(sub);
  }

  // ─── Payment History ───
  async getPaymentHistory(hotelId: number) {
    return this.paymentRepo.find({
      where: { hotel_id: hotelId },
      order: { created_at: 'DESC' },
    });
  }

  // ─── Config helpers ───
  async getTrialDays(): Promise<number> {
    const config = await this.configRepo.findOne({
      where: { key: 'trial_days' },
    });
    return config ? parseInt(config.value) : 14;
  }
}
