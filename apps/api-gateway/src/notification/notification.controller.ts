import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SendEmailDto, SendSmsDto } from './dto/send-notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(@Inject('NOTIFICATION_SERVICE') private client: ClientProxy) {}

  @Post('email')
  async sendEmail(@Body() data: SendEmailDto) {
    return await firstValueFrom(this.client.send('send_email', data));
  }

  @Post('sms')
  async sendSms(@Body() data: SendSmsDto) {
    return await firstValueFrom(this.client.send('send_sms', data));
  }

  @Get('tenant/:tenantId')
  async listNotifications(@Param('tenantId') tenantId: string) {
    return await firstValueFrom(
      this.client.send('list_notifications', { tenantId }),
    );
  }
}
