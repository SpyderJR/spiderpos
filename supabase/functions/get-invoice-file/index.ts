// Proxy de descarga del PDF/XML de una factura ya timbrada. Facturama exige
// Basic Auth con las credenciales de la cuenta reseller, así que el
// navegador nunca puede pedir el archivo directo — pasa siempre por aquí.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { fetchCfdiFile } from '../_shared/facturama.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  const invoiceId = url.searchParams.get('invoice_id')
  const format = url.searchParams.get('format')
  if (!invoiceId || (format !== 'pdf' && format !== 'xml')) {
    return new Response(JSON.stringify({ error: 'Parámetros inválidos' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()
  if (!caller) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: member } = await admin
    .from('store_members')
    .select('store_id')
    .eq('user_id', caller.id)
    .single()
  if (!member) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: invoice } = await admin
    .from('invoices')
    .select('facturama_id, store_id')
    .eq('id', invoiceId)
    .eq('store_id', member.store_id)
    .single()
  if (!invoice?.facturama_id) {
    return new Response(JSON.stringify({ error: 'Factura no encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const bytes = await fetchCfdiFile(invoice.facturama_id, format)
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/xml',
        'Content-Disposition': `inline; filename="factura.${format}"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo descargar el archivo'
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
