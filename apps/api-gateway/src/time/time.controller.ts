import { Controller, Get, Post, Body, Inject, Param, Put } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('time')
export class TimeController {
    constructor(@Inject('TIME_SERVICE') private client: ClientProxy) { }

    @Post('timers/start')
    async startTimer(@Body() data: any) {
        return await firstValueFrom(
            this.client.send('start_timer', data)
        );
    }

    @Put('timers/:id/stop')
    async stopTimer(@Param('id') id: string) {
        return await firstValueFrom(
            this.client.send('stop_timer', { timerId: id })
        );
    }

    @Get('project/:projectId/timers')
    async listTimers(@Param('projectId') projectId: string) {
        return await firstValueFrom(
            this.client.send('list_timers', { projectId })
        );
    }
}
