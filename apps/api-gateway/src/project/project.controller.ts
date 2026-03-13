import { Controller, Get, Post, Body, Inject, Param, Put } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('projects')
export class ProjectController {
    constructor(@Inject('PROJECT_SERVICE') private client: ClientProxy) { }

    @Get(':id/kanban')
    async getKanban(@Param('id') id: string) {
        return await firstValueFrom(
            this.client.send('get_kanban', { projectId: id })
        );
    }

    @Post('milestones')
    async createMilestone(@Body() data: any) {
        return await firstValueFrom(
            this.client.send('create_milestone', data)
        );
    }

    @Put('milestones/:id/status')
    async updateMilestoneStatus(@Param('id') id: string, @Body() data: { status: string }) {
        return await firstValueFrom(
            this.client.send('update_milestone_status', { milestoneId: id, status: data.status })
        );
    }
}
