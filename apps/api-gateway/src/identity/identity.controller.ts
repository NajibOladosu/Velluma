import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';

@ApiTags('Identity')
@ApiBearerAuth('supabase-jwt')
@Controller('identity')
export class IdentityController {
  constructor(@Inject('IDENTITY_SERVICE') private client: ClientProxy) {}

  @ApiOperation({
    summary: 'Provision a new tenant',
    description:
      'Creates DB tenant record and Stripe Connect account. Idempotent — safe to call on every login.',
  })
  @ApiResponse({ status: 201, description: 'Tenant provisioned or retrieved' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('provision')
  async provisionTenant(@Body() data: { ownerId: string; email: string }) {
    return callMicroservice(this.client.send('get_or_create_tenant', data));
  }

  @ApiOperation({ summary: 'Get tenant details' })
  @ApiResponse({ status: 200, description: 'Tenant record' })
  @Get('tenant')
  async getTenant(@Body() data: { tenantId: string }) {
    return callMicroservice(this.client.send('get_tenant', data));
  }

  @ApiOperation({
    summary: 'Get Stripe Connect onboarding link',
    description:
      'Returns a time-limited Stripe Express onboarding URL for KYC and bank account setup.',
  })
  @ApiResponse({ status: 201, description: 'Stripe onboarding URL' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('stripe-onboarding')
  async getOnboardingLink(@Body() data: { tenantId: string }) {
    return callMicroservice(
      this.client.send('get_stripe_onboarding_link', data),
    );
  }
}
