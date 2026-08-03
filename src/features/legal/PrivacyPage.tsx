import { LegalPageLayout } from './LegalPageLayout'

const H2 = 'text-carbon-900 dark:text-paper text-lg font-semibold'
const H3 = 'text-carbon-800 dark:text-carbon-100 text-base font-semibold'
const P = 'text-carbon-600 dark:text-carbon-300 text-sm leading-relaxed'
const UL =
  'text-carbon-600 dark:text-carbon-300 flex flex-col gap-1.5 text-sm leading-relaxed list-disc pl-5'

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Política de Privacidad" updatedAt="1 de agosto de 2026">
      <section className="flex flex-col gap-3">
        <p className={P}>
          En SpiderPOS tu información — y la de tus clientes y empleados — nos importa. Esta
          política explica qué datos recopilamos, para qué los usamos, con quién los compartimos y
          qué derechos tienes sobre ellos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>1. Qué información recopilamos</h2>
        <h3 className={H3}>Datos que tú nos das</h3>
        <ul className={UL}>
          <li>Datos del negocio: nombre comercial, giro, dirección, teléfono, logo.</li>
          <li>
            Datos del dueño y empleados: nombre, correo electrónico, PIN de acceso (guardado siempre
            cifrado, nunca en texto plano).
          </li>
          <li>
            Datos fiscales, solo si activas facturación electrónica: RFC, razón social, régimen
            fiscal y código postal fiscal.
          </li>
          <li>
            Datos que capturas de tus propios clientes: nombre, teléfono, historial de compras y
            fiados, si decides registrarlos en el sistema.
          </li>
        </ul>
        <h3 className={H3}>Datos que se generan al usar el Servicio</h3>
        <ul className={UL}>
          <li>Ventas, productos, inventario, cortes de caja y reportes de tu negocio.</li>
          <li>Registros de auditoría (quién hizo qué y cuándo dentro de tu cuenta).</li>
          <li>
            Metadatos técnicos básicos (dispositivo, navegador, dirección IP) para seguridad y
            solución de problemas.
          </li>
        </ul>
        <p className={P}>
          <strong>Nunca almacenamos los números de tu tarjeta ni la de tus clientes</strong> — los
          pagos con tarjeta los procesa Mercado Pago directamente en sus propios servidores.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>2. Para qué usamos tu información</h2>
        <ul className={UL}>
          <li>Operar el Servicio: procesar tus ventas, calcular inventario, generar reportes.</li>
          <li>Procesar el cobro de tu suscripción y, si aplica, timbrar tus facturas.</li>
          <li>Comunicarnos contigo sobre tu cuenta, cambios al Servicio o soporte.</li>
          <li>Detectar y prevenir fraude, abuso o accesos no autorizados.</li>
          <li>Cumplir obligaciones legales y fiscales aplicables.</li>
        </ul>
        <p className={P}>
          No vendemos tu información ni la de tus clientes a terceros, ni la usamos con fines
          publicitarios ajenos a SpiderPOS.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>3. Con quién la compartimos</h2>
        <p className={P}>
          Compartimos únicamente lo necesario con proveedores que nos ayudan a operar el Servicio,
          bajo sus propias medidas de seguridad:
        </p>
        <ul className={UL}>
          <li>
            <strong>Supabase</strong> — aloja nuestra base de datos y autenticación. Tu cuenta está
            aislada lógicamente de las de otros negocios; nadie más puede consultar tu información
            desde la plataforma.
          </li>
          <li>
            <strong>Mercado Pago</strong> — procesa el cobro de tu suscripción. Recibe tu correo y
            los datos mínimos necesarios para el cobro; nunca comparte los datos de tu tarjeta con
            nosotros.
          </li>
          <li>
            <strong>Facturama</strong> — solo si activas facturación electrónica, timbra tus CFDI
            ante el SAT usando tus datos fiscales y tu certificado de sello digital.
          </li>
          <li>
            <strong>Netlify</strong> — aloja la aplicación web que usas para acceder al Servicio.
          </li>
        </ul>
        <p className={P}>
          Estos proveedores pueden alojar información en servidores fuera de México. En esos casos
          exigimos que mantengan medidas de seguridad al menos equivalentes a las nuestras.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>4. Cómo protegemos tu información</h2>
        <ul className={UL}>
          <li>
            Aislamiento por negocio a nivel de base de datos (row level security) — tu información
            nunca es visible para otra cuenta.
          </li>
          <li>Conexiones cifradas (HTTPS) en toda la aplicación.</li>
          <li>PINs de acceso de empleados almacenados siempre cifrados, nunca en texto plano.</li>
          <li>Acceso administrativo restringido y auditado.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>5. Cuánto tiempo guardamos tu información</h2>
        <p className={P}>
          Mientras tu cuenta esté activa, conservamos tu información para que el Servicio funcione.
          Si cancelas tu suscripción, conservamos tus datos históricos hasta por 12 meses (para que
          puedas reactivar sin perder tu historial), después de lo cual pueden ser eliminados de
          forma permanente. Puedes pedir su eliminación anticipada escribiéndonos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>6. Tus derechos (ARCO)</h2>
        <p className={P}>
          Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares, puedes solicitarnos en cualquier momento:
        </p>
        <ul className={UL}>
          <li>
            <strong>Acceso</strong> a los datos que tenemos sobre ti o tu negocio.
          </li>
          <li>
            <strong>Rectificación</strong> de datos inexactos o incompletos.
          </li>
          <li>
            <strong>Cancelación</strong> (eliminación) de tus datos cuando ya no sean necesarios.
          </li>
          <li>
            <strong>Oposición</strong> al uso de tus datos para un fin específico.
          </li>
        </ul>
        <p className={P}>
          Para ejercer cualquiera de estos derechos, escríbenos a{' '}
          <a
            href="mailto:soporte@spiderpos.app"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            soporte@spiderpos.app
          </a>
          . Responderemos en un plazo razonable.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>7. Usuarios en la Unión Europea (GDPR)</h2>
        <p className={P}>
          Si accedes a SpiderPOS desde la Unión Europea o el Espacio Económico Europeo, además de
          los derechos anteriores, el Reglamento General de Protección de Datos (GDPR) te otorga:
        </p>
        <ul className={UL}>
          <li>Derecho a la portabilidad de tus datos en un formato estructurado y de uso común.</li>
          <li>Derecho a limitar u oponerte al tratamiento de tus datos en ciertos casos.</li>
          <li>
            Derecho a que se te informe si tus datos fueron objeto de una vulneración de seguridad
            relevante.
          </li>
          <li>
            Derecho a presentar una reclamación ante la autoridad de protección de datos de tu país.
          </li>
        </ul>
        <p className={P}>
          Tratamos tus datos bajo las bases legales de ejecución de un contrato (para prestarte el
          Servicio que contrataste) e interés legítimo (seguridad y prevención de fraude). No usamos
          tus datos para decisiones automatizadas que produzcan efectos legales sobre ti.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>8. Cookies y almacenamiento local</h2>
        <p className={P}>
          No usamos cookies de publicidad ni rastreadores de terceros. Usamos almacenamiento local
          de tu navegador únicamente para funciones del Servicio: mantener tu sesión iniciada,
          recordar tu preferencia de modo claro/oscuro, guardar la configuración de tu impresora y
          permitir que el punto de venta funcione sin conexión a internet.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>9. Menores de edad</h2>
        <p className={P}>
          SpiderPOS es una herramienta para negocios y no está dirigida a menores de edad. No
          recopilamos intencionalmente información de menores.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>10. Cambios a esta política</h2>
        <p className={P}>
          Si hacemos cambios importantes a esta política, te lo notificaremos por correo o dentro
          del Servicio antes de que entren en vigor.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>11. Contacto</h2>
        <p className={P}>
          ¿Dudas sobre esta política o sobre tus datos? Escríbenos a{' '}
          <a
            href="mailto:soporte@spiderpos.app"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            soporte@spiderpos.app
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  )
}
