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
}
