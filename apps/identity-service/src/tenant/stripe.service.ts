import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn(
        'Stripe API Key missing. Stripe features will be disabled.',
      );
      return;
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-02-24-preview' as any,
    });
  }

  async createConnectAccount(email: string) {
    if (!this.stripe) throw new Error('Stripe not configured');

    return await this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  async createOnboardingLink(accountId: string, _tenantSlug: string) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const baseUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );

    return await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/settings?stripe_refresh=true`,
      return_url: `${baseUrl}/dashboard/settings?stripe_success=true`,
      type: 'account_onboarding',
    });
  }
}
