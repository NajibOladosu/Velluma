import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';
import type { CreateInvoiceDto } from './dto/create-invoice.dto';
import type { ListInvoicesDto } from './dto/list-invoices.dto';
import type { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async createInvoice(data: CreateInvoiceDto) {
    const client = this.supabase.getClient();

    // Generate sequential invoice number scoped to this user.
    const { count } = await client
      .from('contract_payments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', data.userId);

    const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;

    const dueDate =
      data.dueDate ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: record, error } = await client
      .from('contract_payments')
      .insert([
        {
          contract_id: data.contractId,
          user_id: data.userId,
          amount: data.amount,
          currency: data.currency ?? 'USD',
          payment_type: 'escrow',
          status: 'pending',
          metadata: {
            invoice_number: invoiceNumber,
            due_date: dueDate,
            notes: data.notes ?? null,
            sent_at: null,
          },
        },
      ])
      .select('*, contracts(title, client_email)')
      .single();

    if (error) throw error;
    return record;
  }

  async listInvoices(query: ListInvoicesDto) {
    const client = this.supabase.getClient();

    let q = client
      .from('contract_payments')
      .select('*, contracts(title, client_email)')
      .eq('user_id', query.userId)
      .order('created_at', { ascending: false });

    if (query.contractId) {
      q = q.eq('contract_id', query.contractId);
    }
    if (query.status) {
      q = q.eq('status', query.status);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  }

  async getInvoice(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('contract_payments')
      .select('*, contracts(title, client_email)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Invoice ${id} not found`);
    return data;
  }

  async updateInvoice(dto: UpdateInvoiceDto) {
    const client = this.supabase.getClient();

    // Merge metadata changes without overwriting other metadata keys.
    if (dto.dueDate !== undefined || dto.notes !== undefined) {
      const { data: existing } = await client
        .from('contract_payments')
        .select('metadata')
        .eq('id', dto.id)
        .single();

      const currentMeta: Record<string, unknown> =
        (existing?.metadata as Record<string, unknown>) ?? {};

      const metaUpdate: Record<string, unknown> = { ...currentMeta };
      if (dto.dueDate !== undefined) metaUpdate.due_date = dto.dueDate;
      if (dto.notes !== undefined) metaUpdate.notes = dto.notes;

      const { data, error } = await client
        .from('contract_payments')
        .update({
          ...(dto.status !== undefined && { status: dto.status }),
          metadata: metaUpdate,
        })
        .eq('id', dto.id)
        .select('*, contracts(title, client_email)')
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await client
      .from('contract_payments')
      .update({ status: dto.status })
      .eq('id', dto.id)
      .select('*, contracts(title, client_email)')
      .single();

    if (error) throw error;
    return data;
  }

  async sendInvoice(id: string) {
    const client = this.supabase.getClient();

    const { data: existing, error: fetchError } = await client
      .from('contract_payments')
      .select('metadata')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existing) throw new Error(`Invoice ${id} not found`);

    const currentMeta: Record<string, unknown> =
      (existing.metadata as Record<string, unknown>) ?? {};

    const { data, error } = await client
      .from('contract_payments')
      .update({
        metadata: { ...currentMeta, sent_at: new Date().toISOString() },
      })
      .eq('id', id)
      .select('*, contracts(title, client_email)')
      .single();

    if (error) throw error;
    this.logger.log(`Invoice ${id} marked as sent`);
    return { success: true, invoice: data };
  }
}
