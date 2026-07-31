// Webhook de Mercado Pago (PRD 4.2 pasos 2-3, 5-7).
//
// Único punto donde se provisiona un tenant nuevo o se actualiza el
// estado de una suscripción — nunca desde el cliente. Dos tipos de
// notificación nos importan:
//   - subscription_preapproval: cambios de estado de la suscripción
//     recurrente (authorized -> provisiona el tenant si es la primera
//     vez; paused/cancelled -> suspende el acceso).
//   - subscription_authorized_payment: cada cobro periódico exitoso o
//     fallido dentro de una suscripción ya activa (renovación, PRD 4.2.5).
//
// Idempotencia: se comprueba webhook_events ANTES de procesar y solo se
// escribe DESPUÉS de procesar con éxito — nunca antes. Si se marcara como
// visto antes de procesar, un fallo a medio camino (p. ej. un hipo
// transitorio de la API de MP) haría que el reintento de MP se descartara
// como "duplicado" sin que la provisión o el cobro se hubieran aplicado
// realmente. Como defensa adicional, los efectos de negocio son
// naturalmente idempotentes (pending_signups.status, unique en
// subscription_payments.provider_payment_id).
//
// Firma: si MERCADOPAGO_WEBHOOK_SECRET está configurado (se genera en el
// dashboard de Mercado Pago, Integraciones > Webhooks — no disponible vía
// API), se valida x-signature/x-request-id según el algoritmo oficial. Si
// no está configurado (p. ej. en pruebas con sandbox), se registra un
// aviso y se continúa: preferible aceptar la notificación real de MP a
// bloquear todo el flujo por falta de un secreto que solo el dashboard
// entrega.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')

async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  if (!webhookSecret) {
    console.warn('MERCADOPAGO_WEBHOOK_SECRET no configurado — se omite validación de firma')
    return true
  }
  const signatureHeader = req.headers.get('x-signature')
  const requestId = req.headers.get('x-request-id')
  if (!signatureHeader || !requestId) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k.trim(), v?.trim()]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computed === v1
}

