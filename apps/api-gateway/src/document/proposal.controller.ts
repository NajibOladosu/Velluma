import { Controller, Get, Post, Body, Inject, Param, Put } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';

@Controller('proposals')
export class ProposalController {
    constructor(@Inject('DOCUMENT_SERVICE') private client: ClientProxy) { }

    @Post()
    async createProposal(@Body() data: CreateProposalDto) {
        return await firstValueFrom(
            this.client.send('create_proposal', data)
        );
    }

    @Get(':id')
    async getProposal(@Param('id') id: string) {
        return await firstValueFrom(
            this.client.send('get_proposal', { projectId: id })
        );
    }

    @Put(':id')
    async updateProposal(@Param('id') id: string, @Body() content: UpdateProposalDto) {
        return await firstValueFrom(
            this.client.send('update_proposal', { projectId: id, content })
        );
    }
}
