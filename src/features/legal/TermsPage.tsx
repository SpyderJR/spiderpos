import { LegalPageLayout } from './LegalPageLayout'

const H2 = 'text-carbon-900 dark:text-paper text-lg font-semibold'
const P = 'text-carbon-600 dark:text-carbon-300 text-sm leading-relaxed'
const UL =
  'text-carbon-600 dark:text-carbon-300 flex flex-col gap-1.5 text-sm leading-relaxed list-disc pl-5'

export function TermsPage() {
  return (
    <LegalPageLayout title="Términos y Condiciones" updatedAt="1 de agosto de 2026">
      <section className="flex flex-col gap-3">
        <p className={P}>
          Estos Términos y Condiciones ("Términos") regulan el uso de SpiderPOS, una plataforma de
          punto de venta y gestión de negocio ofrecida como servicio por suscripción ("el
          Servicio"). Al registrarte, contratar un plan o usar el Servicio, aceptas estos Términos.
          Si no estás de acuerdo, no debes usar SpiderPOS.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>1. El Servicio</h2>
        <p className={P}>
          SpiderPOS es un software como servicio (SaaS) para operar un punto de venta: ventas,
          inventario, clientes, cortes de caja, reportes, personal y facturación electrónica, entre
          otras funciones. El Servicio se ofrece bajo un modelo multi-negocio: cada cuenta opera de
          forma aislada de las demás.
        </p>
        <p className={P}>
          Ofrecemos una tienda de demostración de acceso público, con datos de ejemplo que se
          reinician periódicamente, para que puedas explorar el Servicio antes de contratarlo.
          Ningún dato capturado en la demostración se considera información real de tu negocio.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>2. Cuenta y elegibilidad</h2>
        <p className={P}>
          Debes tener capacidad legal para contratar y proporcionar datos veraces al registrar tu
          negocio (nombre, giro, correo electrónico y, si activas facturación electrónica, tus datos
          fiscales). Eres responsable de la actividad que ocurra dentro de tu cuenta, incluyendo la
          de los empleados que decidas dar de alta con su propio acceso.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>3. Planes, precios y cobro</h2>
        <ul className={UL}>
          <li>Plan Mensual: $299 MXN, cobro recurrente cada mes.</li>
          <li>Plan Anual: $2,990 MXN, cobro recurrente cada 12 meses.</li>
          <li>
            Los pagos se procesan a través de Mercado Pago. SpiderPOS nunca captura ni almacena los
            datos de tu tarjeta — esa información la maneja directamente Mercado Pago.
          </li>
          <li>
            La suscripción se renueva automáticamente al final de cada periodo, salvo que la
            canceles antes desde tu panel (Suscripción).
          </li>
          <li>
            Podemos ajustar los precios de los planes hacia adelante; te avisaremos con anticipación
            razonable antes de que un cambio de precio te afecte.
          </li>
        </ul>
        <p className={P}>
          Consulta la{' '}
          <a href="/reembolsos" className="text-brand-600 dark:text-brand-400 hover:underline">
            Política de Reembolsos
          </a>{' '}
          para saber qué pasa con los pagos ya realizados.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>4. Cancelación y suspensión</h2>
        <p className={P}>
          Puedes cancelar tu suscripción en cualquier momento; dejará de cobrarse a partir del
          siguiente periodo. Si un cobro falla o tu suscripción vence sin renovarse, el acceso al
          punto de venta se suspende, pero tus datos históricos se conservan — no se borran por
          falta de pago. Podemos suspender o cerrar cuentas que incumplan estos Términos, usen el
          Servicio de forma fraudulenta o pongan en riesgo la seguridad de otros negocios en la
          plataforma.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>5. Uso aceptable</h2>
        <ul className={UL}>
          <li>No usar el Servicio para actividades ilegales o para procesar pagos fraudulentos.</li>
          <li>No intentar acceder a datos de otro negocio distinto al tuyo.</li>
          <li>No revender, sublicenciar o exponer el Servicio como si fuera tuyo a terceros.</li>
          <li>No intentar vulnerar, saturar o interferir con la infraestructura del Servicio.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>6. Tus datos e información</h2>
        <p className={P}>
          Los datos de tu negocio (productos, ventas, clientes, empleados) son tuyos. Los usamos
          únicamente para operar el Servicio a tu favor, según se describe en nuestra{' '}
          <a href="/privacidad" className="text-brand-600 dark:text-brand-400 hover:underline">
            Política de Privacidad
          </a>
          . Puedes solicitar una exportación o el cierre definitivo de tu cuenta escribiendo a{' '}
          <a
            href="mailto:soporte@spiderpos.app"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            soporte@spiderpos.app
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>7. Disponibilidad del Servicio</h2>
        <p className={P}>
          Trabajamos para mantener el Servicio disponible de forma constante y ofrecemos un modo sin
          conexión para que puedas seguir vendiendo aunque falle tu internet. Aun así, el Servicio
          se ofrece "tal cual" y "según disponibilidad" — no garantizamos que estará libre de
          interrupciones o errores en todo momento.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>8. Limitación de responsabilidad</h2>
        <p className={P}>
          En la medida permitida por la ley, SpiderPOS no será responsable por pérdidas indirectas,
          lucro cesante o daños derivados del uso o la imposibilidad de uso del Servicio. Nada en
          estos Términos limita responsabilidades que no puedan limitarse conforme a la ley
          aplicable.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>9. Cambios a estos Términos</h2>
        <p className={P}>
          Podemos actualizar estos Términos ocasionalmente. Si el cambio es relevante, te lo
          notificaremos por correo o dentro del Servicio antes de que entre en vigor.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>10. Ley aplicable y contacto</h2>
        <p className={P}>
          Estos Términos se rigen por las leyes de México. Cualquier duda sobre estos Términos,
          escríbenos a{' '}
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
