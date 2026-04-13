import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

export interface CreateExpenseDto {
  projectId: string;
  tenantId: string;
  userId: string;
  description: string;
  amount: number;
  currency?: string;
  category: string;
  date: string;
  receiptUrl?: string;
  notes?: string;
}

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(private supabase: SupabaseService) {}

  async createExpense(data: CreateExpenseDto) {
    const { data: expense, error } = await this.supabase
      .getClient()
      .from('expenses')
      .insert([
        {
          project_id: data.projectId,
          tenant_id: data.tenantId,
          user_id: data.userId,
          description: data.description,
          amount: data.amount,
          currency: data.currency ?? 'USD',
          category: data.category,
          expense_date: data.date,
          receipt_url: data.receiptUrl ?? null,
          notes: data.notes ?? null,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating expense: ${error.message}`);
      throw new Error('Failed to create expense');
    }

    return expense;
  }

  async listExpenses(data: { projectId: string; tenantId: string }) {
    const { data: expenses, error } = await this.supabase
      .getClient()
      .from('expenses')
      .select('*')
      .eq('project_id', data.projectId)
      .eq('tenant_id', data.tenantId)
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return expenses ?? [];
  }

  async updateExpense(id: string, updates: Partial<CreateExpenseDto>) {
    const { data: expense, error } = await this.supabase
      .getClient()
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return expense;
  }

  async deleteExpense(id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  async getExpenseSummary(data: { projectId: string; tenantId: string }) {
    const { data: expenses, error } = await this.supabase
      .getClient()
      .from('expenses')
      .select('amount, currency, category, status')
      .eq('project_id', data.projectId)
      .eq('tenant_id', data.tenantId);

    if (error) throw error;

    const rows = expenses ?? [];
    const total = rows.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const byCategory = rows.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + (e.amount ?? 0);
      return acc;
    }, {});

    return {
      total,
      count: rows.length,
      byCategory,
      currency: rows[0]?.currency ?? 'USD',
    };
  }
}
