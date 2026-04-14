import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from 'supabase-lib';
import { TenantModule } from './tenant/tenant.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    TenantModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
