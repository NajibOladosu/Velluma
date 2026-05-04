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
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';

@ApiTags('Proposals')
@ApiBearerAuth('supabase-jwt')
@Controller('proposals')
export class ProposalController {
  constructor(@Inject('DOCUMENT_SERVICE') private client: ClientProxy) {}

  @ApiOperation({ summary: 'Create a proposal' })
  @ApiResponse({ status: 201, description: 'Proposal created' })
  @Post()
  async createProposal(@Body() data: CreateProposalDto) {
    return callMicroservice(this.client.send('create_proposal', data));
  }

  @ApiOperation({ summary: 'Get a proposal by ID' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Proposal record' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  @Get(':id')
  async getProposal(@Param('id') id: string) {
    return callMicroservice(
      this.client.send('get_proposal', { projectId: id }),
    );
  }

  @ApiOperation({ summary: 'Update a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Updated proposal record' })
  @Put(':id')
  async updateProposal(
    @Param('id') id: string,
    @Body() content: UpdateProposalDto,
  ) {
    return callMicroservice(
      this.client.send('update_proposal', { projectId: id, content }),
    );
  }
}
