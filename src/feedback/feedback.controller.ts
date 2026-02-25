import { Controller, Post, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  // Owner submits feedback
  @Post()
  @UseGuards(JwtAuthGuard)
  submit(@Request() req: any, @Body() body: { message: string; type?: string }) {
    return this.feedbackService.submit({
      message: body.message,
      type: body.type || 'suggestion',
      user_id: req.user.id,
      hotel_id: req.user.hotel_id,
    });
  }

  // Admin gets all feedback
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAll() {
    return this.feedbackService.getAll();
  }

  // Admin marks feedback as read
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  markAsRead(@Param('id') id: string) {
    return this.feedbackService.markAsRead(parseInt(id));
  }

  // Admin gets unread count
  @Get('unread-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getUnreadCount() {
    return this.feedbackService.getUnreadCount();
  }
}
