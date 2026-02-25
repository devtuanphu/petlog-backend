import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // Public: get pricing plans
  @Get('plans')
  getPlans() {
    return this.paymentService.getActivePlans();
  }

  // Owner: calculate upgrade cost (prorated)
  @Get('upgrade-cost')
  @UseGuards(JwtAuthGuard)
  calculateUpgrade(
    @Request() req: any,
    @Query('plan') plan: string,
  ) {
    return this.paymentService.calculateUpgrade(req.user.hotel_id, plan);
  }

  // Owner: create payment link (new or upgrade)
  @Post('create')
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Request() req: any,
    @Body() body: { plan: string; months?: number; upgrade?: boolean },
  ) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return this.paymentService.createPaymentLink(
      req.user.hotel_id,
      body.plan,
      body.months || 1,
      `${baseUrl}/dashboard/pricing?status=success`,
      `${baseUrl}/dashboard/pricing?status=cancel`,
      body.upgrade || false,
    );
  }

  // PayOS webhook (NO AUTH — PayOS calls this)
  @Post('webhook')
  handleWebhook(@Body() body: any) {
    return this.paymentService.handleWebhook(body);
  }

  // Check payment status after return from PayOS
  @Get('check')
  @UseGuards(JwtAuthGuard)
  checkPayment(@Query('orderCode') orderCode: string) {
    return this.paymentService.handlePaymentReturn(parseInt(orderCode));
  }

  // Owner: payment history
  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@Request() req: any) {
    return this.paymentService.getPaymentHistory(req.user.hotel_id);
  }
}
