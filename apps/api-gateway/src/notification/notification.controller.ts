import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Inject,
  Param,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { Public } from '../common/decorators/public.decorator';
import {
  SendEmailDto,
  SendSmsDto,
  PushSubscribeDto,
  PushUnsubscribeDto,
  SendPushDto,
} from './dto/send-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth('supabase-jwt')
@Controller('notifications')
export class NotificationController {
  constructor(@Inject('NOTIFICATION_SERVICE') private client: ClientProxy) {}

  // ── Email / SMS ──────────────────────────────────────────────────────────

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

  // ── In-app list / mark-read ──────────────────────────────────────────────

  @ApiOperation({
    summary: 'List notifications for the current user',
    description:
      'Returns the 40 most recent notifications for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Array of notification records' })
  @Get()
  async listMyNotifications(@Req() req: any) {
    return callMicroservice(
      this.client.send('list_user_notifications', { userId: req.user.id }),
    );
  }

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @Patch(':id/read')
  async markRead(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('mark_notification_read', { id }));
  }

  @ApiOperation({
    summary: 'Mark all notifications as read for the current user',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @Patch('read-all')
  async markAllRead(@Req() req: any) {
    return callMicroservice(
      this.client.send('mark_all_notifications_read', { userId: req.user.id }),
    );
  }

  @ApiOperation({ summary: 'List notifications for a tenant (admin use)' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Array of notification records' })
  @Get('tenant/:tenantId')
  async listNotifications(@Param('tenantId') tenantId: string) {
    return callMicroservice(
      this.client.send('list_notifications', { tenantId }),
    );
  }

  // ── Web Push ─────────────────────────────────────────────────────────────

  @Public()
  @ApiOperation({
    summary: 'Get VAPID public key',
    description:
      'Returns the VAPID public key required for creating a browser push subscription. ' +
      'This endpoint is publicly accessible — no auth required.',
  })
  @ApiResponse({ status: 200, description: 'VAPID public key string' })
  @Get('push/vapid-key')
  getVapidPublicKey() {
    const key = process.env.VAPID_PUBLIC_KEY ?? '';
    return { vapidPublicKey: key };
  }

  @ApiOperation({
    summary: 'Register a browser push subscription',
    description:
      'Saves a Web Push subscription (endpoint + keys) for the authenticated user. ' +
      'Call this after the browser grants notification permission and ' +
      '`PushManager.subscribe()` returns a PushSubscription.',
  })
  @ApiResponse({ status: 201, description: 'Subscription saved' })
  @Post('push/subscribe')
  async subscribe(@Req() req: any, @Body() dto: PushSubscribeDto) {
    return callMicroservice(
      this.client.send('save_push_subscription', {
        userId: req.user.id,
        tenantId: req.user.id,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? req.headers['user-agent'],
      }),
    );
  }

  @ApiOperation({
    summary: 'Remove a browser push subscription',
    description:
      'Deletes the push subscription matching the given endpoint for the current user.',
  })
  @ApiResponse({ status: 200, description: 'Subscription removed' })
  @Post('push/unsubscribe')
  async unsubscribe(@Req() req: any, @Body() dto: PushUnsubscribeDto) {
    return callMicroservice(
      this.client.send('delete_push_subscription', {
        userId: req.user.id,
        endpoint: dto.endpoint,
      }),
    );
  }

  @ApiOperation({
    summary: 'Send a push notification to a user',
    description:
      'Delivers a Web Push notification to all registered subscriptions for a user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Push notification queued for delivery',
  })
  @Post('push/send')
  async sendPush(@Body() dto: SendPushDto) {
    return callMicroservice(this.client.send('send_push', dto));
  }
}
