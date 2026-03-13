import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
  providers: [AppService],
})
export class AppModule { }
