import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { normalizeSupabaseUrl } from './supabase-url'

export function createSupabaseAdminClient(
  configService: ConfigService,
): SupabaseClient {
  const url = configService.get<string>('SUPABASE_URL')
  const serviceKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  }

  return createClient(normalizeSupabaseUrl(url), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
