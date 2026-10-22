import { addDias, type Tarea } from './data';

export type Plan = 'Brand Essential' | 'Brand Core' | 'Brand Signature';
export const PLANES: Record<Plan, { total: number; resumen: string }> = {
  'Brand Essential': { total: 1400, resumen: 'Logo y variantes, paleta, tipografía, sistema visual, aplicaciones básicas y manual.' },
  'Brand Core': { total: 1800, resumen: 'Essential + aplicaciones complejas, tono y comunicación, dirección de fotografía y hasta 5 ilustraciones.' },
  'Brand Signature': { total: 2200, resumen: 'Core + naming, dirección creativa de lanzamiento y 3 sesiones post-lanzamiento.' },
};

type Paso = { titulo: string; etapa: string; quien: 'estrategia' | 'diseno'; d: number; hasta?: number; prioridad?: 'alta' | 'media'; desde?: Plan };

// Cronograma de 6 semanas. d = día desde el inicio.
const PASOS: Paso[] = [
  { titulo: 'Conversación inicial', etapa: 'Brief', quien: 'estrategia', d: 0, prioridad: 'alta' },
  { titulo: 'Brief estratégico', etapa: 'Brief', quien: 'estrategia', d: 1, hasta: 3 },
  { titulo: 'Naming', etapa: 'Research', quien: 'estrategia', d: 3, hasta: 9, desde: 'Brand Signature' },
  { titulo: 'Research de mercado y competencia', etapa: 'Research', quien: 'estrategia', d: 4, hasta: 7 },
  { titulo: 'Moodboard', etapa: 'Research', quien: 'diseno', d: 6, hasta: 9 },
  { titulo: 'Rutas de concepto (A y B)', etapa: 'Concepto', quien: 'diseno', d: 10, hasta: 15, prioridad: 'alta' },
  { titulo: 'Presentación de conceptos', etapa: 'Concepto', quien: 'estrategia', d: 16, prioridad: 'alta' },
  { titulo: 'Logotipo y variantes', etapa: 'Diseño', quien: 'diseno', d: 17, hasta: 22, prioridad: 'alta' },
  { titulo: 'Paleta, tipografía y estilo gráfico', etapa: 'Diseño', quien: 'diseno', d: 20, hasta: 24 },
  { titulo: 'Tono y comunicación', etapa: 'Diseño', quien: 'estrategia', d: 20, hasta: 24, desde: 'Brand Core' },
  { titulo: 'Dirección de fotografía', etapa: 'Diseño', quien: 'estrategia', d: 22, hasta: 26, desde: 'Brand Core' },
  { titulo: 'Ilustraciones (hasta 5)', etapa: 'Diseño', quien: 'diseno', d: 24, hasta: 30, desde: 'Brand Core' },
  { titulo: 'Sistema visual aplicado', etapa: 'Diseño', quien: 'diseno', d: 23, hasta: 28 },
  { titulo: 'Ronda de revisión 1', etapa: 'Revisiones', quien: 'diseno', d: 29, hasta: 31 },
  { titulo: 'Ronda de revisión 2', etapa: 'Revisiones', quien: 'diseno', d: 32, hasta: 34 },
  { titulo: 'Manual de marca', etapa: 'Entrega', quien: 'diseno', d: 35, hasta: 40, prioridad: 'alta' },
  { titulo: 'Exportar archivos finales (RGB, CMYK, SVG)', etapa: 'Entrega', quien: 'diseno', d: 40, hasta: 41 },
  { titulo: 'Entrega final', etapa: 'Entrega', quien: 'estrategia', d: 42, prioridad: 'alta' },
  { titulo: 'Dirección creativa de lanzamiento', etapa: 'Entrega', quien: 'estrategia', d: 40, hasta: 45, desde: 'Brand Signature' },
  { titulo: '3 sesiones post-lanzamiento', etapa: 'Entrega', quien: 'estrategia', d: 50, hasta: 70, desde: 'Brand Signature' },
];
const NIVEL: Record<Plan, number> = { 'Brand Essential': 0, 'Brand Core': 1, 'Brand Signature': 2 };

export function tareasDePlantilla(opts: { plan: Plan; inicio: string; cliente: string; proyecto: string; estrategia: string; diseno: string; nombreCliente: string }): Omit<Tarea, 'id'>[] {
  return PASOS.filter((p) => !p.desde || NIVEL[opts.plan] >= NIVEL[p.desde]).map((p) => ({
    cliente: opts.cliente,
    proyecto: opts.proyecto,
    titulo: p.titulo === 'Conversación inicial' ? `Conversación inicial con ${opts.nombreCliente}` : p.titulo,
    quien: [p.quien === 'estrategia' ? opts.estrategia : opts.diseno],
    estado: 'pendiente',
    prioridad: p.prioridad ?? 'media',
    inicio: addDias(opts.inicio, p.d),
    fin: p.hasta ? addDias(opts.inicio, p.hasta) : null,
    equipo: [p.quien === 'estrategia' ? 'Brand Strategist' : 'Design'],
    etapa: p.etapa,
    plantilla: true,
    historial: [{ quien: 'auto', texto: 'creada desde la plantilla Nuevo proyecto', cuando: 'Recién' }],
  }));
}
