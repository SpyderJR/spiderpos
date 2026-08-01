# PRD — SpiderPOS

## La telaraña que conecta todo tu negocio — Plataforma de Comercio y POS Multi-Tenant

**Versión:** 3.0.0-PRO (Production Ready — Remasterizada)
**Fecha:** Julio 2026
**Estado:** Aprobado para desarrollo
**Audiencia:** Equipo de ingeniería, diseño de producto y stakeholders

---

## 1. Visión y Objetivo del Producto

Desarrollar el SaaS de comercio y punto de venta (POS) más completo, elegante, rápido y funcional del mercado hispanohablante, adaptado nativamente a cualquier dispositivo (PC, tablet, celular), con **cero datos mock** (arquitectura 100% real sobre Supabase), diseñado para **tiendas de abarrotes, papelerías, farmacias y ferreterías**, con:

- Suscripciones mensuales/anuales **completamente automatizadas** (registro → pago → provisión → operación → renovación → suspensión, sin intervención humana).
- Impresión térmica directa (Bluetooth/USB), tickets PDF y envío por WhatsApp.
- Venta de recargas electrónicas y pago de servicios como fuente de ingreso adicional para el tendero.
- Operación **offline-first** para zonas con conectividad inestable.

### 1.1 Propuesta de Valor

| Para el dueño del negocio                                        | Para el operador del SaaS (tú)                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Opera su tienda desde cualquier dispositivo sin hardware costoso | Ingreso recurrente predecible (MRR/ARR)                                  |
| Control total de empleados, inventario, fiados y cortes de caja  | Onboarding 100% automatizado, cero soporte manual para altas             |
| Gana comisiones con recargas y pago de servicios                 | Una sola base de código y una sola base de datos para todos los clientes |
| Sus datos están blindados y aislados de otros negocios           | Escalabilidad horizontal sin duplicar infraestructura                    |

### 1.2 Métricas de Éxito (KPIs)

- **Time-to-first-sale:** < 10 minutos desde el pago de suscripción hasta la primera venta registrada.
- **Uptime del POS:** 99.9% (incluyendo modo offline como mitigación).
- **Churn mensual:** < 5%.
- **Latencia de búsqueda de producto:** < 50 ms (local, en memoria).
- **Conversión Anual vs Mensual:** ≥ 30% de suscriptores en plan anual.

---

## 2. Identidad de Marca y Assets Visuales

### 2.1 Marca

- **Nombre del producto:** **SpiderPOS** — la telaraña que conecta todo tu negocio.
- **Logotipo:** una **araña** estilizada y moderna (líneas geométricas limpias, versión clara y oscura). Concepto: la araña al centro de su red = el POS al centro del negocio (ventas, inventario, clientes, recargas, reportes).
- **Paleta sugerida:** negro carbón `#111827`, morado eléctrico `#7C3AED` (acento), blanco `#FAFAFA`; gradientes suaves morado→índigo para estilo fintech.
- **Tipografía sugerida:** Inter o Plus Jakarta Sans.
- El logo aparece en: pantalla de login, splash de la PWA, tickets impresos y PDF (como marca "Powered by SpiderPOS" configurable), landing page y correos transaccionales.

### 2.2 Carpeta de Assets: `/fotos`

El repositorio incluye una carpeta obligatoria **`/fotos`** en la raíz del proyecto, donde se suben todas las imágenes de la marca y del producto:

```
/fotos
  ├── logo-arana.svg          # Logo principal vectorial (fondo transparente)
  ├── logo-arana-dark.svg     # Variante para modo oscuro
  ├── logo-arana.png          # Raster 512x512 para PWA / favicon / tickets
  ├── icono-192.png           # Icono PWA 192x192
  ├── icono-512.png           # Icono PWA 512x512
  ├── splash/                 # Pantallas de arranque de la PWA
  ├── capturas/               # Screenshots del producto para la landing
  └── marketing/              # Banners, redes sociales, material promocional
```

**Reglas de la carpeta `/fotos`:**

