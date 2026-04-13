import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern('send_email')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async sendEmail(@Payload() data: SendEmailDto) {
    return await this.notificationService.sendEmail(data);
  }

  @MessagePattern('send_sms')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async sendSms(@Payload() data: SendSmsDto) {
    return await this.notificationService.sendSms(data);
  }

  @MessagePattern('list_notifications')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async listNotifications(@Payload() data: ListNotificationsDto) {
    return await this.notificationService.listNotifications(data.tenantId);
  }
}
