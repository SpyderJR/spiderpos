// Reactivación desde el paywall y upgrade mensual→anual (PRD 4.2.6-7, 5.A).
//
// Requiere sesión de owner. Crea una nueva suscripción recurrente (Mercado
// Pago no permite reactivar de forma confiable una preapproval cancelada,
// así que "regularizar pago" y "upgrade" siempre generan una preapproval
// nueva) con external_reference = store_id, y actualiza
// subscriptions.provider_sub_id de inmediato para que el webhook —cuando
// llegue la confirmación de pago— sepa a qué tienda pertenece este nuevo
// id (ver mercadopago-webhook: fallback por provider_sub_id).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({
  action: z.enum(['reactivate', 'upgrade']),
  new_plan: z.enum(['monthly', 'annual']).optional(),
  return_url: z.url(),
})

// Ver create-checkout/index.ts: Mercado Pago no soporta frequency_type
// "years", así que el plan anual es "cada 12 meses".
const PLAN_PRICING = {
  monthly: { amount: 299, frequency: 1, frequency_type: 'months' as const },
  annual: { amount: 2990, frequency: 12, frequency_type: 'months' as const },
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

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

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse({ error: 'Solicitud inválida', issues: parsed.error.issues }, 400)
  }
  const { action, new_plan, return_url } = parsed.data

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: member, error: memberErr } = await admin
    .from('store_members')
    .select('store_id, role')
    .eq('user_id', caller.id)
    .single()
  if (memberErr || !member || member.role !== 'owner') {
    return jsonResponse({ error: 'Solo el dueño puede gestionar la suscripción' }, 403)
  }

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .select('id, name')
    .eq('id', member.store_id)
    .single()
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, plan, provider_sub_id')
    .eq('store_id', member.store_id)
    .maybeSingle()
  if (storeErr || !store) return jsonResponse({ error: 'Tienda no encontrada' }, 404)

  const targetPlan = action === 'upgrade' && new_plan ? new_plan : (subscription?.plan ?? 'monthly')
  const pricing = PLAN_PRICING[targetPlan]

  let preapproval: { id?: string; init_point?: string; message?: string }
  try {
    const preapprovalRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${member.store_id}-${Date.now()}`,
      },
      body: JSON.stringify({
        reason: `SpiderPOS — Plan ${targetPlan === 'monthly' ? 'Mensual' : 'Anual'} (${store.name})`,
        external_reference: store.id,
        payer_email: caller.email,
        back_url: return_url,
        auto_recurring: {
          frequency: pricing.frequency,
          frequency_type: pricing.frequency_type,
          transaction_amount: pricing.amount,
          currency_id: 'MXN',
        },
      }),
    })
    preapproval = await preapprovalRes.json()
    if (!preapprovalRes.ok || !preapproval.init_point) {
      return jsonResponse(
        { error: preapproval.message ?? 'No se pudo crear la suscripción en Mercado Pago' },
        502,
      )
    }
  } catch {
    return jsonResponse(
      { error: 'No se pudo conectar con Mercado Pago, intenta de nuevo en un momento' },
      502,
    )
  }

  if (subscription?.provider_sub_id) {
    await fetch(`https://api.mercadopago.com/preapproval/${subscription.provider_sub_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${mpAccessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    }).catch(() => null)
  }

  await admin
    .from('subscriptions')
    .update({
      provider_sub_id: preapproval.id,
      plan: targetPlan,
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', member.store_id)

  return jsonResponse({ checkout_url: preapproval.init_point })
})
