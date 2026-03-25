import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from 'supabase-lib';
import Stripe from 'stripe';

@Injectable()
export class PaymentService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private configService: ConfigService,
    private supabase: SupabaseService,
  ) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!apiKey) {
      this.logger.warn('Stripe API Key missing in Finance Service');
      return;
    }
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-02-24-preview' as any,
    });
  }

  async createEscrowPayment(data: {
    milestoneId: string;
    amount: number;
    tenantId: string;
    clientId: string;
    currency?: string;
  }) {
    if (!this.stripe) throw new Error('Stripe not configured');

    // 1. Fetch tenant's Stripe settings (e.g., if we want to charge fees)
    const { data: tenant } = await this.supabase
      .getClient()
      .from('tenants')
      .select('stripe_connect_id')
      .eq('id', data.tenantId)
      .single();

    // 2. Create Stripe Payment Intent
    // We hold the funds on the platform account first (Escrow)
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // convert to cents
      currency: data.currency || 'usd',
      metadata: {
        milestoneId: data.milestoneId,
        tenantId: data.tenantId,
        clientId: data.clientId,
        type: 'escrow_funding',
      },
    });

    // 3. Record in local Escrow Ledger (Supabase)
    const { data: record, error } = await this.supabase
      .getClient()
      .from('escrow_transactions')
      .insert([
        {
          tenant_id: data.tenantId,
          milestone_id: data.milestoneId,
          amount: data.amount,
          stripe_charge_id: intent.id,
          status: 'held',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      clientSecret: intent.client_secret,
      escrowRecordId: record.id,
    };
  }

  async releaseEscrow(milestoneId: string) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const client = this.supabase.getClient();

    // 1. Get the held transaction
    const { data: transaction } = await client
      .from('escrow_transactions')
      .select('*, tenants(stripe_connect_id)')
      .eq('milestone_id', milestoneId)
      .eq('status', 'held')
      .single();

    if (!transaction)
      throw new Error('No held transaction found for this milestone');
    if (!transaction.tenants?.stripe_connect_id)
      throw new Error('Freelancer has no Stripe account connected');

    // 2. Transfer funds to freelancer's Connect account
    const transfer = await this.stripe.transfers.create({
      amount: Math.round(transaction.amount * 100),
      currency: 'usd',
      destination: transaction.tenants.stripe_connect_id,
      metadata: { milestoneId },
    });

    // 3. Update Ledger
    await client
      .from('escrow_transactions')
      .update({
        status: 'released',
        stripe_transfer_id: transfer.id,
        released_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    // 4. Update Milestone status
    await client
      .from('milestones')
      .update({ status: 'released' })
      .eq('id', milestoneId);

    return { success: true, transferId: transfer.id };
  }
}
