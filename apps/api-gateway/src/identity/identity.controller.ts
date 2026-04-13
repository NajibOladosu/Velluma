import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';

@Controller('identity')
export class IdentityController {
  constructor(@Inject('IDENTITY_SERVICE') private client: ClientProxy) {}

  @Post('provision')
  async provisionTenant(@Body() data: { ownerId: string; email: string }) {
    return callMicroservice(this.client.send('get_or_create_tenant', data));
  }

  @Get('tenant')
  async getTenant(@Body() data: { tenantId: string }) {
    return callMicroservice(this.client.send('get_tenant', data));
  }

  @Post('stripe-onboarding')
  async getOnboardingLink(@Body() data: { tenantId: string }) {
    return callMicroservice(
      this.client.send('get_stripe_onboarding_link', data),
    );
  }
}
