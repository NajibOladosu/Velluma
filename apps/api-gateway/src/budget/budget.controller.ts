import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';

@ApiTags('Budget')
@ApiBearerAuth('supabase-jwt')
@Controller('budget')
export class BudgetController {
  constructor(@Inject('BUDGET_SERVICE') private client: ClientProxy) {}

  @ApiOperation({
    summary: 'Get project profitability',
    description:
      'Returns revenue vs. cost breakdown and profitability percentage for a project.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Profitability metrics' })
  @Get('project/:projectId/profitability')
  async getProfitability(@Param('projectId') projectId: string) {
    return callMicroservice(
      this.client.send('get_profitability', { projectId }),
    );
  }

  @ApiOperation({
    summary: 'Get tenant financial health',
    description:
      'Returns aggregate cash-flow and budget health score across all projects for a tenant.',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tenant health metrics' })
  @Get('tenant/:tenantId/health')
  async getTenantHealth(@Param('tenantId') tenantId: string) {
    return callMicroservice(
      this.client.send('get_tenant_health', { tenantId }),
    );
  }
}
