// Timbrado de CFDI 4.0 para una venta ya cobrada (PRD facturación
// electrónica). Requiere sesión de un miembro de la tienda. La tienda
// nunca ve ni maneja credenciales de Facturama — todo pasa por aquí con
// service_role, igual que create-checkout con Mercado Pago.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { stampCfdi, SAT_UNIT_CODE, SAT_GENERIC_PROD_CODE } from '../_shared/facturama.ts'
import type { FacturamaItem } from '../_shared/facturama.ts'

const requestSchema = z.object({
  sale_id: z.uuid(),
  customer_rfc: z.string().trim().toUpperCase().min(12).max(13),
  customer_name: z.string().trim().min(1).max(200),
  customer_email: z.email().optional().or(z.literal('')),
  uso_cfdi: z.string().trim().min(3).max(4),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

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
  const { sale_id, customer_rfc, customer_name, customer_email, uso_cfdi } = parsed.data

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: member, error: memberErr } = await admin
    .from('store_members')
    .select('id, store_id')
    .eq('user_id', caller.id)
    .single()
  if (memberErr || !member) return jsonResponse({ error: 'No autorizado' }, 403)

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .select('id, name, tax_data, regimen_fiscal, codigo_postal_fiscal, facturama_issuer_ready')
    .eq('id', member.store_id)
    .single()
  if (storeErr || !store) return jsonResponse({ error: 'Tienda no encontrada' }, 404)

  const taxData = (store.tax_data ?? {}) as { rfc?: string; razon_social?: string }
  if (
    !store.facturama_issuer_ready ||
    !taxData.rfc ||
    !taxData.razon_social ||
    !store.regimen_fiscal ||
    !store.codigo_postal_fiscal
  ) {
    return jsonResponse(
      {
        error:
          'Tu tienda todavía no tiene la facturación configurada. Ve a Perfil → Facturación electrónica.',
      },
      409,
    )
  }

  const { data: sale, error: saleErr } = await admin
    .from('sales')
    .select('id, store_id, total, tax, status')
    .eq('id', sale_id)
    .eq('store_id', member.store_id)
    .single()
  if (saleErr || !sale) return jsonResponse({ error: 'Venta no encontrada' }, 404)
  if (sale.status !== 'completed') {
    return jsonResponse({ error: 'Solo se pueden facturar ventas completadas' }, 409)
  }

  const { data: existing } = await admin
    .from('invoices')
    .select('id')
    .eq('sale_id', sale_id)
    .eq('status', 'stamped')
    .maybeSingle()
  if (existing) return jsonResponse({ error: 'Esta venta ya tiene una factura vigente' }, 409)

  const { data: items, error: itemsErr } = await admin
    .from('sale_items')
    .select('quantity, unit_price, subtotal, products(name, unit_type)')
    .eq('sale_id', sale_id)
  if (itemsErr || !items || items.length === 0) {
    return jsonResponse({ error: 'La venta no tiene artículos que facturar' }, 409)
  }

  const hasTax = Number(sale.tax) > 0
  const taxRate = hasTax ? round2(Number(sale.tax)) / Number(sale.total) : 0

  const facturamaItems: FacturamaItem[] = items.map((item) => {
    const unit = SAT_UNIT_CODE[item.products?.unit_type ?? 'piece'] ?? SAT_UNIT_CODE.piece
    const subtotal = Number(item.subtotal)
    const taxAmount = hasTax ? round2(subtotal * taxRate) : 0
    return {
      ProductCode: SAT_GENERIC_PROD_CODE,
      IdentificationNumber: SAT_GENERIC_PROD_CODE,
      Description: item.products?.name ?? 'Producto',
      Unit: unit.label,
      UnitCode: unit.code,
      UnitPrice: Number(item.unit_price),
      Quantity: Number(item.quantity),
      Subtotal: subtotal,
      TaxObject: hasTax ? '02' : '01',
      Taxes: hasTax
        ? [{ Total: taxAmount, Name: 'IVA', Base: subtotal, Rate: taxRate, IsRetention: false }]
        : undefined,
      Total: subtotal + taxAmount,
    }
  })

  const isPublicoGeneral = customer_rfc === 'XAXX010101000'

  try {
    const result = await stampCfdi({
      CfdiType: 'I',
      ExpeditionPlace: store.codigo_postal_fiscal,
      PaymentForm: '01',
      PaymentMethod: 'PUE',
      Currency: 'MXN',
      Issuer: { Rfc: taxData.rfc, Name: taxData.razon_social, FiscalRegime: store.regimen_fiscal },
      Receiver: {
        Rfc: customer_rfc,
        Name: customer_name,
        CfdiUse: uso_cfdi,
        FiscalRegime: isPublicoGeneral ? '616' : store.regimen_fiscal,
        TaxZipCode: store.codigo_postal_fiscal,
      },
      Items: facturamaItems,
    })

    const { data: invoice, error: insertErr } = await admin
      .from('invoices')
      .insert({
        store_id: member.store_id,
        sale_id,
        issued_by: member.id,
        facturama_id: result.Id,
        uuid_fiscal: result.Complement?.TaxStamp?.Uuid ?? null,
        customer_rfc,
        customer_name,
        customer_email: customer_email || null,
        uso_cfdi,
        total: sale.total,
        status: 'stamped',
      })
      .select('*')
      .single()
    if (insertErr) return jsonResponse({ error: insertErr.message }, 500)

    return jsonResponse({ invoice })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo timbrar la factura'
    await admin.from('invoices').insert({
      store_id: member.store_id,
      sale_id,
      issued_by: member.id,
      customer_rfc,
      customer_name,
      customer_email: customer_email || null,
      uso_cfdi,
      total: sale.total,
      status: 'error',
      error_message: message,
    })
    return jsonResponse({ error: message }, 502)
  }
})
