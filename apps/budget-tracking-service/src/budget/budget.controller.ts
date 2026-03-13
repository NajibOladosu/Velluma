import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BudgetService } from './budget.service';

@Controller()
export class BudgetController {
    constructor(private readonly budgetService: BudgetService) { }

    @MessagePattern('get_profitability')
    async getProjectProfitability(@Payload() data: { projectId: string }) {
        return await this.budgetService.getProjectProfitability(data.projectId);
    }

    @MessagePattern('get_tenant_health')
    async getTenantHealthScore(@Payload() data: { tenantId: string }) {
        return await this.budgetService.getTenantHealthScore(data.tenantId);
    }
}
