// Modo demo público (pulido post-Fase 11): un tendero prueba SpiderPOS
// completo sin pagar ni crear cuenta. Inicia sesión como el dueño de la
// ÚNICA tienda marcada is_demo = true (compartida entre todos los
// visitantes; se resetea a diario vía pg_cron — ver migración
// 00000000000024_demo_mode.sql). El correo es opcional, solo para lead
// capture real en demo_leads; nunca se usa para autenticar.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({ email: z.email().optional() })

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return jsonResponse({ error: 'Solicitud inválida' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (parsed.data.email) {
    await admin.from('demo_leads').insert({ email: parsed.data.email })
  }

  const { data: demoStore, error: storeErr } = await admin
    .from('stores')
    .select('id')
    .eq('is_demo', true)
    .maybeSingle()
  if (storeErr || !demoStore) {
    return jsonResponse({ error: 'El modo demo no está disponible en este momento' }, 503)
  }

  const { data: owner, error: ownerErr } = await admin
    .from('store_members')
    .select('user_id')
    .eq('store_id', demoStore.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (ownerErr || !owner) {
    return jsonResponse({ error: 'El modo demo no está disponible en este momento' }, 503)
  }

  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(owner.user_id)
  if (userErr || !userRes.user?.email) {
    return jsonResponse({ error: 'No se pudo iniciar la sesión demo' }, 500)
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userRes.user.email,
  })
  if (linkErr || !linkData.properties?.hashed_token) {
    return jsonResponse({ error: 'No se pudo iniciar la sesión demo' }, 500)
  }

  return jsonResponse({
    email: userRes.user.email,
    token_hash: linkData.properties.hashed_token,
  })
})
