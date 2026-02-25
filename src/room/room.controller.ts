import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Get()
  @Roles('owner', 'staff')
  getRooms(@Request() req: any) {
    return this.roomService.getRooms(req.user.hotel_id);
  }

  @Post('bulk')
  @Roles('owner')
  @UseGuards(SubscriptionGuard)
  createBulk(@Request() req: any, @Body() body: { count: number }) {
    return this.roomService.createBulk(req.user.hotel_id, body.count);
  }

  @Post()
  @Roles('owner')
  @UseGuards(SubscriptionGuard)
  createOne(@Request() req: any, @Body() body: { room_name: string }) {
    return this.roomService.createOne(req.user.hotel_id, body.room_name);
  }

  @Patch(':id')
  @Roles('owner')
  @UseGuards(SubscriptionGuard)
  update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.roomService.update(req.user.hotel_id, parseInt(id), body);
  }

  @Delete(':id')
  @Roles('owner')
  @UseGuards(SubscriptionGuard)
  delete(@Request() req: any, @Param('id') id: string) {
    return this.roomService.delete(req.user.hotel_id, parseInt(id));
  }
}
