# 🕷️ SpiderPOS

**La telaraña que conecta todo tu negocio.**

Plataforma de comercio y punto de venta (POS) multi-tenant, offline-first, para tiendas de abarrotes, papelerías, farmacias y ferreterías. Ver [`PRD.md`](./PRD.md) para la especificación completa del producto.

> ⚠️ Proyecto en construcción activa, fase por fase, según el plan del PRD. Este README se actualiza al cierre de cada fase.

## Stack

| Capa               | Tecnología                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Frontend           | React 18 + Vite, TypeScript estricto                               |
| Estilos            | Tailwind CSS v4 + Framer Motion                                    |
| Backend            | Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) |
| Validación         | Zod                                                                |
| Estado / datos     | TanStack Query + Zustand                                           |
| Offline            | Service Worker (vite-plugin-pwa) + IndexedDB (Dexie)               |
| Pagos SaaS         | Mercado Pago                                                       |
| Gestor de paquetes | **pnpm** (obligatorio — no usar npm ni yarn)                       |

## Instalación

```bash
pnpm install
cp .env.example .env   # rellena las variables reales, ver abajo
pnpm dev
```

## Variables de entorno

Copia `.env.example` a `.env` y define:

| Variable                      | Descripción                              |
| ----------------------------- | ---------------------------------------- |
| `VITE_SUPABASE_URL`           | URL del proyecto Supabase                |
| `VITE_SUPABASE_ANON_KEY`      | Anon key pública de Supabase             |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | Llave pública de Mercado Pago (checkout) |

Las llaves secretas (`service_role` de Supabase, access token de Mercado Pago) **nunca** viven en este repo ni en el cliente: se configuran como secretos de las Supabase Edge Functions.

## Scripts

```bash
pnpm dev            # servidor de desarrollo
pnpm build           # typecheck + build de producción a /dist
pnpm preview          # sirve el build de producción localmente
pnpm test             # corre la suite de pruebas de UI (Vitest + jsdom)
pnpm test:watch       # pruebas en modo watch
pnpm test:rls         # suite de aislamiento cross-tenant contra Supabase real (requiere SUPABASE_SERVICE_ROLE_KEY)
pnpm lint             # ESLint
pnpm format            # Prettier (con orden de clases Tailwind)
```

## Estructura

```
/fotos          # Assets de marca (única fuente de verdad) — logo, iconos PWA, splash
/src
  /components   # Componentes de UI compartidos
  /features     # Módulos de negocio (auth, pos, inventario, clientes, etc.)
  /lib          # Cliente Supabase, entorno validado con Zod, utilidades
  /store        # Estado global (Zustand)
```

### Sobre `/fotos`

- Todo asset visual del proyecto vive aquí; el build lo sirve como estático.
- SVG para logos/iconos, PNG/WebP para rasterizados, nombres en minúsculas con guiones.
- El logo de cada **tienda cliente** NO va aquí: se sube desde su backoffice a Supabase Storage (bucket `store-logos/`, aislado por `store_id`).

## Supabase (base de datos y Edge Functions)

```bash
pnpm dlx supabase link --project-ref <ref>                                  # vincular repo ↔ proyecto
pnpm dlx supabase db push                                                    # aplicar migraciones (supabase/migrations)
pnpm dlx supabase functions deploy <nombre> --project-ref <ref> --use-api    # desplegar una Edge Function
pnpm dlx supabase gen types typescript --project-id <ref> > src/lib/database/types.ts # tipos TS desde el esquema real
```

Edge Functions (`supabase/functions/`):

| Función               | Acceso                         | Propósito                                                            |
| --------------------- | ------------------------------ | -------------------------------------------------------------------- |
| `pin-login`           | Pública (`verify_jwt = false`) | Login rápido de cajeros por PIN                                      |
| `create-staff-member` | JWT de owner/manager           | Alta de personal (crea usuario real en Supabase Auth)                |
| `create-checkout`     | Pública (`verify_jwt = false`) | Registro de negocio → crea suscripción recurrente en Mercado Pago    |
| `mercadopago-webhook` | Pública (`verify_jwt = false`) | Único punto de provisión de tenants y actualización de suscripciones |
| `check-signup-status` | Pública (`verify_jwt = false`) | Sondeo tras el checkout + login automático (magic link)              |
| `manage-subscription` | JWT de owner                   | Reactivación (paywall) y upgrade mensual→anual                       |

Todas usan `SUPABASE_SERVICE_ROLE_KEY` (inyectada automáticamente por la plataforma en runtime). Las que llaman a Mercado Pago requieren además el secreto `MERCADOPAGO_ACCESS_TOKEN` (`supabase secrets set MERCADOPAGO_ACCESS_TOKEN=...`); si se configura una firma de webhook en el dashboard de Mercado Pago, agregar también `MERCADOPAGO_WEBHOOK_SECRET`.

## Despliegue

Netlify vía CLI, ver `netlify.toml`. Instrucciones completas de publicación en la Fase 11 del PRD.
