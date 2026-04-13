import { Controller, Post, Body, Inject, Param, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { SignContractDto } from './dto/sign-contract.dto';

@Controller('contracts')
export class ContractController {
  constructor(@Inject('CONTRACT_SERVICE') private client: ClientProxy) {}

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
