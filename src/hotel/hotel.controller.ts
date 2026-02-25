import {
  Controller, Get, Patch, Post, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@Controller('hotel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HotelController {
  constructor(private hotelService: HotelService) {}

  @Get()
  @Roles('owner')
  getHotel(@Request() req: any) {
    return this.hotelService.getHotel(req.user.hotel_id);
  }

  @Patch()
  @Roles('owner')
  updateHotel(@Request() req: any, @Body() body: any) {
    return this.hotelService.updateHotel(req.user.hotel_id, body);
  }

  @Post('staff')
  @Roles('owner')
  createStaff(@Request() req: any, @Body() body: { email: string; password: string; full_name: string }) {
    return this.hotelService.createStaff(req.user.hotel_id, body);
  }

  @Get('staff')
  @Roles('owner')
  getStaff(@Request() req: any) {
    return this.hotelService.getStaff(req.user.hotel_id);
  }

  @Delete('staff/:id')
  @Roles('owner')
  deleteStaff(@Request() req: any, @Param('id') id: string) {
    return this.hotelService.deleteStaff(req.user.hotel_id, parseInt(id));
  }
}
