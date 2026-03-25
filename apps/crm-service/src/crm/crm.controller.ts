import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CrmService } from './crm.service';

@Controller()
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @MessagePattern('list_clients')
  async listClients(@Payload() data: { tenantId: string }) {
    return await this.crmService.listClients(data.tenantId);
  }

  @MessagePattern('create_client')
  async createClient(@Payload() data: any) {
    return await this.crmService.createClient(data);
  }

  @MessagePattern('get_client_details')
  async getClientDetails(@Payload() data: { clientId: string }) {
    return await this.crmService.getClientDetails(data.clientId);
  }
}
