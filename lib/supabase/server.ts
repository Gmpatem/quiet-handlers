// Re-export from supabaseServer for compatibility
import { supabaseServer } from '../supabaseServer';

export async function createClient() {
  return await supabaseServer();
}
