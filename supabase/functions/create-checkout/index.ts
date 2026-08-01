// Registro y compra de suscripción (PRD 4.2 paso 1-2).
//
// Público (sin auth): el dueño todavía no tiene cuenta. Guarda los datos
// del formulario en pending_signups (indexados por external_reference) y
// crea una suscripción recurrente (preapproval) en Mercado Pago. El
// webhook mercadopago-webhook es quien, al recibir la confirmación de
// pago, provisiona el tenant real — este endpoint NUNCA toca `stores`
// ni Supabase Auth.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({
  business_name: z.string().trim().min(2).max(100),
  business_type: z.enum(['abarrotes', 'papeleria', 'farmacia', 'ferreteria']),
  owner_full_name: z.string().trim().min(2).max(100),
  owner_email: z.email(),
  plan: z.enum(['monthly', 'annual']),
  // Mercado Pago (modo producción) rechaza cualquier back_url que no sea
  // https:// — por eso probar el pago completo desde localhost (http://)
  // siempre falla del lado de MP, no es un bug de la app. Se valida aquí
  // primero para dar un mensaje claro en vez del error críptico de MP.
  return_base_url: z.url().refine((url) => url.startsWith('https://'), {
    message:
      'El pago con tarjeta solo se puede probar desde el sitio publicado (https://spiderpos.netlify.app), no desde localhost — Mercado Pago rechaza URLs de retorno sin https.',
  }),
})

// La API de preapproval de Mercado Pago solo acepta frequency_type "days" o
// "months" — "years" no existe y provoca "Invalid value for frequency type".
// El plan anual se modela como un cobro cada 12 meses.
const PLAN_PRICING = {
  monthly: { amount: 299, frequency: 1, frequency_type: 'months' as const },
  annual: { amount: 2990, frequency: 12, frequency_type: 'months' as const },
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message
    return jsonResponse(
      { error: firstIssue ?? 'Solicitud inválida', issues: parsed.error.issues },
      400,
    )
  }
  const { business_name, business_type, owner_full_name, owner_email, plan, return_base_url } =
    parsed.data
  const pricing = PLAN_PRICING[plan]

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: signup, error: signupErr } = await admin
    .from('pending_signups')
    .insert({
      business_name,
      business_type,
      owner_full_name,
      owner_email,
      plan,
    })
    .select('id')
    .single()

  if (signupErr || !signup) {
    return jsonResponse({ error: 'No se pudo iniciar el registro' }, 500)
  }

  const backUrl = new URL(return_base_url)
  backUrl.searchParams.set('signup_id', signup.id)

  let preapproval: { id?: string; init_point?: string; message?: string }
  try {
    const preapprovalRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': signup.id,
      },
      body: JSON.stringify({
        reason: `SpiderPOS — Plan ${plan === 'monthly' ? 'Mensual' : 'Anual'}`,
        external_reference: signup.id,
        payer_email: owner_email,
        back_url: backUrl.toString(),
        auto_recurring: {
          frequency: pricing.frequency,
          frequency_type: pricing.frequency_type,
          transaction_amount: pricing.amount,
          currency_id: 'MXN',
        },
      }),
    })
    const rawBody = await preapprovalRes.text()
    if (!preapprovalRes.ok) {
      // Mercado Pago a veces devuelve un 500 genérico propio (no un error de
      // validación) para un payer_email puntual — no es un bug de este
      // endpoint, pero mostrarle "Internal server error" al usuario es
      // alarmante y no dice qué hacer. Log para diagnóstico + mensaje
      // accionable para el usuario.
      console.error('MP preapproval rejected', preapprovalRes.status, rawBody)
    }
    preapproval = rawBody ? JSON.parse(rawBody) : {}
    if (!preapprovalRes.ok || !preapproval.init_point) {
      await admin.from('pending_signups').delete().eq('id', signup.id)
      const mpMessage = preapproval.message
      const friendly =
        !mpMessage || /internal server error/i.test(mpMessage)
          ? 'Mercado Pago no pudo procesar el registro con este correo en este momento. Intenta de nuevo en unos minutos o usa otro correo.'
          : mpMessage
      return jsonResponse({ error: friendly }, 502)
    }
  } catch (err) {
    console.error('create-checkout MP call threw', err)
    await admin.from('pending_signups').delete().eq('id', signup.id)
    return jsonResponse(
      { error: 'No se pudo conectar con Mercado Pago, intenta de nuevo en un momento' },
      502,
    )
  }

  await admin
    .from('pending_signups')
    .update({ provider_sub_id: preapproval.id })
    .eq('id', signup.id)

  return jsonResponse({ signup_id: signup.id, checkout_url: preapproval.init_point })
})
