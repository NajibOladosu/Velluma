import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from 'supabase-lib';
import { ResourceModule } from './resource/resource.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    ResourceModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
