import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Inject,
  Param,
  Put,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { StartTimerDto } from './dto/start-timer.dto';

@Controller('time')
export class TimeController {
  constructor(@Inject('TIME_SERVICE') private client: ClientProxy) {}

  // ---------------------------------------------------------------------------
  // Timer session routes
  // ---------------------------------------------------------------------------

  @Post('timers/start')
  async startTimer(@Req() req: any, @Body() data: StartTimerDto) {
    return callMicroservice(
      this.client.send('start_timer', { ...data, userId: req.user.id }),
    );
  }

  /** Alias used by the frontend: POST /time/start */
  @Post('start')
  async startTimerAlias(@Req() req: any, @Body() data: StartTimerDto) {
    return callMicroservice(
      this.client.send('start_timer', { ...data, userId: req.user.id }),
    );
  }

  @Put('timers/:id/stop')
  async stopTimer(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('stop_timer', { timerId: id }));
  }

  /** Alias used by the frontend: POST /time/stop */
  @Post('stop')
  async stopTimerAlias(@Body() body: { entryId: string }) {
    return callMicroservice(
      this.client.send('stop_timer', { timerId: body.entryId }),
    );
  }

  @Get('project/:projectId/timers')
  async listTimers(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return callMicroservice(this.client.send('list_timers', { projectId }));
  }

  // ---------------------------------------------------------------------------
  // Time entry management routes
  // ---------------------------------------------------------------------------

  /** Manual time entry creation */
  @Post('entries')
  async createTimeEntry(@Req() req: any, @Body() body: any) {
    return callMicroservice(
      this.client.send('create_time_entry', {
        ...body,
        userId: req.user.id,
      }),
    );
  }

  /** Submit a draft entry for approval */
  @Patch('entries/:id/submit')
  async submitTimeEntry(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('submit_time_entry', { id }));
  }

  /** Approve a submitted entry */
  @Patch('entries/:id/approve')
  async approveTimeEntry(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(
      this.client.send('approve_time_entry', {
        id,
        approverId: req.user.id,
      }),
    );
  }

  /** Reject a submitted entry with optional reason */
  @Patch('entries/:id/reject')
  async rejectTimeEntry(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    return callMicroservice(
      this.client.send('reject_time_entry', {
        id,
        approverId: req.user.id,
        reason: body?.reason,
      }),
    );
  }
}
