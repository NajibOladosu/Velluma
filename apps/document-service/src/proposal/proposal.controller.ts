import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProposalService, ProposalData } from './proposal.service';

@Controller()
export class ProposalController {
    constructor(private readonly proposalService: ProposalService) { }

    @MessagePattern('create_proposal')
    async createProposal(@Payload() data: ProposalData) {
        return await this.proposalService.createProposal(data);
    }

    @MessagePattern('get_proposal')
    async getProposal(@Payload() data: { projectId: string }) {
        return await this.proposalService.getProposal(data.projectId);
    }

    @MessagePattern('update_proposal')
    async updateProposal(@Payload() data: { projectId: string, content: any }) {
        return await this.proposalService.updateProposal(data.projectId, data.content);
    }
}
