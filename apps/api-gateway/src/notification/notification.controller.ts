import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { SendEmailDto, SendSmsDto } from './dto/send-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth('supabase-jwt')
@Controller('notifications')
export class NotificationController {
  constructor(@Inject('NOTIFICATION_SERVICE') private client: ClientProxy) {}

  @ApiOperation({ summary: 'Send a transactional email' })
  @ApiResponse({ status: 201, description: 'Email queued for delivery' })
  @Post('email')
  async sendEmail(@Body() data: SendEmailDto) {
    return callMicroservice(this.client.send('send_email', data));
  }

  @ApiOperation({ summary: 'Send an SMS message' })
  @ApiResponse({ status: 201, description: 'SMS queued for delivery' })
  @Post('sms')
  async sendSms(@Body() data: SendSmsDto) {
    return callMicroservice(this.client.send('send_sms', data));
  }

  @ApiOperation({ summary: 'List notifications for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Array of notification records' })
  @Get('tenant/:tenantId')
  async listNotifications(@Param('tenantId') tenantId: string) {
    return callMicroservice(
      this.client.send('list_notifications', { tenantId }),
    );
  }
}
