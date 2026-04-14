import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getMicroserviceConfig } from '../common/utils/microservice-config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'FINANCE_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) =>
          getMicroserviceConfig(configService),
        inject: [ConfigService],
      },
    ]),
  ],
  exports: [ClientsModule],
})
// Note: InvoiceController and PaymentController are registered on AppModule
// so they share the FINANCE_SERVICE client token exported from ClientsModule.
export class FinanceModule {}
