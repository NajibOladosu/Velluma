import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateRuleDto, TriggerEventDto } from './dto/automation.dto';

@Controller('automation')
export class AutomationController {
  constructor(@Inject('AUTOMATION_SERVICE') private client: ClientProxy) {}

  @Post('rules')
  async createRule(@Body() data: CreateRuleDto) {
    return callMicroservice(this.client.send('create_rule', data));
  }

  @Get('rules/:tenantId')
  async listRules(@Param('tenantId') tenantId: string) {
    return callMicroservice(this.client.send('list_rules', { tenantId }));
  }

  @Post('trigger')
  async triggerEvent(@Body() data: TriggerEventDto) {
    return callMicroservice(this.client.send('trigger_event', data));
  }
}
