import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  Param,
  Put,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateMilestoneDto } from './dto/create-milestone.dto';

@ApiTags('Projects')
@ApiBearerAuth('supabase-jwt')
@Controller('projects')
export class ProjectController {
  constructor(@Inject('PROJECT_SERVICE') private client: ClientProxy) {}

  @ApiOperation({
    summary: 'Get project Kanban board',
    description: 'Returns all tasks and milestones grouped by status column.',
  })
  @ApiParam({ name: 'id', description: 'Project UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Kanban board data' })
  @Get(':id/kanban')
  async getKanban(@Param('id') id: string) {
    return callMicroservice(this.client.send('get_kanban', { projectId: id }));
  }

  @ApiOperation({
    summary: 'Create a milestone',
    description:
      'Adds a new milestone to a project. The amount will be held in escrow when the client funds it.',
  })
  @ApiResponse({ status: 201, description: 'Milestone created' })
  @Post('milestones')
  async createMilestone(@Body() data: CreateMilestoneDto) {
    return callMicroservice(this.client.send('create_milestone', data));
  }

  @ApiOperation({ summary: 'Update milestone status' })
  @ApiParam({ name: 'id', description: 'Milestone UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Milestone with updated status' })
  @Put('milestones/:id/status')
  async updateMilestoneStatus(
    @Param('id') id: string,
    @Body() data: { status: string },
  ) {
    return callMicroservice(
      this.client.send('update_milestone_status', {
        milestoneId: id,
        status: data.status,
      }),
    );
  }
}
