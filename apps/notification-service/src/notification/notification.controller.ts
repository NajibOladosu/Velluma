import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { SendEmailDto } from './dto/send-email.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import {
  SavePushSubscriptionDto,
  DeletePushSubscriptionDto,
} from './dto/save-push-subscription.dto';
import {
  SendPushDto,
  ListUserNotificationsDto,
  MarkNotificationReadDto,
} from './dto/send-push.dto';

const validate = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
});

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ── Email ────────────────────────────────────────────────────────────────

  @MessagePattern('send_email')
  @UsePipes(validate)
  async sendEmail(@Payload() data: SendEmailDto) {
    return this.notificationService.sendEmail(data);
  }

  // ── SMS ──────────────────────────────────────────────────────────────────

  @MessagePattern('send_sms')
  @UsePipes(validate)
  async sendSms(@Payload() data: SendSmsDto) {
    return this.notificationService.sendSms(data);
  }

  // ── Push ─────────────────────────────────────────────────────────────────

  @MessagePattern('save_push_subscription')
  @UsePipes(validate)
  async savePushSubscription(@Payload() data: SavePushSubscriptionDto) {
    return this.notificationService.savePushSubscription(data);
  }

  @MessagePattern('delete_push_subscription')
  @UsePipes(validate)
  async deletePushSubscription(@Payload() data: DeletePushSubscriptionDto) {
    return this.notificationService.deletePushSubscription(data);
  }

  @MessagePattern('send_push')
  @UsePipes(validate)
  async sendPush(@Payload() data: SendPushDto) {
    return this.notificationService.sendPush({
      userId: data.userId,
      title: data.title,
      body: data.body,
      url: data.url,
      notificationData: data.data,
    });
  }

  // ── List / Read ───────────────────────────────────────────────────────────

  @MessagePattern('list_notifications')
  @UsePipes(validate)
  async listNotifications(@Payload() data: ListNotificationsDto) {
    return this.notificationService.listNotifications(data.tenantId);
  }

  @MessagePattern('list_user_notifications')
  @UsePipes(validate)
  async listUserNotifications(@Payload() data: ListUserNotificationsDto) {
    return this.notificationService.listUserNotifications(data.userId);
  }

  @MessagePattern('mark_notification_read')
  @UsePipes(validate)
  async markNotificationRead(@Payload() data: MarkNotificationReadDto) {
    return this.notificationService.markNotificationRead(data.id);
  }

  @MessagePattern('mark_all_notifications_read')
  @UsePipes(validate)
  async markAllNotificationsRead(@Payload() data: ListUserNotificationsDto) {
    return this.notificationService.markAllNotificationsRead(data.userId);
  }
}
