import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectService } from './project.service';

@Controller()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @MessagePattern('get_kanban')
  async getKanban(@Payload() data: { projectId: string }) {
    return await this.projectService.getProjectKanban(data.projectId);
  }

  @MessagePattern('create_milestone')
  async createMilestone(@Payload() data: any) {
    return await this.projectService.createMilestone(data);
  }

  @MessagePattern('update_milestone_status')
  async updateMilestoneStatus(
    @Payload() data: { milestoneId: string; status: string },
  ) {
    return await this.projectService.updateMilestoneStatus(data);
  }
}
