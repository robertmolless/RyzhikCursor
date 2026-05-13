import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const saveCloudSnapshot = async (playerId: string, snapshot: unknown) => {
  if (!supabase) return { ok: false, reason: 'supabase-not-configured' };
  const { error } = await supabase.from('ryzhik_saves').upsert({
    player_id: playerId,
    snapshot,
    updated_at: new Date().toISOString(),
  });
  return error ? { ok: false, reason: error.message } : { ok: true };
};
