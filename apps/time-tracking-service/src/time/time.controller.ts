import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TimeService } from './time.service';

@Controller()
export class TimeController {
  constructor(private readonly timeService: TimeService) {}

  @MessagePattern('start_timer')
  async startTimer(@Payload() data: any) {
    return await this.timeService.startTimer(data);
  }

  @MessagePattern('stop_timer')
  async stopTimer(@Payload() data: { timerId: string }) {
    return await this.timeService.stopTimer(data.timerId);
  }

  @MessagePattern('list_timers')
  async listTimers(@Payload() data: { projectId: string }) {
    return await this.timeService.listTimers(data.projectId);
  }

  @MessagePattern('create_time_entry')
  async createTimeEntry(@Payload() data: any) {
    return await this.timeService.createTimeEntry(data);
  }

  @MessagePattern('submit_time_entry')
  async submitTimeEntry(@Payload() data: { id: string }) {
    return await this.timeService.submitTimeEntry(data.id);
  }

  @MessagePattern('approve_time_entry')
  async approveTimeEntry(
    @Payload() data: { id: string; approverId: string },
  ) {
    return await this.timeService.approveTimeEntry(data.id, data.approverId);
  }

  @MessagePattern('reject_time_entry')
  async rejectTimeEntry(
    @Payload() data: { id: string; approverId: string; reason?: string },
  ) {
    return await this.timeService.rejectTimeEntry(
      data.id,
      data.approverId,
      data.reason,
    );
  }
}
