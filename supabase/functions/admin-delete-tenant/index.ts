// Elimina una tienda por completo (pruebas del súper admin, o un cliente
// de efectivo que dejó de pagar y no va a regresar). Irreversible: borra
// la fila de stores (todo lo demás cae en cascada — productos, ventas,
// clientes, personal, suscripción) y además las cuentas de Supabase Auth
// de sus miembros, que no están en el árbol de FKs de la tienda.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({ store_id: z.uuid() })

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'No autenticado' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()
  if (!caller) return jsonResponse({ error: 'No autenticado' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: adminRow } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', caller.id)
    .maybeSingle()
  if (!adminRow) {
    return jsonResponse({ error: 'Solo un súper admin puede eliminar tiendas' }, 403)
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonResponse({ error: 'Solicitud inválida' }, 400)

  const { data: store } = await admin
    .from('stores')
    .select('id, is_demo')
    .eq('id', parsed.data.store_id)
    .maybeSingle()
  if (!store) return jsonResponse({ error: 'Tienda no encontrada' }, 404)
  if (store.is_demo) {
    return jsonResponse({ error: 'La tienda demo pública no se puede eliminar' }, 409)
  }

  const { data: members } = await admin
    .from('store_members')
    .select('user_id')
    .eq('store_id', store.id)

  const { error: deleteErr } = await admin.from('stores').delete().eq('id', store.id)
  if (deleteErr) return jsonResponse({ error: deleteErr.message }, 500)

  for (const member of members ?? []) {
    await admin.auth.admin.deleteUser(member.user_id).catch(() => {
      // La tienda ya se borró aunque falle limpiar alguna cuenta suelta —
      // no es motivo para reportar error al admin.
    })
  }

  return jsonResponse({ ok: true })
})
