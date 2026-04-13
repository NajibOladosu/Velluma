import { Controller, Post, Body, Inject, Param, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { SignContractDto } from './dto/sign-contract.dto';

interface GenerateContractDto {
  tenantId: string;
  userId: string;
  prompt: string;
  clientId?: string;
  templateId?: string;
}

@Controller('contracts')
export class ContractController {
  constructor(@Inject('CONTRACT_SERVICE') private client: ClientProxy) {}

  /**
   * POST /contracts/generate
   * Generates an AI contract via the contract microservice.
   * Used when the full microservice stack is running.
   * For Vercel deployments, the Next.js API route at /api/contracts/generate
   * handles generation directly without Redis.
   */
  @Post('generate')
  async generateContract(@Body() data: GenerateContractDto) {
    return callMicroservice(this.client.send('generate_contract', data));
  }

  @Post('sign')
  async signContract(@Body() data: SignContractDto) {
    return callMicroservice(this.client.send('sign_contract', data));
  }

  @Get('audit/:projectId')
  async getAuditLog(@Param('projectId') projectId: string) {
    return callMicroservice(
      this.client.send('get_audit_log', { projectId }),
    );
  }
}
