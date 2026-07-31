import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.url({ message: 'VITE_SUPABASE_URL debe ser una URL válida de Supabase' }),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, 'VITE_SUPABASE_ANON_KEY falta o es inválida'),
  VITE_MERCADOPAGO_PUBLIC_KEY: z.string().optional(),
})

function loadEnv() {
  const parsed = envSchema.safeParse(import.meta.env)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Variables de entorno inválidas o faltantes. Revisa tu archivo .env contra .env.example:\n${issues}`,
    )
  }

  return parsed.data
}

export const env = loadEnv()
