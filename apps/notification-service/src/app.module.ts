import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from 'supabase-lib';
import { NotificationModule } from './notification/notification.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
