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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { StartTimerDto } from './dto/start-timer.dto';

@ApiTags('Time')
@ApiBearerAuth('supabase-jwt')
@Controller('time')
export class TimeController {
  constructor(@Inject('TIME_SERVICE') private client: ClientProxy) {}

  // ---------------------------------------------------------------------------
  // Timer session routes
  // ---------------------------------------------------------------------------

  @ApiOperation({
    summary: 'Start a timer session',
    description:
      'Creates an active time_tracking_session for the authenticated user against a project.',
  })
  @ApiResponse({ status: 201, description: 'Timer session created' })
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

  @ApiOperation({
    summary: 'Stop a running timer',
    description: 'Stops the session and creates a draft time_entry for review.',
  })
  @ApiParam({ name: 'id', description: 'Timer session UUID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Stopped session + created draft time entry',
  })
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

  @ApiOperation({ summary: 'List time entries for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Array of time_entry records' })
  @Get('project/:projectId/timers')
  async listTimers(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return callMicroservice(this.client.send('list_timers', { projectId }));
  }

  // ---------------------------------------------------------------------------
  // Time entry management routes
  // ---------------------------------------------------------------------------

  @ApiOperation({
    summary: 'Create a manual time entry',
    description: 'Bypasses the session/timer flow for after-the-fact logging.',
  })
  @ApiResponse({ status: 201, description: 'Draft time entry created' })
  @Post('entries')
  async createTimeEntry(@Req() req: any, @Body() body: any) {
    return callMicroservice(
      this.client.send('create_time_entry', { ...body, userId: req.user.id }),
    );
  }

  @ApiOperation({
    summary: 'Submit a draft entry for approval',
    description: 'Transitions the time entry from draft → submitted.',
  })
  @ApiParam({ name: 'id', description: 'Time entry UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Submitted time entry' })
  @Patch('entries/:id/submit')
  async submitTimeEntry(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('submit_time_entry', { id }));
  }

  @ApiOperation({
    summary: 'Approve a submitted time entry',
    description:
      'Transitions submitted → approved. Approver identity taken from auth token.',
  })
  @ApiParam({ name: 'id', description: 'Time entry UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Approved time entry' })
  @Patch('entries/:id/approve')
  async approveTimeEntry(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return callMicroservice(
      this.client.send('approve_time_entry', { id, approverId: req.user.id }),
    );
  }

  @ApiOperation({ summary: 'Reject a submitted time entry' })
  @ApiParam({ name: 'id', description: 'Time entry UUID', format: 'uuid' })
  @ApiBody({
    schema: {
      properties: {
        reason: { type: 'string', description: 'Rejection reason' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Rejected time entry' })
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
