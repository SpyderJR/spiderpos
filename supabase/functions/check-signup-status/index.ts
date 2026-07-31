// Página de retorno del checkout (PRD 4.2 paso 4: "acceso inmediato").
//
// El navegador vuelve del checkout de Mercado Pago antes de que el
// webhook (async, servidor a servidor) haya terminado de provisionar el
// tenant. Esta función es sondeada por el frontend cada ~1.5s con el
// signup_id; en cuanto pending_signups.status = 'provisioned' devuelve
// un magic-link real de Supabase Auth (mismo patrón que pin-login) para
// iniciar sesión sin esperar un correo.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({ signup_id: z.uuid() })

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse({ error: 'Solicitud inválida' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: signup, error } = await admin
    .from('pending_signups')
    .select('status, owner_email')
    .eq('id', parsed.data.signup_id)
    .maybeSingle()

  if (error || !signup) {
    return jsonResponse({ error: 'Registro no encontrado' }, 404)
  }

  if (signup.status !== 'provisioned') {
    return jsonResponse({ status: signup.status })
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: signup.owner_email,
  })
  if (linkErr || !linkData.properties?.hashed_token) {
    return jsonResponse({ status: 'provisioned', error: 'No se pudo generar el acceso' }, 500)
  }

  return jsonResponse({
    status: 'provisioned',
    email: signup.owner_email,
    token_hash: linkData.properties.hashed_token,
  })
})
