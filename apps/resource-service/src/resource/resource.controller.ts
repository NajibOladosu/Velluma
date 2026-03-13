import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResourceService } from './resource.service';

@Controller()
export class ResourceController {
    constructor(private readonly resourceService: ResourceService) { }

    @MessagePattern('add_deliverable')
    async addDeliverable(@Payload() data: any) {
        return await this.resourceService.addDeliverable(data);
    }

    @MessagePattern('list_resources')
    async listResources(@Payload() data: { projectId: string }) {
        return await this.resourceService.listResources(data.projectId);
    }
}
