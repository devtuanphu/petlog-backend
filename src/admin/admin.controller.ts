import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private activityLogService: ActivityLogService,
  ) {}

  // ─── Auth (no guard) ───
  @Post('auth/login')
  login(@Body() body: { email: string; password: string }) {
    return this.adminService.login(body.email, body.password);
  }

  // ─── Protected endpoints ───
  @Get('auth/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMe(@Request() req: any) {
    return this.adminService.getMe(req.user.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/charts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getChartData() {
    return this.adminService.getChartData();
  }

  @Get('hotels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getHotels() {
    return this.adminService.getHotels();
  }

  @Get('hotels/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getHotel(@Param('id') id: string) {
    return this.adminService.getHotelById(parseInt(id));
  }

  @Get('hotels/:id/payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getHotelPayments(@Param('id') id: string) {
    return this.adminService.getPaymentsByHotel(parseInt(id));
  }

  @Get('bookings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getBookingDetail(@Param('id') id: string) {
    return this.adminService.getBookingDetail(parseInt(id));
  }

  @Patch('hotels/:id/subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateSubscription(
    @Param('id') id: string,
    @Body() body: { plan?: string; max_rooms?: number; extra_rooms?: number; is_active?: boolean },
  ) {
    return this.adminService.updateSubscription(parseInt(id), body);
  }

  // ─── Plans CRUD ───
  @Get('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getPlans() {
    return this.adminService.getPlans();
  }

  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createPlan(@Body() body: { name: string; display_name: string; price: number; max_rooms: number; description?: string; sort_order?: number }) {
    return this.adminService.createPlan(body);
  }

  @Patch('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updatePlan(@Param('id') id: string, @Body() body: { display_name?: string; price?: number; max_rooms?: number; description?: string; is_active?: boolean; sort_order?: number }) {
    return this.adminService.updatePlan(parseInt(id), body);
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deletePlan(@Param('id') id: string) {
    return this.adminService.deletePlan(parseInt(id));
  }

  // ─── System Config ───
  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getConfigs() {
    return this.adminService.getConfigs();
  }

  @Patch('config/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateConfig(@Param('key') key: string, @Body() body: { value: string }) {
    return this.adminService.updateConfig(key, body.value);
  }

  // ─── Payments / Revenue ───
  @Get('payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getPayments() {
    return this.adminService.getPayments();
  }

  @Get('revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getRevenue() {
    return this.adminService.getRevenue();
  }

  // ─── Activity Logs ───
  @Get('activity-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('hotelId') hotelId?: string,
    @Query('action') action?: string,
  ) {
    return this.activityLogService.getRecentLogs({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      hotelId: hotelId ? parseInt(hotelId) : undefined,
      action: action || undefined,
    });
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAlerts() {
    return this.activityLogService.getSmartAlerts();
  }
}
