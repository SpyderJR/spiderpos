// Captura de interesados que quieren pagar en efectivo (PRD extendido —
// tenderos sin tarjeta o que desconfían de pagar en línea). Público, sin
// auth: solo guarda la solicitud para que el súper admin la contacte y
// cobre por fuera de la app. No provisiona nada — eso lo hace
// admin-provision-cash-tenant una vez que el pago ya se recibió.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@4'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const requestSchema = z.object({
  business_name: z.string().trim().min(2).max(100),
  business_type: z.enum(['abarrotes', 'papeleria', 'farmacia', 'ferreteria']),
  owner_full_name: z.string().trim().min(2).max(100),
  owner_email: z.email(),
  owner_phone: z.string().trim().min(10).max(20),
  plan: z.enum(['monthly', 'annual']),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido' }, 405)

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message
    return jsonResponse(
      { error: firstIssue ?? 'Solicitud inválida', issues: parsed.error.issues },
      400,
    )
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin.from('cash_signup_requests').insert(parsed.data)
  if (error) return jsonResponse({ error: 'No se pudo enviar tu solicitud' }, 500)

  return jsonResponse({ ok: true })
})
