import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';
import { StripeService } from './stripe.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private supabase: SupabaseService,
    private stripeService: StripeService,
  ) {}

  async getOrCreateTenant(ownerId: string, email: string) {
    const client = this.supabase.getClient();

    // 1. Check for existing tenant
    const { data: existingTenant, error: fetchError } = await client
      .from('tenants')
      .select('id')
      .eq('owner_id', ownerId)
      .single();

    if (existingTenant) {
      return existingTenant;
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      this.logger.error(`Error fetching tenant: ${fetchError.message}`);
      throw new Error('Failed to fetch tenant');
    }

    // 2. Create new tenant
    const slug =
      email.split('@')[0] + '-' + Math.random().toString(36).substring(2, 7);
    const { data: newTenant, error: createError } = await client
      .from('tenants')
      .insert([
        {
          owner_id: ownerId,
          name: `${email}'s Organization`,
          slug: slug.toLowerCase(),
        },
      ])
      .select()
      .single();

    if (createError) {
      this.logger.error(`Error creating tenant: ${createError.message}`);
      throw new Error('Failed to create tenant');
    }

    // 3. Link profile to tenant
    await client
      .from('profiles')
      .update({ tenant_id: newTenant.id })
      .eq('id', ownerId);

    // 4. Create Stripe Connect Account asynchronously
    try {
      const stripeAccount =
        await this.stripeService.createConnectAccount(email);
      await client
        .from('tenants')
        .update({ stripe_connect_id: stripeAccount.id })
        .eq('id', newTenant.id);

      newTenant.stripe_connect_id = stripeAccount.id;
    } catch (error) {
      this.logger.error(`Error creating Stripe account: ${error.message}`);
    }

    return newTenant;
  }

  async getOnboardingLink(tenantId: string) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant.stripe_connect_id) {
      throw new Error('Tenant has no Stripe account');
    }
    return await this.stripeService.createOnboardingLink(
      tenant.stripe_connect_id,
      tenant.slug,
    );
  }

  async getTenant(tenantId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;
    return data;
  }
}
