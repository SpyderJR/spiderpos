// Cancela un CFDI ya timbrado (error del cajero, venta luego cancelada,
// etc.). Requiere sesión de owner/manager — un cajero no debería poder
// borrar el rastro fiscal de una venta que no es suya.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { cancelCfdi } from '../_shared/facturama.ts'

const requestSchema = z.object({
  invoice_id: z.uuid(),
  // 02 = "Comprobante emitido con errores sin relación" — el motivo más
  // común al cancelar por un dato incorrecto del cliente.
  motive: z.enum(['01', '02', '03', '04']).default('02'),
})

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

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse({ error: 'Solicitud inválida', issues: parsed.error.issues }, 400)
  }
  const { invoice_id, motive } = parsed.data

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: member, error: memberErr } = await admin
    .from('store_members')
    .select('store_id, role')
    .eq('user_id', caller.id)
    .single()
  if (memberErr || !member || !['owner', 'manager'].includes(member.role)) {
    return jsonResponse({ error: 'Solo el dueño o un gerente puede cancelar facturas' }, 403)
  }

  const { data: invoice, error: invoiceErr } = await admin
    .from('invoices')
    .select('id, store_id, facturama_id, status')
    .eq('id', invoice_id)
    .eq('store_id', member.store_id)
    .single()
  if (invoiceErr || !invoice) return jsonResponse({ error: 'Factura no encontrada' }, 404)
  if (invoice.status !== 'stamped' || !invoice.facturama_id) {
    return jsonResponse({ error: 'Esta factura no se puede cancelar' }, 409)
  }

  try {
    await cancelCfdi(invoice.facturama_id, motive)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo cancelar la factura'
    return jsonResponse({ error: message }, 502)
  }

  const { error: updateErr } = await admin
    .from('invoices')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', invoice_id)
  if (updateErr) return jsonResponse({ error: updateErr.message }, 500)

  return jsonResponse({ ok: true })
})
