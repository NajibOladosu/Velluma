import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InvoiceService } from './invoice.service';
import type { CreateInvoiceDto } from './dto/create-invoice.dto';
import type { ListInvoicesDto } from './dto/list-invoices.dto';
import type { UpdateInvoiceDto } from './dto/update-invoice.dto';

@Controller()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @MessagePattern('create_invoice')
  async createInvoice(@Payload() data: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(data);
  }

  @MessagePattern('list_invoices')
  async listInvoices(@Payload() query: ListInvoicesDto) {
    return this.invoiceService.listInvoices(query);
  }

  @MessagePattern('get_invoice')
  async getInvoice(@Payload() data: { id: string }) {
    return this.invoiceService.getInvoice(data.id);
  }

  @MessagePattern('update_invoice')
  async updateInvoice(@Payload() data: UpdateInvoiceDto) {
    return this.invoiceService.updateInvoice(data);
  }

  @MessagePattern('send_invoice')
  async sendInvoice(@Payload() data: { id: string }) {
    return this.invoiceService.sendInvoice(data.id);
  }
}
