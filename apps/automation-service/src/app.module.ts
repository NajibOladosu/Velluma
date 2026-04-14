import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from 'supabase-lib';
import { AutomationModule } from './automation/automation.module';
import { AppController } from './app.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        SupabaseModule,
        AutomationModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule { }
