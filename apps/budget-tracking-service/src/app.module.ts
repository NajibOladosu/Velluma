import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from 'supabase-lib';
import { BudgetModule } from './budget/budget.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    BudgetModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
