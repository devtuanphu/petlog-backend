import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get()
  @Roles('owner', 'staff')
  getBookings(@Request() req: any, @Query('status') status?: string) {
    return this.bookingService.getBookings(req.user.hotel_id, status);
  }

  @Patch(':id/checkout')
  @Roles('owner', 'staff')
  @UseGuards(SubscriptionGuard)
  checkout(@Request() req: any, @Param('id') id: string) {
    return this.bookingService.checkout(req.user.hotel_id, parseInt(id));
  }
}
