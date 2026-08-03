import { LegalPageLayout } from './LegalPageLayout'

const H2 = 'text-carbon-900 dark:text-paper text-lg font-semibold'
const P = 'text-carbon-600 dark:text-carbon-300 text-sm leading-relaxed'
const UL =
  'text-carbon-600 dark:text-carbon-300 flex flex-col gap-1.5 text-sm leading-relaxed list-disc pl-5'

export function RefundPolicyPage() {
  return (
    <LegalPageLayout title="Política de Reembolsos" updatedAt="1 de agosto de 2026">
      <section className="flex flex-col gap-3">
        <p className={P}>
          Antes de suscribirte, puedes probar SpiderPOS por tu cuenta con nuestra demostración
          gratuita, sin registrarte ni dar datos de pago. Aun así, sabemos que a veces algo no sale
          como se esperaba — así es como manejamos los reembolsos.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>1. Garantía de 5 días en tu primer pago</h2>
        <p className={P}>
          Si es la primera vez que pagas una suscripción a SpiderPOS y dentro de los primeros 5 días
          naturales decides que no es para ti, te devolvemos el 100% de ese primer pago — sin
          necesidad de justificar el motivo. Escríbenos a{' '}
          <a
            href="mailto:soporte@spiderpos.app"
            className="text-brand-600 dark:text-brand-400 hover:underline"
          >
            soporte@spiderpos.app
          </a>{' '}
          desde el correo con el que te registraste.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>2. Renovaciones automáticas</h2>
        <p className={P}>
          Pasados esos primeros 5 días, los cobros de renovación (mensual o anual) no son
          reembolsables, incluyendo si cancelas a la mitad de un periodo ya pagado — seguirás
          teniendo acceso hasta el final de ese periodo, pero no se prorratea ni se devuelve la
          parte no usada. Para evitar un cobro que no quieres, cancela antes de la fecha de
          renovación desde tu panel (Suscripción → Cancelar).
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>3. Errores de cobro</h2>
        <p className={P}>
          Si te cobramos de más, un monto incorrecto, o un cobro duplicado por un error nuestro o de
          Mercado Pago, te lo corregimos y reembolsamos por completo, sin importar cuánto tiempo
          haya pasado. Escríbenos con el folio o fecha del cargo en cuestión.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>4. Interrupciones del Servicio</h2>
        <p className={P}>
          Si el Servicio no está disponible por una causa atribuible a nosotros durante un periodo
          prolongado, podemos ofrecerte una compensación en forma de crédito hacia tu siguiente
          periodo, a nuestra discreción, evaluando cada caso.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>5. Cómo pedir un reembolso</h2>
        <ul className={UL}>
          <li>
            Escríbenos a{' '}
            <a
              href="mailto:soporte@spiderpos.app"
              className="text-brand-600 dark:text-brand-400 hover:underline"
            >
              soporte@spiderpos.app
            </a>{' '}
            con el correo de tu cuenta y el motivo.
          </li>
          <li>
            Te confirmamos si aplica según los casos anteriores, normalmente en 2 días hábiles.
          </li>
          <li>
            El dinero se devuelve al mismo método de pago con el que se hizo el cargo, a través de
            Mercado Pago — el tiempo en que lo veas reflejado depende de tu banco (generalmente de 5
            a 10 días hábiles).
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={H2}>6. Cambios a esta política</h2>
        <p className={P}>
          Podemos actualizar esta política ocasionalmente; los cambios aplican a pagos realizados
          después de la fecha de actualización, no de forma retroactiva.
        </p>
      </section>
    </LegalPageLayout>
  )
}
