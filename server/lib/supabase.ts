import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Validação das variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL é obrigatória. Configure no arquivo .env');
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY é obrigatória. Configure no arquivo .env');
}

// Cliente Supabase para uso no servidor (com service role key para bypass de RLS)
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cliente para operações com autenticação do usuário
export function createSupabaseClient(accessToken?: string) {
  return createClient<Database>(
    supabaseUrl!,
    supabaseServiceRoleKey!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : {}
      }
    }
  );
}

export default supabase;

