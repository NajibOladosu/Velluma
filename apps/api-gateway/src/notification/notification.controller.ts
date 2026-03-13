import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('notifications')
export class NotificationController {
    constructor(@Inject('NOTIFICATION_SERVICE') private client: ClientProxy) { }

    @Post('email')
    async sendEmail(@Body() data: any) {
        return await firstValueFrom(
            this.client.send('send_email', data)
        );
    }

    @Post('sms')
    async sendSms(@Body() data: any) {
        return await firstValueFrom(
            this.client.send('send_sms', data)
        );
    }

    @Get('tenant/:tenantId')
    async listNotifications(@Param('tenantId') tenantId: string) {
        return await firstValueFrom(
            this.client.send('list_notifications', { tenantId })
        );
    }
}
