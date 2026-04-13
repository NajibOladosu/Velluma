import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      },
    ]),
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
