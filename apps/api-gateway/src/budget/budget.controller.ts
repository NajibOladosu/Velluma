import { Controller, Get, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('budget')
export class BudgetController {
  constructor(@Inject('BUDGET_SERVICE') private client: ClientProxy) {}

  @Get('project/:projectId/profitability')
  async getProfitability(@Param('projectId') projectId: string) {
    return await firstValueFrom(
      this.client.send('get_profitability', { projectId }),
    );
  }

  @Get('tenant/:tenantId/health')
  async getTenantHealth(@Param('tenantId') tenantId: string) {
    return await firstValueFrom(
      this.client.send('get_tenant_health', { tenantId }),
    );
  }
}
