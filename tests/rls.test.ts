import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/lib/database/types'

/**
 * Prueba de aislamiento multi-tenant contra la base de datos REAL de
 * Supabase (no un mock). Crea dos tiendas y dos dueños reales vía la
 * Admin API (service_role), inicia sesión como cada uno con credenciales
 * reales y demuestra que ninguno puede leer ni escribir datos de la otra
 * tienda — PRD criterio de aceptación #2.
 */

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY en .env para correr tests/rls.test.ts',
  )
}

const admin: SupabaseClient<Database> = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = crypto.randomUUID().slice(0, 8)
const PASSWORD = 'Rls-Test-P@ssw0rd-1234'

interface Tenant {
  storeId: string
  userId: string
  email: string
  client: SupabaseClient<Database>
  productId: string
}

let tenantA: Tenant
let tenantB: Tenant

async function provisionTenant(label: 'a' | 'b'): Promise<Tenant> {
  const email = `rls-test-${label}-${runId}@spiderpos.test`

  const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (userErr || !userRes.user) throw userErr ?? new Error('No se pudo crear el usuario de prueba')

  const { data: store, error: storeErr } = await admin
    .from('stores')
    .insert({ name: `Tienda RLS Test ${label.toUpperCase()} ${runId}`, business_type: 'abarrotes' })
    .select('id')
    .single()
  if (storeErr || !store) throw storeErr ?? new Error('No se pudo crear la tienda de prueba')

  const { error: memberErr } = await admin.from('store_members').insert({
    user_id: userRes.user.id,
    store_id: store.id,
    role: 'owner',
    full_name: `Owner ${label.toUpperCase()}`,
  })
  if (memberErr) throw memberErr

  const { error: seedErr } = await admin.rpc('seed_store_catalog', { p_store_id: store.id })
  if (seedErr) throw seedErr

  const { data: product, error: productErr } = await admin
    .from('products')
    .select('id')
    .eq('store_id', store.id)
    .limit(1)
    .single()
  if (productErr || !product) throw productErr ?? new Error('El seed no generó productos')

  const client = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } })
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (signInErr) throw signInErr

  return { storeId: store.id, userId: userRes.user.id, email, client, productId: product.id }
}

beforeAll(async () => {
  tenantA = await provisionTenant('a')
  tenantB = await provisionTenant('b')
})

afterAll(async () => {
  for (const tenant of [tenantA, tenantB]) {
    if (!tenant) continue
    await tenant.client.auth.signOut()
    await admin.from('stores').delete().eq('id', tenant.storeId)
    await admin.auth.admin.deleteUser(tenant.userId)
  }
})

