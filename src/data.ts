// Tipos y utilidades compartidas. Los datos viven en Supabase (ver store.tsx).

export const ETAPAS = ['Brief', 'Research', 'Concepto', 'Diseño', 'Revisiones', 'Entrega'] as const;
export const ETAPA_DESC: Record<string, string> = {
  Brief: 'Conversación inicial y objetivos',
  Research: 'Mercado, competencia y referencias',
  Concepto: 'Rutas creativas para elegir',
  Diseño: 'Desarrollo del sistema visual',
  Revisiones: 'Ajustes por ronda de feedback',
  Entrega: 'Archivos finales y manual',
};

export type Persona = { id: string; nombre: string; rol: string; iniciales: string; tono: string; esAdmin: boolean; email?: string };
/** Equipo del estudio (se llena al cargar desde la base) */
export const EQUIPO: Persona[] = [];
export const persona = (id: string): Persona => EQUIPO.find((p) => p.id === id) ?? { id, nombre: 'Alguien', rol: '', iniciales: '?', tono: '#A9A79E', esAdmin: false };
export const esAdmin = (id?: string | null) => !!id && !!EQUIPO.find((p) => p.id === id)?.esAdmin;
export const adminId = () => EQUIPO.find((p) => p.esAdmin)?.id ?? '';
export const disenadores = () => EQUIPO.filter((p) => !p.esAdmin);

/** Clientes por clave (meso, jack…). Se llena al cargar desde la base. */
export const CLIENTES: Record<string, { id: string; nombre: string; color: string; proyecto?: string }> = {};

export type EstadoEntrega = 'interno' | 'enviado' | 'aprobado' | 'cambios';
export type Archivo = { id?: string; nombre: string; tipo: string; peso: string; path?: string | null };
export type Entrega = {
  id: string;
  titulo: string;
  etapa: string;
  estado: EstadoEntrega;
  fecha: string;
  fechaISO?: string | null;
  nota?: string;
  preview: 'brief' | 'moodboard' | 'conceptoA' | 'conceptoB' | 'logo' | 'manual' | 'packaging' | 'papeleria';
  archivos: Archivo[];
  feedback?: { autor: string; texto: string; fecha: string }[];
};
export type Pago = { id: string; concepto: string; pct: number; monto: number; estado: 'pagado' | 'pendiente' | 'futuro'; detalle: string; pagadoISO?: string | null };
export type EstadoTarea = 'pendiente' | 'curso' | 'hecha';
export type Prioridad = 'alta' | 'media' | 'baja' | null;
export type Tarea = {
  id: string;
  cliente: string; // clave de CLIENTES
  proyecto?: string; // id del proyecto si tiene portal
  titulo: string;
  quien: string[];
  estado: EstadoTarea;
  prioridad: Prioridad;
  inicio: string | null; // ISO
  fin?: string | null;
  equipo?: ('Brand Strategist' | 'Design')[];
  notion?: boolean;
  etapa?: string;
  privada?: boolean; // solo la ve el admin
  plantilla?: boolean;
  notas?: string;
  checklist?: { id: string; texto: string; hecha: boolean }[];
  links?: { titulo: string; url: string }[];
  historial?: { quien: string; texto: string; cuando: string }[];
};
export type Actividad = { quien: string; texto: string; cuando: string; ts?: string };

export type Proyecto = {
  id: string;
  clave: string;
  clienteId: string;
  cliente: string;
  rubro: string;
  nombre: string;
  servicio: string;
  plan: string;
  total: number; // solo se conoce con Números desbloqueado
  etapa: number; // índice en ETAPAS; 6 = terminado
  inicio: string;
  inicioISO?: string | null;
  entregaFinal: string;
  entregaFinalISO?: string | null;
  proximoHito: { titulo: string; fecha: string; iso?: string | null };
  equipo: string[];
  ronda?: { actual: number; total: number };
  colores: [string, string, string];
  accesoCliente: { email: string; ultimaVisita: string } | null;
  entregas: Entrega[];
  pagos: Pago[];
  actividad: Actividad[];
};

export type CobroExtra = { id: string; cliente: string; concepto: string; monto: number; estado: 'pendiente' | 'pagado'; detalle: string };
export type PagoEquipo = { id: string; proyecto: string; quien: string; monto: number; pagado: number; pagadoISO?: string | null };

/* Fechas */
const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const HOY = local(new Date());
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** Para textos viejos tipo "21 oct": asume el año en curso */
export const aISO = (txt: string): string | null => {
  const m = txt.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/);
  if (!m) return null;
  return `${HOY.slice(0, 4)}-${String(MESES.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
export const fecha = (iso: string | null | undefined, conDia = false) => {
  if (!iso) return 'Sin fecha';
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  return `${conDia ? DIAS[d.getDay()] + ' ' : ''}${d.getDate()} ${MESES[d.getMonth()]}`;
};
export const fechaLarga = (iso: string = HOY) => {
  const d = new Date(iso + 'T12:00:00');
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
};
export const addDias = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return local(d);
};
export const dias = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
/** "Recién", "Hace 12 min", "Hoy, 10:20", "Ayer, 18:40", "12 oct" */
export const hace = (ts: string) => {
  const d = new Date(ts);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (min < 2) return 'Recién';
  if (min < 60) return `Hace ${min} min`;
  const iso = local(d);
  if (iso === HOY) return `Hoy, ${hora}`;
  if (iso === addDias(HOY, -1)) return `Ayer, ${hora}`;
  return fecha(iso);
};

export const usd = (n: number) => 'USD ' + n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
export const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'cliente';