- Todo asset visual del proyecto vive aquí (única fuente de verdad); el build de Vite los sirve como estáticos.
- Formatos: SVG para logos/iconos (escalables), PNG/WebP para rasterizados, nombres en minúsculas y con guiones.
- El logo de cada **tienda cliente** NO va aquí: se sube desde su backoffice y se almacena en **Supabase Storage** en un bucket `store-logos/` aislado por `store_id`.

---

## 3. Arquitectura Técnica y Stack Obligatorio

### 3.1 Stack Tecnológico

| Capa                | Tecnología                                                         | Justificación                                                                                                             |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Frontend            | React 18+ con Vite                                                 | Carga instantánea, HMR, bundle mínimo                                                                                     |
| Lenguaje            | TypeScript estricto (`strict: true`)                               | Cero `any`, validación de tipos end-to-end                                                                                |
| Estilos             | Tailwind CSS                                                       | Estilo fintech moderno: gradientes, sombras suaves, modo oscuro/claro automático (`prefers-color-scheme` + toggle manual) |
| Animaciones         | Framer Motion                                                      | Transiciones fluidas estilo app nativa                                                                                    |
| Backend / BD / Auth | Supabase (PostgreSQL + Auth + Storage + Edge Functions + Realtime) | RLS nativo, webhooks, tiempo real                                                                                         |
| Validación          | Zod (compartido cliente/servidor)                                  | Un único esquema como fuente de verdad                                                                                    |
| Estado              | TanStack Query + Zustand                                           | Caché, sincronización y estado offline                                                                                    |
| PWA / Offline       | Service Workers + IndexedDB (Dexie.js)                             | Operación sin internet con cola de sincronización                                                                         |
| Impresión           | Web Bluetooth API + Web Serial API + ESC/POS                       | Impresoras térmicas 58mm/80mm sin drivers                                                                                 |
| PDF                 | Generación client-side (jsPDF / pdf-lib)                           | Tickets digitales instantáneos sin costo de servidor                                                                      |
| Pagos SaaS          | Stripe **y/o** Mercado Pago (suscripciones + webhooks)             | Cobro recurrente automatizado en MXN                                                                                      |
| Payouts del negocio | Mercado Pago Connect / CLABE                                       | El dinero de las ventas del tendero cae directo a su cuenta                                                               |

### 3.2 Arquitectura Multi-Tenant: El Corazón del Sistema

**Decisión arquitectónica:** una sola aplicación web y **una sola base de datos compartida** con **aislamiento lógico por fila** (shared database, shared schema). No se crean bases de datos independientes por cliente.

#### 3.2.1 El secreto: la columna `store_id` (aislamiento lógico)

Todas las tablas de negocio llevan una columna obligatoria `store_id UUID NOT NULL REFERENCES stores(id)`:

- Cuando la tienda A (Abarrotes "Don Pepe") entra al sistema, la aplicación filtra automáticamente y solo muestra los registros donde `store_id` corresponde a Don Pepe.
- Cuando la Papelería "Lupita" entra, el sistema muestra únicamente los datos de Lupita.
- **Resultado:** aunque comparten la misma base de datos, los datos de un negocio son completamente invisibles para el otro.

```sql
-- Patrón obligatorio en TODAS las tablas de negocio
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  barcode     TEXT,
  name        TEXT NOT NULL,
  price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock       NUMERIC(12,3) NOT NULL DEFAULT 0,  -- soporta granel (kg, lt, m)
  unit_type   TEXT NOT NULL DEFAULT 'piece',     -- piece | kg | lt | g | m
  min_stock   NUMERIC(12,3) DEFAULT 0,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_store_barcode ON products(store_id, barcode);
```

#### 3.2.2 Seguridad blindada con RLS (Row Level Security)

Para evitar que un usuario curioso vea datos ajenos manipulando el código del navegador, la seguridad se impone **directamente en el servidor de la base de datos** con políticas RLS. La regla es: _"permite leer o escribir en esta tabla únicamente si el usuario autenticado pertenece a ese `store_id`"_.

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Función helper: obtiene el store_id del usuario autenticado
CREATE FUNCTION auth_store_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT store_id FROM store_members WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY tenant_isolation ON products
  FOR ALL
  USING (store_id = auth_store_id())
  WITH CHECK (store_id = auth_store_id());
