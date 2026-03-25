import { Controller, Get, Post, Body, Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('identity')
export class IdentityController {
  constructor(@Inject('IDENTITY_SERVICE') private client: ClientProxy) {}

  @Post('provision')
  async provisionTenant(@Body() data: { ownerId: string; email: string }) {
    return await firstValueFrom(this.client.send('get_or_create_tenant', data));
  }

  @Get('tenant')
  async getTenant(@Body() data: { tenantId: string }) {
    return await firstValueFrom(this.client.send('get_tenant', data));
  }

  @Post('stripe-onboarding')
  async getOnboardingLink(@Body() data: { tenantId: string }) {
    return await firstValueFrom(
      this.client.send('get_stripe_onboarding_link', data),
    );
  }
}
