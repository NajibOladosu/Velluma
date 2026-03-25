import { Controller, Get, Post, Body, Inject, Param, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('crm')
export class CrmController {
    constructor(@Inject('CRM_SERVICE') private client: ClientProxy) { }

    @Get('clients')
    async listClients(@Query('tenantId') tenantId: string) {
        return await firstValueFrom(
            this.client.send('list_clients', { tenantId })
        );
    }

    @Post('clients')
    async createClient(@Body() data: CreateClientDto) {
        return await firstValueFrom(
            this.client.send('create_client', data)
        );
    }

    @Get('clients/:id')
    async getClientDetails(@Param('id') id: string) {
        return await firstValueFrom(
            this.client.send('get_client_details', { clientId: id })
        );
    }
}
