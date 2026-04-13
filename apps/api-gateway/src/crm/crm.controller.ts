import { Controller, Get, Post, Body, Inject, Param, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('crm')
export class CrmController {
  constructor(@Inject('CRM_SERVICE') private client: ClientProxy) {}

  @Get('clients')
  async listClients(@Query('tenantId') tenantId: string) {
    return callMicroservice(this.client.send('list_clients', { tenantId }));
  }

  @Post('clients')
  async createClient(@Body() data: CreateClientDto) {
    return callMicroservice(this.client.send('create_client', data));
  }

  @Get('clients/:id')
  async getClientDetails(@Param('id') id: string) {
    return callMicroservice(
      this.client.send('get_client_details', { clientId: id }),
    );
  }
}
