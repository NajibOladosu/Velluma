import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getMicroserviceConfig } from '../common/utils/microservice-config';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'CONTRACT_SERVICE',
                imports: [ConfigModule],
                useFactory: (configService: ConfigService) => getMicroserviceConfig(configService),
                inject: [ConfigService],
            },
        ]),
    ],
    exports: [ClientsModule],
})
export class ContractModule { }
