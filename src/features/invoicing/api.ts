import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { env } from '../../lib/env'
import type { Database } from '../../lib/database/types'

export type Invoice = Database['public']['Tables']['invoices']['Row']

export async function fetchInvoiceForSale(saleId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('sale_id', saleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function listInvoices(storeId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')

  const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })
  const parsed: unknown = await response.json()
  if (!response.ok) {
    const message =
      typeof parsed === 'object' && parsed && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : 'No se pudo procesar la solicitud'
    throw new Error(message)
  }
  return parsed as T
}

const createInvoiceResponseSchema = z.object({
  invoice: z.object({ id: z.string() }).passthrough(),
})

export async function createInvoice(input: {
  sale_id: string
  customer_rfc: string
  customer_name: string
  customer_email?: string
  uso_cfdi: string
}) {
  const result = await callFunction('create-invoice', input)
  return createInvoiceResponseSchema.parse(result)
}

export function cancelInvoice(invoiceId: string) {
  return callFunction<{ ok: true }>('cancel-invoice', { invoice_id: invoiceId })
}

export function registerInvoicingIssuer(input: {
  cer_base64: string
  key_base64: string
  key_password: string
}) {
  return callFunction<{ ok: true }>('register-invoicing-issuer', input)
}

export async function downloadInvoiceFile(invoiceId: string, format: 'pdf' | 'xml') {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No autenticado')

  const url = new URL(`${env.VITE_SUPABASE_URL}/functions/v1/get-invoice-file`)
  url.searchParams.set('invoice_id', invoiceId)
  url.searchParams.set('format', format)

  const response = await fetch(url.toString(), {
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  })
  if (!response.ok) {
    const parsed: unknown = await response.json().catch(() => null)
    const message =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error: unknown }).error)
        : 'No se pudo descargar el archivo'
    throw new Error(message)
  }
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = `factura.${format}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
}

/** Convierte un File a base64 puro (sin el prefijo data:...;base64,). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
