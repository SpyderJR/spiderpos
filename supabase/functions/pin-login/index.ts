// Login rápido de empleados por PIN (PRD 5.A).
//
// Antes de autenticarse, un cajero no tiene sesión — por lo que RLS le
// impide leer store_members para saber a quién pertenece el PIN. Esta
// función corre con service_role (bypassa RLS) exclusivamente para:
//   1. Encontrar qué empleado activo de esa tienda tiene ese PIN.
//   2. Emitir un magic link real de Supabase Auth para ese usuario.
// El cliente intercambia el token por una sesión real con
// supabase.auth.verifyOtp(...) — de ahí en adelante todo pasa por las
// políticas RLS normales, como cualquier otra sesión.
//
// Incluye rate limiting (PRD 7): 5 intentos fallidos bloquean la tienda
// 15 minutos.

import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@3'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

const requestSchema = z.object({
  store_id: z.uuid(),
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos'),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse({ error: 'Solicitud inválida', issues: parsed.error.issues }, 400)
  }
  const { store_id, pin } = parsed.data

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // --- Rate limit ---
  const { data: rateLimit } = await admin
    .from('pin_login_attempts')
    .select('attempts, locked_until')
    .eq('store_id', store_id)
    .maybeSingle()

  if (rateLimit?.locked_until && new Date(rateLimit.locked_until) > new Date()) {
    return jsonResponse(
      {
        error: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.',
        locked_until: rateLimit.locked_until,
      },
      429,
    )
  }

  // --- Buscar empleado activo con ese PIN dentro de la tienda ---
  const { data: members, error: membersErr } = await admin
    .from('store_members')
    .select('id, user_id, pin_hash, full_name')
    .eq('store_id', store_id)
    .eq('active', true)
    .not('pin_hash', 'is', null)

  if (membersErr) {
    return jsonResponse({ error: 'Error consultando la tienda' }, 500)
  }

  let matchedUserId: string | null = null
  let matchedName: string | null = null
  for (const member of members ?? []) {
    if (member.pin_hash && (await bcrypt.compare(pin, member.pin_hash))) {
      matchedUserId = member.user_id
      matchedName = member.full_name
      break
    }
  }

  if (!matchedUserId) {
    const nextAttempts = (rateLimit?.attempts ?? 0) + 1
    const locked = nextAttempts >= MAX_ATTEMPTS
    await admin.from('pin_login_attempts').upsert({
      store_id,
      attempts: locked ? 0 : nextAttempts,
      locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    return jsonResponse({ error: 'PIN incorrecto' }, 401)
  }

  // Éxito: resetear intentos
  await admin.from('pin_login_attempts').delete().eq('store_id', store_id)

  const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(matchedUserId)
  if (userErr || !userRes.user?.email) {
    return jsonResponse({ error: 'No se pudo iniciar sesión' }, 500)
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: userRes.user.email,
  })
  if (linkErr || !linkData.properties?.hashed_token) {
    return jsonResponse({ error: 'No se pudo iniciar sesión' }, 500)
  }

  return jsonResponse({
    email: userRes.user.email,
    token_hash: linkData.properties.hashed_token,
    full_name: matchedName,
  })
})
