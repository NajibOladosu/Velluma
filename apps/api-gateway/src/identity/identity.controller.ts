import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';

@Controller('identity')
export class IdentityController {
  constructor(@Inject('IDENTITY_SERVICE') private client: ClientProxy) {}

  // Tenant provisioning creates DB records and Stripe objects — expensive and
  // should happen once per user, so strict rate limiting guards against retries.
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('provision')
  async provisionTenant(@Body() data: { ownerId: string; email: string }) {
    return callMicroservice(this.client.send('get_or_create_tenant', data));
  }

  @Get('tenant')
  async getTenant(@Body() data: { tenantId: string }) {
    return callMicroservice(this.client.send('get_tenant', data));
  }

  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('stripe-onboarding')
  async getOnboardingLink(@Body() data: { tenantId: string }) {
    return callMicroservice(
      this.client.send('get_stripe_onboarding_link', data),
    );
  }
}
