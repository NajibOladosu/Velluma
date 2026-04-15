import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth('supabase-jwt')
@Controller('invoices')
export class InvoiceController {
  constructor(@Inject('FINANCE_SERVICE') private client: ClientProxy) {}

  @ApiOperation({ summary: 'Create an invoice', description: 'Creates an invoice backed by a contract_payments record. The authenticated user\'s ID is used as the owner — it cannot be overridden in the body.' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  @Post()
  async createInvoice(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    return callMicroservice(
      this.client.send('create_invoice', { ...dto, userId: req.user.id }),
    );
  }

  @ApiOperation({ summary: 'List invoices', description: 'Returns all invoices for the authenticated user, optionally filtered by contract or status.' })
  @ApiQuery({ name: 'contractId', required: false, description: 'Filter by contract UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'completed', 'failed', 'refunded'] })
  @ApiQuery({ name: 'search', required: false, description: 'Full-text search on invoice number or notes' })
  @ApiResponse({ status: 200, description: 'Array of invoice records' })
  @Get()
  async listInvoices(
    @Req() req: any,
    @Query('contractId') contractId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return callMicroservice(
      this.client.send('list_invoices', {
        userId: req.user.id,
        ...(contractId && { contractId }),
        ...(status && { status }),
        ...(search && { search }),
      }),
    );
  }

  @ApiOperation({ summary: 'Get a single invoice' })
  @ApiParam({ name: 'id', description: 'Invoice UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Invoice record' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @Get(':id')
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('get_invoice', { id }));
  }

  @ApiOperation({ summary: 'Update invoice status, due date, or notes' })
  @ApiParam({ name: 'id', description: 'Invoice UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Updated invoice record' })
  @Patch(':id')
  async updateInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return callMicroservice(
      this.client.send('update_invoice', { id, ...dto }),
    );
  }

  @ApiOperation({ summary: 'Mark invoice as sent', description: 'Records the sent_at timestamp in the invoice metadata.' })
  @ApiParam({ name: 'id', description: 'Invoice UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Invoice marked as sent' })
  @Post(':id/send')
  async sendInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('send_invoice', { id }));
  }
}
