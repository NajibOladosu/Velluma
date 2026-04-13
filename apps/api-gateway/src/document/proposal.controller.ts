import { Controller, Get, Post, Body, Inject, Param, Put } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';

@Controller('proposals')
export class ProposalController {
  constructor(@Inject('DOCUMENT_SERVICE') private client: ClientProxy) {}

  @Post()
  async createProposal(@Body() data: CreateProposalDto) {
    return callMicroservice(this.client.send('create_proposal', data));
  }

  @Get(':id')
  async getProposal(@Param('id') id: string) {
    return callMicroservice(
      this.client.send('get_proposal', { projectId: id }),
    );
  }

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
