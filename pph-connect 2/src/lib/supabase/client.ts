import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Helper function to test connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('departments').select('count')
    if (error) throw error
    return { success: true, message: 'Connected to Supabase' }
  } catch (error) {
    return { success: false, message: `Connection failed: ${error}` }
  }
}
