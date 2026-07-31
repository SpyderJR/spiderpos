import { supabase } from '../../../lib/supabase'
import type { Database } from '../../../lib/database/types'

type StoreUpdate = Database['public']['Tables']['stores']['Update']

export async function updateStoreProfile(storeId: string, values: StoreUpdate) {
  const { data, error } = await supabase
    .from('stores')
    .update(values)
    .eq('id', storeId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadStoreLogo(storeId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${storeId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('store-logos')
    .upload(path, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const {
    data: { publicUrl },
  } = supabase.storage.from('store-logos').getPublicUrl(path)

  // Cache-bust: el nombre de archivo no cambia entre subidas (upsert), así
  // que sin esto el navegador seguiría mostrando el logo anterior.
  const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`

  await updateStoreProfile(storeId, { logo_url: cacheBustedUrl })
  return cacheBustedUrl
}
