import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TenantService } from './tenant.service';

@Controller()
export class TenantController {
    constructor(private readonly tenantService: TenantService) { }

    @MessagePattern('get_or_create_tenant')
    async getOrCreateTenant(@Payload() data: { ownerId: string; email: string }) {
        return await this.tenantService.getOrCreateTenant(data.ownerId, data.email);
    }

    @MessagePattern('get_tenant')
    async getTenant(@Payload() data: { tenantId: string }) {
        return await this.tenantService.getTenant(data.tenantId);
    }

    @MessagePattern('get_stripe_onboarding_link')
    async getStripeOnboardingLink(@Payload() data: { tenantId: string }) {
        return await this.tenantService.getOnboardingLink(data.tenantId);
    }
}
