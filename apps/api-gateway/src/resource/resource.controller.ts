import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AddDeliverableDto } from './dto/deliverable.dto';

@Controller('resources')
export class ResourceController {
    constructor(@Inject('RESOURCE_SERVICE') private client: ClientProxy) { }

    @Post('deliverables')
    async addDeliverable(@Body() data: AddDeliverableDto) {
        return await firstValueFrom(
            this.client.send('add_deliverable', data)
        );
    }

    @Get('project/:projectId')
    async listResources(@Param('projectId') projectId: string) {
        return await firstValueFrom(
            this.client.send('list_resources', { projectId })
        );
    }
}
