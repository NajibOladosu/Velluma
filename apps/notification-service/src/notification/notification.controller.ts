import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';

@Controller()
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @MessagePattern('send_email')
    async sendEmail(@Payload() data: any) {
        return await this.notificationService.sendEmail(data);
    }

    @MessagePattern('send_sms')
    async sendSms(@Payload() data: any) {
        return await this.notificationService.sendSms(data);
    }

    @MessagePattern('list_notifications')
    async listNotifications(@Payload() data: { tenantId: string }) {
        return await this.notificationService.listNotifications(data.tenantId);
    }
}
