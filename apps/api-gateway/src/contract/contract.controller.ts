import { Controller, Post, Body, Inject, Param, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { SignContractDto } from './dto/sign-contract.dto';

class GenerateContractBody {
  tenantId: string;
  userId: string;
  prompt: string;
  clientId?: string;
  templateId?: string;
}

@ApiTags('Contracts')
@ApiBearerAuth('supabase-jwt')
@Controller('contracts')
export class ContractController {
  constructor(@Inject('CONTRACT_SERVICE') private client: ClientProxy) {}

  @ApiOperation({
    summary: 'Generate an AI contract',
    description:
      'Uses Google Gemini to generate a contract from a natural-language prompt. For Vercel deployments the Next.js route at /api/contracts/generate is used instead.',
  })
  @ApiResponse({ status: 201, description: 'Generated contract object' })
  @Post('generate')
  async generateContract(@Body() data: GenerateContractBody) {
    return callMicroservice(this.client.send('generate_contract', data));
  }

  @ApiOperation({
    summary: 'Sign a contract',
    description:
      'Records a digital signature. Once all required parties have signed the contract moves to pending_funding state.',
  })
  @ApiResponse({ status: 201, description: 'Signature recorded' })
  @ApiResponse({
    status: 409,
    description: 'Contract already signed by this user',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('sign')
  async signContract(@Body() data: SignContractDto) {
    return callMicroservice(this.client.send('sign_contract', data));
  }

  @ApiOperation({ summary: 'Get contract audit log' })
  @ApiParam({
    name: 'projectId',
    description: 'Contract / project UUID',
    format: 'uuid',
  })
  @ApiResponse({ status: 200, description: 'Array of audit log entries' })
  @Get('audit/:projectId')
  async getAuditLog(@Param('projectId') projectId: string) {
    return callMicroservice(this.client.send('get_audit_log', { projectId }));
  }
}
