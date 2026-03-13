import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
    private client!: SupabaseClient;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
        const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseKey) {
            console.warn('⚠️ Supabase configuration missing. SupabaseService will not be initialized.');
            return;
        }

        this.client = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }

    getClient(): SupabaseClient {
        return this.client;
    }

    /**
     * Returns a Supabase client scoped to a specific user.
     * Use this in microservices to ensure RLS is enforced based on the requester's context.
     * @param accessToken The JWT of the authenticated user.
     */
    getScopedClient(accessToken: string): SupabaseClient {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase public configuration missing');
        }

        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
}
