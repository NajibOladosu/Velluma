import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';

@Controller('budget')
export class BudgetController {
  constructor(@Inject('BUDGET_SERVICE') private client: ClientProxy) {}

  @Get('project/:projectId/profitability')
  async getProfitability(@Param('projectId') projectId: string) {
    return callMicroservice(
      this.client.send('get_profitability', { projectId }),
    );
  }

  @Get('tenant/:tenantId/health')
  async getTenantHealth(@Param('tenantId') tenantId: string) {
    return callMicroservice(
      this.client.send('get_tenant_health', { tenantId }),
    );
  }
}
