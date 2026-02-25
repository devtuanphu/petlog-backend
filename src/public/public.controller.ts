import { Controller, Get, Post, Param, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
    };
  }

  @Get('room/:qrToken')
  getRoomInfo(@Param('qrToken') qrToken: string) {
    return this.publicService.getRoomInfo(qrToken);
  }

  @Post('checkin/:qrToken')
  checkin(
    @Param('qrToken') qrToken: string,
    @Body()
    body: {
      owner_name: string;
      owner_phone: string;
      expected_checkout?: string;
      pets: { name: string; type?: string; image_url?: string; special_notes?: string }[];
    },
  ) {
    return this.publicService.checkin(qrToken, body);
  }

  @Get('customer/:phone')
  customerLookup(@Param('phone') phone: string) {
    return this.publicService.customerLookup(phone);
  }

  @Get('diary/:diaryToken')
  getDiary(@Param('diaryToken') diaryToken: string) {
    return this.publicService.getDiary(diaryToken);
  }
}
