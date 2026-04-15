import { Controller, Get, Post, Body, Inject, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { AddDeliverableDto } from './dto/deliverable.dto';

@ApiTags('Resources')
@ApiBearerAuth('supabase-jwt')
@Controller('resources')
export class ResourceController {
  constructor(@Inject('RESOURCE_SERVICE') private client: ClientProxy) {}

  @ApiOperation({ summary: 'Add a deliverable to a project', description: 'Attaches an uploaded file as a project deliverable.' })
  @ApiResponse({ status: 201, description: 'Deliverable created' })
  @Post('deliverables')
  async addDeliverable(@Body() data: AddDeliverableDto) {
    return callMicroservice(this.client.send('add_deliverable', data));
  }

  @ApiOperation({ summary: 'List resources for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Array of resource/deliverable records' })
  @Get('project/:projectId')
  async listResources(@Param('projectId') projectId: string) {
    return callMicroservice(
      this.client.send('list_resources', { projectId }),
    );
  }
}
