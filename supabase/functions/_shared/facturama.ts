// Cliente delgado para la API de Facturama (PAC único de SpiderPOS — ver
// migración 00000000000032_invoicing.sql para el porqué del modelo).
//
// Endpoints confirmados contra la documentación pública de Facturama:
//   - Auth: HTTP Basic (usuario/contraseña de la cuenta reseller)
//   - Timbrar:   POST /cfdis
//   - Descargar: GET  /Cfdi/{pdf|xml}/{issued|received}/{id}
//   - Cancelar:  DELETE /cfdi/{id}/{type}/{motive}/{uuidReplacement}
// El body exacto de /cfdis y el endpoint de alta de emisor (CSD) no se
// pudieron verificar en línea al construir esto — quedan marcados con
// TODO abajo para confirmarlos contra el sandbox real antes de operar en
// producción.

const FACTURAMA_BASE_URL = Deno.env.get('FACTURAMA_BASE_URL') ?? 'https://apisandbox.facturama.mx'
const facturamaUser = Deno.env.get('FACTURAMA_USER')
const facturamaPassword = Deno.env.get('FACTURAMA_PASSWORD')

function authHeader(): string {
  if (!facturamaUser || !facturamaPassword) {
    throw new Error('Facturama no está configurado (FACTURAMA_USER/FACTURAMA_PASSWORD)')
  }
  return 'Basic ' + btoa(`${facturamaUser}:${facturamaPassword}`)
}

export interface FacturamaItem {
  ProductCode: string
  IdentificationNumber: string
  Description: string
  Unit: string
  UnitCode: string
  UnitPrice: number
  Quantity: number
  Subtotal: number
  TaxObject: '01' | '02'
  Taxes?: { Total: number; Name: 'IVA'; Base: number; Rate: number; IsRetention: boolean }[]
  Total: number
}

export interface FacturamaCfdiRequest {
  CfdiType: 'I'
  ExpeditionPlace: string
  PaymentForm: string
  PaymentMethod: 'PUE' | 'PPD'
  Currency: 'MXN'
  Issuer: { Rfc: string; Name: string; FiscalRegime: string }
  Receiver: { Rfc: string; Name: string; CfdiUse: string; FiscalRegime: string; TaxZipCode: string }
  Items: FacturamaItem[]
}

export interface FacturamaCfdiResponse {
  Id: string
  Complement?: { TaxStamp?: { Uuid?: string } }
  Message?: string
  ModelState?: Record<string, string[]>
}

// TODO: confirmar contra el sandbox real si el path es "/cfdis" o
// "/3/cfdis" — la documentación pública referenciaba ambas formas según la
// versión de la guía.
export async function stampCfdi(body: FacturamaCfdiRequest): Promise<FacturamaCfdiResponse> {
  const res = await fetch(`${FACTURAMA_BASE_URL}/3/cfdis`, {
    method: 'POST',
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as FacturamaCfdiResponse
  if (!res.ok) {
    const detail = data.ModelState ? Object.values(data.ModelState).flat().join(' ') : undefined
    throw new Error(detail || data.Message || 'Facturama no pudo timbrar el CFDI')
  }
  return data
}

export async function fetchCfdiFile(id: string, format: 'pdf' | 'xml'): Promise<Uint8Array> {
  const res = await fetch(`${FACTURAMA_BASE_URL}/Cfdi/${format}/issued/${id}`, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) throw new Error(`No se pudo descargar el ${format.toUpperCase()} de la factura`)
  return new Uint8Array(await res.arrayBuffer())
}

export async function cancelCfdi(
  id: string,
  motive: '01' | '02' | '03' | '04',
  uuidReplacement?: string,
): Promise<void> {
  const path = uuidReplacement
    ? `/cfdi/${id}/issued/${motive}/${uuidReplacement}`
    : `/cfdi/${id}/issued/${motive}`
  const res = await fetch(`${FACTURAMA_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.Message ?? 'No se pudo cancelar la factura en el SAT')
  }
}

// Mapea la unidad interna del producto al catálogo SAT c_ClaveUnidad.
export const SAT_UNIT_CODE: Record<string, { code: string; label: string }> = {
  piece: { code: 'H87', label: 'Pieza' },
  kg: { code: 'KGM', label: 'Kilogramo' },
  g: { code: 'GRM', label: 'Gramo' },
  lt: { code: 'LTR', label: 'Litro' },
  m: { code: 'MTR', label: 'Metro' },
}

// Clave genérica del catálogo SAT c_ClaveProdServ para negocios que no
// clasifican cada producto — válida y de uso extendido en pequeño comercio.
export const SAT_GENERIC_PROD_CODE = '01010101'
