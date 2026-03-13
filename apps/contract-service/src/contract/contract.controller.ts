import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContractService } from './contract.service';
import * as DTOs from './dto/contract.dto';

@Controller()
export class ContractController {
    constructor(private readonly contractService: ContractService) { }

    @MessagePattern('generate_contract')
    async generateContract(@Payload() data: DTOs.GenerateContractDto) {
        return await this.contractService.generateFromPrompt(data);
    }

    @MessagePattern('sign_contract')
    async signContract(@Payload() data: DTOs.SignContractDto) {
        return await this.contractService.signContract(data);
    }

    @MessagePattern('create_change_request')
    async createChangeRequest(@Payload() data: DTOs.ChangeRequestDto) {
        return await this.contractService.createChangeRequest(data);
    }

    @MessagePattern('get_audit_log')
    async getAuditLog(@Payload() data: { contractId: string }) {
        return await this.contractService.getAuditLog(data.contractId);
    }
}