describe('Aislamiento multi-tenant (RLS)', () => {
  it('auth_store_id() resuelve la tienda correcta para cada usuario autenticado', async () => {
    const { data: idA } = await tenantA.client.rpc('auth_store_id')
    const { data: idB } = await tenantB.client.rpc('auth_store_id')
    expect(idA).toBe(tenantA.storeId)
    expect(idB).toBe(tenantB.storeId)
  })

  it('el dueño de la tienda A nunca ve productos de la tienda B, ni filtrando explícitamente por su store_id', async () => {
    const { data, error } = await tenantA.client
      .from('products')
      .select('*')
      .eq('store_id', tenantB.storeId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('un SELECT sin filtro jamás mezcla filas de otra tienda', async () => {
    const { data, error } = await tenantA.client.from('products').select('store_id')
    expect(error).toBeNull()
    expect(data!.length).toBeGreaterThan(0)
    expect(data!.every((row) => row.store_id === tenantA.storeId)).toBe(true)
  })

  it('la tienda A no puede insertar un producto con store_id de la tienda B', async () => {
    const { error } = await tenantA.client.from('products').insert({
      store_id: tenantB.storeId,
      name: 'Producto intruso',
      price: 10,
    })
    expect(error).not.toBeNull()
  })

  it('la tienda A no puede actualizar un producto de la tienda B (0 filas afectadas)', async () => {
    const { data, error } = await tenantA.client
      .from('products')
      .update({ price: 999 })
      .eq('id', tenantB.productId)
      .select()
    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('products')
      .select('price')
      .eq('id', tenantB.productId)
      .single()
    expect(unchanged?.price).not.toBe(999)
  })

  it('la tienda A no puede borrar un producto de la tienda B (0 filas afectadas)', async () => {
    const { data, error } = await tenantA.client
      .from('products')
      .delete()
      .eq('id', tenantB.productId)
      .select()
    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: stillThere } = await admin
      .from('products')
      .select('id')
      .eq('id', tenantB.productId)
      .single()
    expect(stillThere?.id).toBe(tenantB.productId)
  })

  it('la tienda A no ve el personal (store_members) de la tienda B', async () => {
    const { data, error } = await tenantA.client
      .from('store_members')
      .select('*')
      .eq('store_id', tenantB.storeId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('un cliente anónimo (sin sesión) no ve productos de ninguna tienda', async () => {
    const anonClient = createClient<Database>(url!, anonKey!, { auth: { persistSession: false } })
    const { data, error } = await anonClient.from('products').select('*')
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('la bitácora de auditoría es de solo lectura para owner/manager y nunca editable vía cliente', async () => {
    const { error: insertErr } = await tenantA.client.from('audit_log').insert({
      store_id: tenantA.storeId,
      user_id: tenantA.userId,
      action: 'test.rls_probe',
      entity_type: 'test',
    })
    expect(insertErr).toBeNull()

    const { data: logRow } = await admin
      .from('audit_log')
      .select('id')
      .eq('store_id', tenantA.storeId)
      .eq('action', 'test.rls_probe')
      .single()
    expect(logRow).not.toBeNull()

    const { data: updateResult, error: updateErr } = await tenantA.client
      .from('audit_log')
      .update({ action: 'tampered' })
      .eq('id', logRow!.id)
      .select()
    expect(updateErr).toBeNull()
    expect(updateResult).toEqual([])
  })

  it('la tienda A no ve el historial de pagos de suscripción de la tienda B (Fase 9)', async () => {
    const { data: subB } = await admin
      .from('subscriptions')
      .insert({
        store_id: tenantB.storeId,
        provider: 'mercadopago',
        status: 'active',
        plan: 'monthly',
      })
      .select('id')
      .single()
    const { error: payErr } = await admin.from('subscription_payments').insert({
      subscription_id: subB!.id,
      store_id: tenantB.storeId,
      provider_payment_id: `rls-test-${runId}`,
      amount: 149.99,
      status: 'approved',
    })
    expect(payErr).toBeNull()

    const { data: crossTenantRead, error: readErr } = await tenantA.client
      .from('subscription_payments')
      .select('*')
      .eq('store_id', tenantB.storeId)
    expect(readErr).toBeNull()
    expect(crossTenantRead).toEqual([])

    const { data: ownRead } = await tenantB.client
      .from('subscription_payments')
      .select('*')
      .eq('store_id', tenantB.storeId)
    expect(ownRead!.length).toBe(1)
  })

  it('pending_signups y webhook_events son invisibles para cualquier cliente autenticado (solo service_role)', async () => {
    const { data: signupData, error: signupErr } = await tenantA.client
      .from('pending_signups')
      .select('*')
    expect(signupErr).toBeNull()
    expect(signupData).toEqual([])

    const { data: webhookData, error: webhookErr } = await tenantA.client
      .from('webhook_events')
      .select('*')
    expect(webhookErr).toBeNull()
    expect(webhookData).toEqual([])
  })

  it('un dueño de tienda normal no puede leer platform_admins ni invocar get_platform_metrics', async () => {
    const { data: adminRows, error: adminErr } = await tenantA.client
      .from('platform_admins')
      .select('*')
    expect(adminErr).toBeNull()
    expect(adminRows).toEqual([])

    const { data: isAdmin } = await tenantA.client.rpc('is_platform_admin')
    expect(isAdmin).toBe(false)

    const { error: metricsErr } = await tenantA.client.rpc('get_platform_metrics')
    expect(metricsErr).not.toBeNull()
  })

  it('cualquier tienda puede leer anuncios de la plataforma, pero solo un platform_admin puede publicarlos (Fase 10)', async () => {
    const { data: readable, error: readErr } = await tenantA.client
      .from('announcements')
      .select('*')
    expect(readErr).toBeNull()
    expect(Array.isArray(readable)).toBe(true)

    const { error: insertErr } = await tenantA.client
      .from('announcements')
      .insert({ title: 'Intruso', body: 'no debería poder' })
    expect(insertErr).not.toBeNull()
  })
})
