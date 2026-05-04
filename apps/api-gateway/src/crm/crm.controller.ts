import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  Param,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateClientDto } from './dto/create-client.dto';

@ApiTags('CRM')
@ApiBearerAuth('supabase-jwt')
@Controller('crm')
export class CrmController {
  constructor(@Inject('CRM_SERVICE') private client: ClientProxy) {}

  @ApiOperation({ summary: 'List clients for a tenant' })
  @ApiQuery({
    name: 'tenantId',
    required: true,
    description: 'Tenant UUID to scope the list',
  })
  @ApiResponse({ status: 200, description: 'Array of client records' })
  @Get('clients')
  async listClients(@Query('tenantId') tenantId: string) {
    return callMicroservice(this.client.send('list_clients', { tenantId }));
  }

  @ApiOperation({ summary: 'Create a client' })
  @ApiResponse({ status: 201, description: 'Client record created' })
  @Post('clients')
  async createClient(@Body() data: CreateClientDto) {
    return callMicroservice(this.client.send('create_client', data));
  }

  @ApiOperation({ summary: 'Get client details' })
  @ApiParam({ name: 'id', description: 'Client UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Client record with related data' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @Get('clients/:id')
  async getClientDetails(@Param('id') id: string) {
    return callMicroservice(
      this.client.send('get_client_details', { clientId: id }),
    );
  }
}
