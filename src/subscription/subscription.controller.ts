import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionController {
  constructor(private subService: SubscriptionService) {}

  @Get()
  @Roles('owner')
  getSubscription(@Request() req: any) {
    return this.subService.getSubscription(req.user.hotel_id);
  }
}
