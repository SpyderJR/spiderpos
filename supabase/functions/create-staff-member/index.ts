// Alta de personal (PRD 5.A). Requiere service_role porque crea un usuario
// real de Supabase Auth para el empleado (auth.admin.createUser no puede
// llamarse desde el cliente). Verifica manualmente que quien llama sea
// owner/manager de la tienda antes de crear nada.

import { createClient } from 'npm:@supabase/supabase-js@2'
import bcrypt from 'npm:bcryptjs@3'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.email().optional(),
  role: z.enum(['manager', 'cashier']),
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN debe tener entre 4 y 6 dígitos'),
  permissions: z.record(z.string(), z.boolean()).default({}),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'No autenticado' }, 401)
  }

  // Cliente con la sesión del solicitante (respeta RLS) para saber quién es.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()
  if (!caller) {
    return jsonResponse({ error: 'No autenticado' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerMember, error: callerErr } = await admin
    .from('store_members')
    .select('store_id, role')
    .eq('user_id', caller.id)
    .single()

  if (callerErr || !callerMember || !['owner', 'manager'].includes(callerMember.role)) {
    return jsonResponse({ error: 'No autorizado para dar de alta personal' }, 403)
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return jsonResponse({ error: 'Solicitud inválida', issues: parsed.error.issues }, 400)
  }
  const { full_name, role, pin, permissions } = parsed.data
  const email = parsed.data.email ?? `empleado-${crypto.randomUUID()}@staff.spiderpos.app`

  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
  })
  if (createErr || !newUser.user) {
    return jsonResponse({ error: createErr?.message ?? 'No se pudo crear el usuario' }, 500)
  }

  const pinHash = bcrypt.hashSync(pin, 10)

  const { data: member, error: memberErr } = await admin
    .from('store_members')
    .insert({
      user_id: newUser.user.id,
      store_id: callerMember.store_id,
      role,
      full_name,
      pin_hash: pinHash,
      permissions,
      active: true,
    })
    .select('id, full_name, role, active, permissions, created_at')
    .single()

  if (memberErr) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return jsonResponse({ error: memberErr.message }, 500)
  }

  return jsonResponse({ member })
})