```

**Reglas no negociables:**

- RLS habilitado en el 100% de las tablas de negocio. Ninguna tabla queda expuesta sin política.
- Las políticas de escritura validan además el **rol y permisos** del empleado (ej. un cajero sin permiso no puede modificar precios ni ver costos).
- El `service_role` key **jamás** se expone al cliente; solo vive en Edge Functions.
- Tests automatizados de aislamiento: suite que intenta leer/escribir cross-tenant y debe fallar siempre.

#### 3.2.3 Esquema mínimo de tenancy

```
stores            → id, name, business_type, logo_url, tax_data, subscription_status, plan, trial_ends_at
store_members     → user_id (auth.users), store_id, role (owner|manager|cashier), pin_hash, permissions JSONB
subscriptions     → store_id, provider (stripe|mercadopago), provider_sub_id, status, current_period_end
```

---

## 4. Modelo de Suscripción SaaS (Monetización)

### 4.1 Planes

| Plan                                     | Precio               | Notas                                                          |
| ---------------------------------------- | -------------------- | -------------------------------------------------------------- |
| **Mensual Estándar**                     | **$299 MXN / mes**   | Acceso completo a todos los módulos para un negocio            |
| **Anual de Lanzamiento**                 | **$1,499 MXN / año** | Equivalente a 2 meses gratis; mejora retención y flujo de caja |
| Prueba gratuita (opcional, configurable) | 7–14 días            | Sin tarjeta o con tarjeta según estrategia de conversión       |

### 4.2 Ciclo de Vida Automatizado de la Suscripción (Piloto Automático)

Todo el flujo funciona de principio a fin **sin intervención manual**:

1. **Registro y compra:** el dueño entra a la landing page, elige plan y paga con tarjeta o Mercado Pago.
2. **Webhook de confirmación:** la pasarela (Stripe / Mercado Pago) notifica al backend mediante webhook (`checkout.session.completed` / `payment.approved`) que el pago fue exitoso. El webhook valida firma criptográfica y es **idempotente** (reintentos seguros).
3. **Provisión del tenant en milisegundos** — una Edge Function ejecuta transaccionalmente:
   - Crea el registro del negocio en `stores`.
   - Crea el usuario administrador (owner) en Supabase Auth y lo vincula en `store_members`.
   - **Inyecta el catálogo semilla** según el giro elegido (abarrotes, papelería, farmacia, ferretería) para que nunca vea una pantalla vacía.
   - Registra la suscripción activa en `subscriptions`.
4. **Acceso inmediato:** correo de bienvenida con magic link / redirección directa a su panel listo para operar.
5. **Renovación automática:** cada periodo la pasarela cobra de nuevo.
   - **Pago exitoso** → `subscription_status = active`, opera normal.
   - **Pago fallido** → reintentos (dunning) con avisos por correo/WhatsApp → si agota reintentos, `status = suspended`.
6. **Bloqueo inteligente por vencimiento:** con estatus suspendido, la app muestra una **pantalla de pago elegante** (paywall) que impide el acceso al POS hasta procesar tarjeta o comprobante. **Los datos históricos se conservan intactos** (nunca se borran por falta de pago; política de retención: 12 meses tras cancelación definitiva).
7. **Reactivación instantánea:** al regularizar el pago, el webhook reactiva el acceso en segundos.

---

## 5. Módulos Funcionales (The Ultimate Feature Set)

### A. Panel de Administración Maestro del Dueño (Backoffice)

- **Login con credenciales únicas:** autenticación independiente para dueño y empleados (email + contraseña para el dueño; PIN rápido de 4–6 dígitos para cajeros en el dispositivo de la tienda).
- **Control de personal y permisos granulares (JSONB por empleado):**
  - Prohibir apertura de cajón sin venta.
  - Bloquear descuentos manuales o exigir PIN de supervisor.
  - Restringir vista de reportes de ganancia neta y costos de adquisición.
  - Limitar módulos visibles (ej. cajero solo ve POS y cortes).
- **Configuración del perfil comercial:** logotipo (impreso en tickets y PDFs), datos fiscales, dirección, teléfono, mensaje de pie de ticket y **selección de giro** que auto-configura plantillas de productos iniciales.
- **Pasarela de payouts del negocio:** el dueño configura su CLABE interbancaria o cuenta de Mercado Pago Connect para que los pagos en línea de sus clientes (links de cobro de fiados, pagos con tarjeta) caigan **directo a su bolsillo**, no al del SaaS.
- **Gestión de suscripción:** ver plan actual, historial de pagos, cambiar tarjeta, upgrade mensual→anual, facturas.

### B. Punto de Venta (POS) Ultra Dinámico y Sensorial

- **Responsive absoluto:** interfaz optimizada para uso con una mano en celular, con el pulgar en tablet, y con teclado/mouse + atajos (F-keys) en PC.
- **Escáner por cámara de alta velocidad:** cámara trasera/frontal para leer EAN-13, UPC, Code128 y QR al instante (BarcodeDetector API con fallback a librería), sin necesidad de pistolas láser. Soporte simultáneo para pistolas USB/Bluetooth en modo teclado (HID).
- **Feedback sensorial único (Web Audio API):** beep digital al escanear, sonido "cha-ching" al cobrar con éxito, vibración háptica en móvil, animaciones de confirmación. Todo desactivable en ajustes.
- **Pagos combinados y mixtos:** dividir el total en múltiples formas de pago en una sola transacción (ej. $50 en efectivo + resto por transferencia SPEI o tarjeta). Cálculo automático de cambio.
- **Botones de acceso rápido (favoritos):** panel deslizable estilo OXXO para productos de alta rotación sin código de barras (tortillas, bolsas, copias).
- **Venta a granel:** captura por peso/medida (kg, g, lt, m) con precio por unidad; teclado numérico grande.
- **Ticket en espera (park sale):** suspender una cuenta y atender a otro cliente sin perder la venta.
- **Búsqueda instantánea:** índice local en memoria + IndexedDB; resultados mientras se teclea, < 50 ms.

### C. Servicios de Valor Agregado: Recargas y Pago de Servicios

- **Recargas Telcel, Movistar, AT&T, Unefón y más:** integración con API de dispensación de tiempo aire (agregadores tipo TAECEL, PayNet o similar).
- **Pago de servicios:** luz (CFE), agua, gas, internet, con captura o escaneo del código de barras del recibo.
- **Comisiones para el tendero:** cada recarga/pago genera comisión visible en reportes; saldo de bolsa de recargas administrable desde el backoffice.
- **Tolerancia a fallos:** confirmación asíncrona del proveedor; una recarga jamás se cobra dos veces (idempotencia por folio).

### D. Tickets, Impresión Térmica y WhatsApp

- **Impresión térmica directa Bluetooth/USB:** ESC/POS a impresoras de 58mm y 80mm con un toque, desde celular o PC. Configuración guardada por dispositivo, reconexión automática, prueba de impresión.
- **Ticket digital en PDF:** comprobante elegante con logo, desglose, folio y QR de verificación, generado al instante.
- **Envío directo por WhatsApp:** al ingresar el teléfono del cliente en el cobro, el sistema genera un enlace `wa.me` con el ticket/estado de cuenta enlazado, listo para enviar en un toque. (Roadmap: envío automático vía WhatsApp Business API.)
- **Reimpresión y duplicados** desde el historial de ventas, con marca de "COPIA".

### E. Inventarios, Catálogo, Compras y Proveedores

- **Gestión de stock flexible:** unidades enteras y venta fraccionada/a granel. Descuento automático de stock por venta; ajustes manuales con motivo y auditoría.
- **Alertas inteligentes de stock bajo:** indicadores rojos, badge de conteo y **exportación de lista de compras** (PDF/WhatsApp) para surtir con proveedores.
- **Directorio de proveedores locales:** contacto, días de visita, historial de surtido y precios de compra.
- **Órdenes de compra y recepción de mercancía:** al recibir, actualiza stock y costo promedio ponderado (base del margen real).
- **Carga masiva:** importación de catálogo por CSV/Excel y captura rápida con escáner ("escanea y crea").
- **Variantes y presentaciones:** mismo producto en pieza/caja/paquete con factores de conversión.

### F. Clientes y "Fiados" (Crédito Local con WhatsApp)

- **Libreta digital de crédito:** clientes con límite de saldo autorizado; bloqueo de nuevo fiado al exceder límite (configurable).
- **Estado de cuenta por cliente:** desglose de compras, abonos y saldo, exportable a PDF.
- **Cobranza automatizada:** botón que genera mensaje de cobro formal por WhatsApp con desglose de deuda y **enlace de pago en línea** (cae al payout del dueño).
- **Abonos parciales** en efectivo o en línea, con recibo.

### G. Reportes Financieros y Cortes de Caja

- **Apertura y cierre de turno:** fondo de caja inicial, registro de entradas/salidas de efectivo (retiros, gastos menores) con motivo.
- **Corte de caja ciego (arqueo):** el cajero cuenta el efectivo **sin ver el teórico**; el sistema calcula sobrantes/faltantes automáticamente para prevenir mermas y robo hormiga. Historial de arqueos por empleado.
- **Gráficas fintech en tiempo real:** productos más vendidos, horas pico, flujo de efectivo, ticket promedio, ventas por empleado y por forma de pago.
- **Margen de utilidad real:** ganancia neta = precio de venta − costo de adquisición (costo promedio ponderado), visible solo para roles autorizados.
- **Exportación:** CSV/Excel/PDF de cualquier reporte y rango de fechas.

### H. 🆕 Devoluciones, Cancelaciones y Auditoría

- Devolución total o parcial con retorno a stock y nota de crédito.
- Cancelación de venta con permiso de supervisor (PIN) y motivo obligatorio.
- **Bitácora de auditoría inmutable:** quién hizo qué y cuándo (ventas canceladas, ajustes de stock, cambios de precio, aperturas de cajón), para resolver disputas y detectar fraude interno.

### I. 🆕 Promociones y Precios Inteligentes

- Descuentos por producto o categoría, con vigencia programada.
- Ofertas tipo 2x1 / 3x2 y precio por volumen (mayoreo a partir de N piezas).
- Precios especiales por cliente (clientes frecuentes / mayoristas).

### J. 🆕 Panel Súper Admin del SaaS (para el operador de la plataforma)

- Dashboard de negocio: MRR, ARR, churn, tiendas activas/suspendidas/en prueba, LTV.
- Gestión de tenants: buscar tienda, ver estatus de suscripción, extender cortesías, suspender/reactivar manualmente en casos excepcionales.
- Monitoreo de salud: errores de webhooks, colas de sincronización offline atascadas, versiones de PWA desplegadas.
- **Sin acceso a datos operativos de los negocios** salvo soporte explícitamente autorizado (privacidad por diseño).

### K. 🆕 Notificaciones y Comunicación

- Notificaciones push (PWA) y correo: stock bajo crítico, corte no realizado, pago de suscripción próximo o fallido.
- Centro de anuncios del SaaS: nuevas funciones y mantenimientos programados.

### L. 🗺️ Roadmap Post-Lanzamiento (fuera de alcance v1, documentado para diseño de esquema)

- **Facturación electrónica CFDI 4.0** (México) vía PAC integrado.
- **Multi-sucursal:** varias tiendas bajo una misma cuenta de dueño con inventarios y reportes consolidados (el esquema `store_id` ya lo soporta naturalmente).
- **Báscula electrónica conectada** (Web Serial) para granel.
- **Catálogo en línea / app de pedidos del cliente final** por tienda.
- **WhatsApp Business API** para envío automático de tickets y cobranza sin intervención.

---

## 6. Modo Offline y PWA (Offline-First)

- **PWA instalable** (Add to Home Screen) con icono, splash y pantalla completa: se siente app nativa.
- **Service Worker avanzado:** precache del shell de la app y del catálogo completo del negocio.
- **IndexedDB como fuente local de verdad:** productos, favoritos, clientes y ventas pendientes viven en el dispositivo.
- **Cola de sincronización:** las ventas hechas sin internet se encolan con UUID generado en cliente y timestamp; al recuperar señal se sincronizan automáticamente (Background Sync) en orden, con resolución de conflictos _last-write-wins_ para catálogo y **append-only** para ventas (una venta nunca se pierde ni se duplica).
- **Indicador de estado visible:** "En línea / Sin conexión — N ventas por sincronizar".
- **Restricciones offline:** recargas electrónicas y pagos con tarjeta requieren conexión (se comunica claramente en la UI); efectivo y fiado funcionan 100% offline.

---

## 7. Requerimientos No Funcionales

| Categoría                | Requerimiento                                                                                                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cero datos mock**      | Conexión estricta a esquemas reales de Supabase. Todo dato en pantalla proviene de la BD o de IndexedDB sincronizada. TypeScript estricto + Zod en cada frontera de datos.                                                                                                    |
| **Rendimiento**          | Búsqueda local < 50 ms; carga inicial < 2 s en 3G rápido; interacciones del POS < 100 ms; Lighthouse PWA ≥ 90.                                                                                                                                                                |
| **Seguridad**            | RLS en todas las tablas; hash de PINs (bcrypt/argon2); HTTPS obligatorio; secretos solo en Edge Functions; protección contra inyección SQL vía consultas parametrizadas del cliente Supabase; rate limiting en endpoints públicos; validación de firma en todos los webhooks. |
| **Privacidad**           | Datos personales de clientes finales tratados conforme a la LFPDPPP (México); derecho de eliminación; sin venta de datos.                                                                                                                                                     |
| **Disponibilidad**       | 99.9% objetivo; el modo offline mitiga caídas de red y de servicio.                                                                                                                                                                                                           |
| **Respaldos**            | Backups automáticos diarios (PITR de Supabase); retención de datos 12 meses tras cancelación.                                                                                                                                                                                 |
| **Accesibilidad**        | Contraste AA, targets táctiles ≥ 44 px, navegación completa por teclado en PC.                                                                                                                                                                                                |
| **Internacionalización** | Español (MX) en v1; arquitectura i18n lista para en/US. Moneda MXN con formato localizado.                                                                                                                                                                                    |
| **Observabilidad**       | Logging estructurado de Edge Functions, alertas de errores (Sentry o similar), métricas de salud de webhooks.                                                                                                                                                                 |

---

## 8. Criterios de Aceptación Clave (v1)

1. Un dueño puede pagar, recibir acceso y **completar su primera venta en menos de 10 minutos** sin ayuda humana.
2. Dos tiendas distintas **jamás** pueden ver datos una de la otra, incluso manipulando el cliente (verificado por suite de pruebas de RLS).
3. Una venta registrada sin internet aparece en reportes tras recuperar señal, **sin duplicarse**.
4. Un ticket se imprime en térmica de 58mm por Bluetooth desde un Android de gama media en ≤ 3 segundos.
5. Si la suscripción vence, el POS se bloquea con paywall y se **reactiva automáticamente** en < 60 s tras el pago.
6. El corte ciego calcula correctamente sobrante/faltante y queda auditado por empleado y turno.
7. Un pago mixto (efectivo + transferencia) queda desglosado correctamente en el ticket y en reportes.

---

## 9. Resumen Ejecutivo de la Arquitectura

> **Una sola aplicación. Una sola base de datos. Infinitos negocios.**
>
> El software es lo suficientemente inteligente para saber **quién entró** (Supabase Auth), **qué negocio es** (`store_id` + RLS), **qué permisos tiene su empleado** (roles y permisos granulares) y **si está al corriente con su pago** (webhooks de Stripe/Mercado Pago), dándole a cada cliente su propio espacio virtual completamente independiente, seguro y siempre disponible — incluso sin internet.
