// Catálogos SAT usados en CFDI 4.0 — solo los valores relevantes para un
// negocio pequeño (abarrotes, papelería, farmacia, ferretería), no el
// catálogo completo de 100+ regímenes que solo aplica a corporativos.

export const REGIMENES_FISCALES = [
  { value: '601', label: '601 — General de Ley Personas Morales' },
  { value: '603', label: '603 — Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 — Sueldos y Salarios' },
  { value: '606', label: '606 — Arrendamiento' },
  { value: '608', label: '608 — Demás ingresos' },
  { value: '611', label: '611 — Ingresos por Dividendos' },
  { value: '612', label: '612 — Personas Físicas con Actividades Empresariales y Profesionales' },
  { value: '614', label: '614 — Ingresos por intereses' },
  { value: '616', label: '616 — Sin obligaciones fiscales' },
  { value: '621', label: '621 — Incorporación Fiscal' },
  { value: '625', label: '625 — Actividades Empresariales por Plataformas Tecnológicas' },
  { value: '626', label: '626 — Régimen Simplificado de Confianza (RESICO)' },
] as const

export const USOS_CFDI = [
  { value: 'G01', label: 'G01 — Adquisición de mercancías' },
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales (público en general)' },
] as const

/** RFC genérico del SAT para tickets sin datos fiscales del cliente. */
export const RFC_PUBLICO_GENERAL = 'XAXX010101000'
