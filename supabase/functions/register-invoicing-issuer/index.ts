// Da de alta a una tienda como Emisor en la cuenta reseller de Facturama,
// subiendo su CSD (Certificado de Sello Digital, emitido por el SAT).
//
// ⚠️ IMPORTANTE — pendiente de verificar en vivo: no se pudo confirmar el
// endpoint exacto de alta de emisor/cuenta hija contra la documentación
// pública de Facturama al construir esto (a diferencia de timbrar/
// descargar/cancelar CFDI, que sí están confirmados en _shared/facturama.ts).
// Facturama maneja esto como "cuentas" bajo el reseller; hay que confirmar
// el path y el shape exacto del body con soporte de Facturama o su
// documentación autenticada antes de usar esto en producción. La lógica de
// autenticación/autorización/guardado de abajo sí es correcta y reusable.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({
  cer_base64: z.string().min(100),
  key_base64: z.string().min(100),
  key_password: z.string().min(1),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FACTURAMA_BASE_URL = Deno.env.get('FACTURAMA_BASE_URL') ?? 'https://apisandbox.facturama.mx'
const facturamaUser = Deno.env.get('FACTURAMA_USER')
const facturamaPassword = Deno.env.get('FACTURAMA_PASSWORD')

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

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse({ error: 'Solicitud inválida', issues: parsed.error.issues }, 400)
  }
  const { cer_base64, key_base64, key_password } = parsed.data

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: member, error: memberErr } = await admin
    .from('store_members')
    .select('store_id, role')
    .eq('user_id', caller.id)
    .single()
  if (memberErr || !member || member.role !== 'owner') {
    return jsonResponse({ error: 'Solo el dueño puede configurar la facturación' }, 403)
  }

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .select('tax_data, regimen_fiscal, codigo_postal_fiscal')
    .eq('id', member.store_id)
    .single()
  const taxData = (store?.tax_data ?? {}) as { rfc?: string; razon_social?: string }
  if (storeErr || !store || !taxData.rfc || !store.regimen_fiscal || !store.codigo_postal_fiscal) {
    return jsonResponse(
      { error: 'Completa primero tu RFC, razón social, régimen fiscal y código postal en Perfil' },
      409,
    )
  }
  if (!facturamaUser || !facturamaPassword) {
    return jsonResponse({ error: 'Facturama no está configurado del lado de SpiderPOS' }, 500)
  }

  try {
    // TODO: confirmar endpoint real de alta de emisor/cuenta hija en Facturama.
    const res = await fetch(`${FACTURAMA_BASE_URL}/account`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${facturamaUser}:${facturamaPassword}`),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Rfc: taxData.rfc,
        LegalName: taxData.razon_social,
        FiscalRegime: store.regimen_fiscal,
        Cer: cer_base64,
        Key: key_base64,
        KeyPassword: key_password,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.Message ?? 'Facturama rechazó el certificado')
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo registrar el emisor'
    return jsonResponse({ error: message }, 502)
  }

  const { error: updateErr } = await admin
    .from('stores')
    .update({ facturama_issuer_ready: true })
    .eq('id', member.store_id)
  if (updateErr) return jsonResponse({ error: updateErr.message }, 500)

  return jsonResponse({ ok: true })
})
