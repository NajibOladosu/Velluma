import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ContractService } from './contract.service';
import type { SignatureData } from './contract.service';

@Controller()
export class ContractController {
    constructor(private readonly contractService: ContractService) { }

    @MessagePattern('sign_contract')
    async signContract(@Payload() data: SignatureData) {
        return await this.contractService.signContract(data);
    }

    @MessagePattern('get_audit_log')
    async getAuditLog(@Payload() data: { projectId: string }) {
        return await this.contractService.getAuditLog(data.projectId);
    }
}
