import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from 'supabase-lib';
import { ExpenseModule } from './expense/expense.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ExpenseModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
