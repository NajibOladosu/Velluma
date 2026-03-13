import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('automation')
export class AutomationController {
    constructor(@Inject('AUTOMATION_SERVICE') private client: ClientProxy) { }

    @Post('rules')
    async createRule(@Body() data: any) {
        return await firstValueFrom(
            this.client.send('create_rule', data)
        );
    }

    @Get('rules/:tenantId')
    async listRules(@Param('tenantId') tenantId: string) {
        return await firstValueFrom(
            this.client.send('list_rules', { tenantId })
        );
    }

    @Post('trigger')
    async triggerEvent(@Body() data: any) {
        return await firstValueFrom(
            this.client.send('trigger_event', data)
        );
    }
}
