import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from 'supabase-lib';

/* ─────────────────────────────────────────────────────────────────────────────
   Budget Service — profitability calculations from real DB data.

   Schema note
   ───────────
   • expenses.project_id → projects.id          (direct FK — per-project exact)
   • time_entries.contract_id → contracts.id    (no project_id on contracts)
   • time_entries.tenant_id → profiles.id       (added via 20260313 migration)

   Because time_entries are linked to contracts rather than projects, labor cost
   is aggregated at the tenant level (all contracts the freelancer owns) and used
   as the labor input for both per-project and tenant-level profitability views.
   ───────────────────────────────────────────────────────────────────────────── */

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface ProjectProfitability {
  projectId: string;
  totalBudget: number;
  expenseCost: number;
  laborCost: number;
  totalCost: number;
  profit: number;
  profitabilityPercent: number;
  totalHoursLogged: number;
  effectiveHourlyRate: number;
}

export interface TenantHealthScore {
  tenantId: string;
  totalRevenue: number;
  totalExpenses: number;
  totalLaborCost: number;
  totalCost: number;
  totalProfit: number;
  profitabilityPercent: number;
  totalHoursLogged: number;
  averageEHR: number;
  healthScore: number;
  projectCount: number;
}

/* ── Service ────────────────────────────────────────────────────────────────── */

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(private supabase: SupabaseService) {}

  async getProjectProfitability(
    projectId: string,
  ): Promise<ProjectProfitability> {
    const db = this.supabase.getClient();

    // 1. Fetch project budget and the owning tenant
    const { data: project, error: projectError } = await db
      .from('projects')
      .select('total_budget, tenant_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(
        `Project not found: ${projectError?.message ?? projectId}`,
      );
    }

    const revenue = Number(project.total_budget) || 0;

    // 2. Sum expenses directly associated with this project.
    //    Rejected expenses are excluded — they were not actually incurred.
    const { data: expenses, error: expError } = await db
      .from('expenses')
      .select('amount')
      .eq('project_id', projectId)
      .neq('status', 'rejected');

    if (expError) {
      throw new Error(`Failed to fetch expenses: ${expError.message}`);
    }

    const expenseCost = (expenses ?? []).reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0,
    );

    // 3. Sum labor cost from time_entries for this tenant.
    //    time_entries are linked to contracts (not projects) so this aggregates
    //    all approved/submitted work logged by the freelancer across their
    //    contracts. It is the closest proxy available without a project→contract FK.
    const { data: timeEntries, error: timeError } = await db
      .from('time_entries')
      .select('duration_minutes, hourly_rate')
      .eq('tenant_id', project.tenant_id)
      .in('status', ['submitted', 'approved']);

    if (timeError) {
      throw new Error(`Failed to fetch time entries: ${timeError.message}`);
    }

    const { laborCost, totalHours } = this.aggregateTimeEntries(
      timeEntries ?? [],
    );

    const totalCost = expenseCost + laborCost;
    const profit = revenue - totalCost;
    const profitabilityPercent =
      revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    const effectiveHourlyRate =
      totalHours > 0 ? Math.round((revenue / totalHours) * 100) / 100 : 0;

    this.logger.log(
      `Profitability for project ${projectId}: ` +
        `revenue=${revenue}, expenses=${expenseCost}, labor=${laborCost.toFixed(2)}, ` +
        `profit=${profit.toFixed(2)} (${profitabilityPercent}%)`,
    );

    return {
      projectId,
      totalBudget: revenue,
      expenseCost,
      laborCost: Math.round(laborCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profitabilityPercent,
      totalHoursLogged: Math.round(totalHours * 100) / 100,
      effectiveHourlyRate,
    };
  }

  async getTenantHealthScore(tenantId: string): Promise<TenantHealthScore> {
    const db = this.supabase.getClient();

    // 1. Sum total budget across all projects owned by the tenant
    const { data: projects, error: projError } = await db
      .from('projects')
      .select('total_budget')
      .eq('tenant_id', tenantId);

    if (projError) {
      throw new Error(`Failed to fetch projects: ${projError.message}`);
    }

    const totalRevenue = (projects ?? []).reduce(
      (sum, p) => sum + (Number(p.total_budget) || 0),
      0,
    );

    // 2. Sum all expenses for the tenant (excluding rejected)
    const { data: expenses, error: expError } = await db
      .from('expenses')
      .select('amount')
      .eq('tenant_id', tenantId)
      .neq('status', 'rejected');

    if (expError) {
      throw new Error(`Failed to fetch expenses: ${expError.message}`);
    }

    const totalExpenses = (expenses ?? []).reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0,
    );

    // 3. Sum all labor for the tenant from approved/submitted time entries
    const { data: timeEntries, error: timeError } = await db
      .from('time_entries')
      .select('duration_minutes, hourly_rate')
      .eq('tenant_id', tenantId)
      .in('status', ['submitted', 'approved']);

    if (timeError) {
      throw new Error(`Failed to fetch time entries: ${timeError.message}`);
    }

    const { laborCost: totalLaborCost, totalHours } = this.aggregateTimeEntries(
      timeEntries ?? [],
    );

    const totalCost = totalExpenses + totalLaborCost;
    const totalProfit = totalRevenue - totalCost;
    const profitabilityPercent =
      totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    // Average Effective Hourly Rate: total revenue ÷ total hours logged
    const averageEHR =
      totalHours > 0 ? Math.round((totalRevenue / totalHours) * 100) / 100 : 0;

    // Health score: profitability as a 0–100 index.
    // Clamps at 0 (losing money) and 100 (fully profitable or over-budget).
    const healthScore = Math.min(100, Math.max(0, profitabilityPercent));

    this.logger.log(
      `Health score for tenant ${tenantId}: ` +
        `revenue=${totalRevenue}, cost=${totalCost.toFixed(2)}, ` +
        `profit=${totalProfit.toFixed(2)} (${profitabilityPercent}%), score=${healthScore}`,
    );

    return {
      tenantId,
      totalRevenue,
      totalExpenses,
      totalLaborCost: Math.round(totalLaborCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      profitabilityPercent,
      totalHoursLogged: Math.round(totalHours * 100) / 100,
      averageEHR,
      healthScore,
      projectCount: (projects ?? []).length,
    };
  }

  /* ── Private helpers ─────────────────────────────────────────────────────── */

  /** Reduce an array of time entry rows into total labor cost and total hours. */
  private aggregateTimeEntries(
    rows: { duration_minutes: number | null; hourly_rate: number | null }[],
  ): { laborCost: number; totalHours: number } {
    return rows.reduce(
      (acc, te) => {
        const hours = (Number(te.duration_minutes) || 0) / 60;
        const rate = Number(te.hourly_rate) || 0;
        return {
          laborCost: acc.laborCost + hours * rate,
          totalHours: acc.totalHours + hours,
        };
      },
      { laborCost: 0, totalHours: 0 },
    );
  }
}
