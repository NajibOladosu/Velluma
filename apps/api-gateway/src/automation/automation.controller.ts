import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateRuleDto, TriggerEventDto } from './dto/automation.dto';

@ApiTags('Automation')
@ApiBearerAuth('supabase-jwt')
@Controller('automation')
export class AutomationController {
  constructor(@Inject('AUTOMATION_SERVICE') private client: ClientProxy) {}

  @ApiOperation({
    summary: 'Create an automation rule',
    description:
      'Defines a trigger → action rule for the tenant. The rule fires whenever a matching event is received.',
  })
  @ApiResponse({ status: 201, description: 'Rule created' })
  @Post('rules')
  async createRule(@Body() data: CreateRuleDto) {
    return callMicroservice(this.client.send('create_rule', data));
  }

  @ApiOperation({ summary: 'List automation rules for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Array of automation rules' })
  @Get('rules/:tenantId')
  async listRules(@Param('tenantId') tenantId: string) {
    return callMicroservice(this.client.send('list_rules', { tenantId }));
  }

  @ApiOperation({
    summary: 'Fire an automation event',
    description:
      'Evaluates all active rules for the tenant against the given event and executes matching actions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Event processed, matching actions fired',
  })
  @Post('trigger')
  async triggerEvent(@Body() data: TriggerEventDto) {
    return callMicroservice(this.client.send('trigger_event', data));
  }
}