async function mpFetch(path: string) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  })
  if (!res.ok) throw new Error(`Mercado Pago API ${path} -> ${res.status}`)
  return res.json()
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const body = await req.json().catch(() => ({}))
  const type: string = body.type ?? url.searchParams.get('type') ?? ''
  const dataId: string = body.data?.id ?? url.searchParams.get('data.id') ?? ''

  if (!type || !dataId) {
    return jsonResponse({ ok: true, ignored: 'sin data.id/type' })
  }

  const validSignature = await verifySignature(req, dataId)
  if (!validSignature) {
    return jsonResponse({ error: 'Firma inválida' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const eventId = `${type}:${dataId}`

  // Se comprueba (no se marca) ANTES de procesar: si un intento previo
  // falló a medio camino (p. ej. un hipo transitorio de la API de MP),
  // el evento NUNCA se registró como completado, así que un reintento de
  // MP debe volver a intentarse — no perderse silenciosamente. El
  // registro en webhook_events solo se escribe DESPUÉS de procesar con
  // éxito (ver abajo), y sirve como bitácora + defensa adicional junto
  // con las guardas de idempotencia a nivel de negocio (pending_signups
  // .status, unique(subscription_payments.provider_payment_id)).
  const { data: existing } = await admin
    .from('webhook_events')
    .select('id')
    .eq('provider', 'mercadopago')
    .eq('id', eventId)
    .maybeSingle()

  if (existing) {
    return jsonResponse({ ok: true, duplicate: true })
  }

  try {
    if (type === 'subscription_preapproval') {
      await handlePreapproval(admin, dataId)
    } else if (type === 'subscription_authorized_payment') {
      await handleAuthorizedPayment(admin, dataId)
    }
  } catch (err) {
    console.error('Error procesando webhook:', err)
    return jsonResponse({ error: 'Error procesando notificación' }, 500)
  }

  await admin
    .from('webhook_events')
    .insert({ id: eventId, provider: 'mercadopago', event_type: type, payload: body })

  return jsonResponse({ ok: true })
})

async function handlePreapproval(admin: ReturnType<typeof createClient>, preapprovalId: string) {
  const preapproval = await mpFetch(`/preapproval/${preapprovalId}`)
  const status: string = preapproval.status
  const externalReference: string | null = preapproval.external_reference ?? null

  if (!externalReference) return

  const { data: signup } = await admin
    .from('pending_signups')
    .select('*')
    .eq('id', externalReference)
    .maybeSingle()

  if (signup && signup.status === 'pending' && status === 'authorized') {
    await provisionTenant(admin, signup, preapprovalId)
    return
  }

  if (signup?.store_id) {
    const mapped =
      status === 'authorized' ? 'active' : status === 'paused' ? 'suspended' : 'cancelled'
    await admin
      .from('stores')
      .update({ subscription_status: mapped, updated_at: new Date().toISOString() })
      .eq('id', signup.store_id)
    await admin
      .from('subscriptions')
      .update({ status: mapped, updated_at: new Date().toISOString() })
      .eq('store_id', signup.store_id)
    return
  }

  // La suscripción no vino de un pending_signup rastreado (p. ej. una
  // reactivación que generó un preapproval nuevo) — se busca por
  // provider_sub_id directamente.
  const mapped =
    status === 'authorized' ? 'active' : status === 'paused' ? 'suspended' : 'cancelled'
  const { data: sub } = await admin
    .from('subscriptions')
    .select('store_id')
    .eq('provider_sub_id', preapprovalId)
    .maybeSingle()
  if (sub) {
    await admin
      .from('stores')
      .update({ subscription_status: mapped, updated_at: new Date().toISOString() })
      .eq('id', sub.store_id)
    await admin
      .from('subscriptions')
      .update({ status: mapped, updated_at: new Date().toISOString() })
      .eq('store_id', sub.store_id)
  }
}

async function provisionTenant(
  admin: ReturnType<typeof createClient>,
  signup: Record<string, string>,
  preapprovalId: string,
) {
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: signup.owner_email,
    password: crypto.randomUUID(),
    email_confirm: true,
  })
  if (createErr || !newUser.user)
    throw new Error(createErr?.message ?? 'No se pudo crear el usuario')

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
  if (storeErr || !store) throw new Error(storeErr?.message ?? 'No se pudo crear la tienda')

  await admin.from('store_members').insert({
    user_id: newUser.user.id,
    store_id: store.id,
    role: 'owner',
    full_name: signup.owner_full_name,
    active: true,
  })

  await admin.from('subscriptions').insert({
    store_id: store.id,
    provider: 'mercadopago',
    provider_sub_id: preapprovalId,
    status: 'active',
    plan: signup.plan,
    current_period_end: periodEnd.toISOString(),
  })

  await admin.rpc('seed_store_catalog', { p_store_id: store.id })

  await admin
    .from('pending_signups')
    .update({ status: 'provisioned', store_id: store.id, provisioned_at: new Date().toISOString() })
    .eq('id', signup.id)
}

async function handleAuthorizedPayment(admin: ReturnType<typeof createClient>, paymentId: string) {
  const payment = await mpFetch(`/authorized_payments/${paymentId}`)
  const preapprovalId: string = payment.preapproval_id
  const status: string = payment.status

  const { data: sub } = await admin
    .from('subscriptions')
    .select('id, store_id, plan')
    .eq('provider_sub_id', preapprovalId)
    .maybeSingle()
  if (!sub) return

  const mappedStatus =
    status === 'processed' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending'

  const { error: paymentInsertErr } = await admin.from('subscription_payments').insert({
    subscription_id: sub.id,
    store_id: sub.store_id,
    provider_payment_id: String(paymentId),
    amount: payment.transaction_amount ?? 0,
    status: mappedStatus,
    paid_at: mappedStatus === 'approved' ? new Date().toISOString() : null,
  })
  // 23505 = ya se había registrado este pago (unique(provider_payment_id));
  // no se reaplican los efectos secundarios (extender periodo, etc.).
  if (paymentInsertErr) {
    if (paymentInsertErr.code === '23505') return
    throw paymentInsertErr
  }

  if (mappedStatus === 'approved') {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + (sub.plan === 'annual' ? 12 : 1))
    await admin
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id)
    await admin
      .from('stores')
      .update({ subscription_status: 'active', updated_at: new Date().toISOString() })
      .eq('id', sub.store_id)
  } else if (mappedStatus === 'rejected') {
    await admin
      .from('subscriptions')
      .update({ status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', sub.id)
    await admin
      .from('stores')
      .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
      .eq('id', sub.store_id)
  }
}
