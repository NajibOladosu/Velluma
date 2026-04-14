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
import { callMicroservice } from '../common/utils/microservice-config';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Controller('invoices')
export class InvoiceController {
  constructor(@Inject('FINANCE_SERVICE') private client: ClientProxy) {}

  /**
   * POST /invoices
   * Create a new invoice (backed by contract_payments).
   * The userId is taken from the authenticated session, not the request body.
   */
  @Post()
  async createInvoice(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    return callMicroservice(
      this.client.send('create_invoice', { ...dto, userId: req.user.id }),
    );
  }

  /**
   * GET /invoices
   * List invoices for the authenticated user.
   * Optional: ?contractId=<uuid>&status=pending|completed|failed|refunded
   */
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

  /**
   * GET /invoices/:id
   * Get a single invoice by ID.
   */
  @Get(':id')
  async getInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('get_invoice', { id }));
  }

  /**
   * PATCH /invoices/:id
   * Update invoice status, due date, or notes.
   */
  @Patch(':id')
  async updateInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return callMicroservice(
      this.client.send('update_invoice', { id, ...dto }),
    );
  }

  /**
   * POST /invoices/:id/send
   * Mark the invoice as sent (records sent_at timestamp in metadata).
   */
  @Post(':id/send')
  async sendInvoice(@Param('id', ParseUUIDPipe) id: string) {
    return callMicroservice(this.client.send('send_invoice', { id }));
  }
}
