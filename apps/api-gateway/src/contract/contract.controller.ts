import { Controller, Post, Body, Inject, Param, Get } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SignContractDto } from './dto/sign-contract.dto';

@Controller('contracts')
export class ContractController {
    constructor(@Inject('CONTRACT_SERVICE') private client: ClientProxy) { }

    @Post('sign')
    async signContract(@Body() data: SignContractDto) {
        return await firstValueFrom(
            this.client.send('sign_contract', data)
        );
    }

    @Get('audit/:projectId')
    async getAuditLog(@Param('projectId') projectId: string) {
        return await firstValueFrom(
            this.client.send('get_audit_log', { projectId })
        );
    }
}
