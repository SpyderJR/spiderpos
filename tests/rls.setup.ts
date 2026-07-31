import { fileURLToPath } from 'node:url'

// Carga .env (incluyendo SUPABASE_SERVICE_ROLE_KEY, que Vite jamás expone
// al cliente por no llevar prefijo VITE_) para este runner Node-only.
process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
