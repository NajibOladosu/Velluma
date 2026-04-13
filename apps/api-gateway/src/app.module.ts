import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from 'supabase-lib';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import { IdentityModule } from './identity/identity.module';
import { IdentityController } from './identity/identity.controller';
import { DocumentModule } from './document/document.module';
import { ProposalController } from './document/proposal.controller';
import { FinanceModule } from './finance/finance.module';
import { PaymentController } from './finance/payment.controller';
import { ContractModule } from './contract/contract.module';
import { ContractController } from './contract/contract.controller';
import { ProjectModule } from './project/project.module';
import { ProjectController } from './project/project.controller';
import { CrmModule } from './crm/crm.module';
import { CrmController } from './crm/crm.controller';
import { ResourceModule } from './resource/resource.module';
import { ResourceController } from './resource/resource.controller';
import { TimeModule } from './time/time.module';
import { TimeController } from './time/time.controller';
import { BudgetModule } from './budget/budget.module';
import { BudgetController } from './budget/budget.controller';
import { NotificationModule } from './notification/notification.module';
import { NotificationController } from './notification/notification.controller';
import { AutomationModule } from './automation/automation.module';
import { AutomationController } from './automation/automation.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // -------------------------------------------------------------------------
    // Rate limiting — two named tiers so individual routes can opt into stricter
    // limits without hardcoding numbers everywhere.
    //
    // • default  100 req / 60 s  — general authenticated API usage
    // • strict    10 req / 60 s  — payments, signing, provisioning
    //
    // Storage: in-memory (single instance).  For multi-instance deployments,
    // swap the default store for ThrottlerStorageRedisService from
    // @nest-lab/throttler-storage-redis.
    // -------------------------------------------------------------------------
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 1 minute in ms
        limit: 100,
      },
      {
        name: 'strict',
        ttl: 60_000,
        limit: 10,
      },
    ]),

    SupabaseModule,
    IdentityModule,
    DocumentModule,
    FinanceModule,
    ContractModule,
    ProjectModule,
    CrmModule,
    ResourceModule,
    TimeModule,
    BudgetModule,
    NotificationModule,
    AutomationModule,
  ],
  controllers: [
    AppController,
    IdentityController,
    ProposalController,
    PaymentController,
    ContractController,
    ProjectController,
    CrmController,
    ResourceController,
    TimeController,
    BudgetController,
    NotificationController,
    AutomationController,
  ],
  providers: [
    AppService,
    // Guards run in registration order. Auth guard sets req.user first so that
    // the throttler guard can key on the user ID.
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
