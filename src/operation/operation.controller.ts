import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OperationService } from './operation.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('operation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationController {
  constructor(private operationService: OperationService) {}

  @Get('room/:qrToken')
  @Roles('owner', 'staff')
  getRoomByQr(@Request() req: any, @Param('qrToken') qrToken: string) {
    return this.operationService.getRoomByQr(qrToken, req.user.hotel_id);
  }

  @Post('log')
  @Roles('owner', 'staff')
  @UseGuards(SubscriptionGuard)
  createLog(
    @Request() req: any,
    @Body()
    body: {
      booking_id: number;
      pet_id?: number;
      action_type: string;
      description?: string;
      image_url?: string;
    },
  ) {
    return this.operationService.createLog(req.user.id, body);
  }

  @Get('logs/:bookingId')
  @Roles('owner', 'staff')
  getLogs(@Param('bookingId') bookingId: string) {
    return this.operationService.getLogs(parseInt(bookingId));
  }

  @Patch('extend/:bookingId')
  @Roles('owner', 'staff')
  extendBooking(
    @Param('bookingId') bookingId: string,
    @Body() body: { expected_checkout: string },
  ) {
    return this.operationService.extendBooking(
      parseInt(bookingId),
      body.expected_checkout,
    );
  }
}
