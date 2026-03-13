import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AutomationService } from './automation.service';

@Controller()
export class AutomationController {
    constructor(private readonly automationService: AutomationService) { }

    @MessagePattern('create_rule')
    async createRule(@Payload() data: any) {
        return await this.automationService.createRule(data);
    }

    @MessagePattern('list_rules')
    async listRules(@Payload() data: { tenantId: string }) {
        return await this.automationService.listRules(data.tenantId);
    }

    @MessagePattern('trigger_event')
    async triggerEvent(@Payload() data: any) {
        return await this.automationService.triggerEvent(data);
    }
}
