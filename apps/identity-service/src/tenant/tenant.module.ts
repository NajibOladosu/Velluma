import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { StripeService } from './stripe.service';

@Module({
    controllers: [TenantController],
    providers: [TenantService, StripeService],
    exports: [TenantService, StripeService],
})
export class TenantModule { }
