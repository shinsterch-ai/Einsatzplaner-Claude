import { supabase } from '@/lib/supabase/client'

export async function resolveOrgLogoUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null
  if (/^https?:\/\//i.test(stored)) return stored

  const { data, error } = await supabase.storage
    .from('org-logos')
    .createSignedUrl(stored, 60 * 60)

  if (error || !data?.signedUrl) {
    console.error('Could not sign org-logo URL:', error)
    return null
  }
  return data.signedUrl
}
