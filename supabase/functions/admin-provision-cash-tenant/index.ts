// Da de alta una tienda a partir de una solicitud de pago en efectivo, una
// vez que el súper admin ya cobró por fuera de la app (efectivo,
// transferencia directa, etc.). Mismo patrón de aprovisionamiento que
// mercadopago-webhook.provisionTenant, pero disparado a mano en vez de por
// webhook — porque en efectivo no hay una confirmación automática de pago.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({ request_id: z.uuid() })

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
    return jsonResponse({ error: 'Solo un súper admin puede dar de alta tiendas' }, 403)
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return jsonResponse({ error: 'Solicitud inválida' }, 400)

  const { data: signup, error: signupErr } = await admin
    .from('cash_signup_requests')
    .select('*')
    .eq('id', parsed.data.request_id)
    .single()
  if (signupErr || !signup) return jsonResponse({ error: 'Solicitud no encontrada' }, 404)
  if (signup.status !== 'pending') {
    return jsonResponse({ error: 'Esta solicitud ya fue procesada' }, 409)
  }

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: signup.owner_email,
    password: crypto.randomUUID(),
    email_confirm: true,
  })
  if (createErr || !newUser.user) {
    return jsonResponse({ error: createErr?.message ?? 'No se pudo crear el usuario' }, 500)
  }

  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + (signup.plan === 'annual' ? 12 : 1))

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .insert({
      name: signup.business_name,
      business_type: signup.business_type,
      subscription_status: 'active',
      plan: signup.plan,
    })
    .select('id')
    .single()
  if (storeErr || !store) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return jsonResponse({ error: storeErr?.message ?? 'No se pudo crear la tienda' }, 500)
  }

  await admin.from('store_members').insert({
    user_id: newUser.user.id,
    store_id: store.id,
    role: 'owner',
    full_name: signup.owner_full_name,
    active: true,
  })

  await admin.from('subscriptions').insert({
    store_id: store.id,
    provider: 'cash',
    status: 'active',
    plan: signup.plan,
    current_period_end: periodEnd.toISOString(),
  })

  await admin.rpc('seed_store_catalog', { p_store_id: store.id })

  await admin
    .from('cash_signup_requests')
    .update({ status: 'provisioned', store_id: store.id, provisioned_at: new Date().toISOString() })
    .eq('id', signup.id)

  return jsonResponse({ store_id: store.id })
})
