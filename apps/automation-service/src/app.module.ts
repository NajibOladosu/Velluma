import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from 'supabase-lib';
import { AutomationModule } from './automation/automation.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        SupabaseModule,
        AutomationModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
