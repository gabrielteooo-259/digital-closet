import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null

export type Household = {
  id: string
  name: string
  invite_code: string
}

export type Profile = {
  id: string
  household_id: string
  display_name: string | null
}
