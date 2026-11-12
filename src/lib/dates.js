// Todas las fechas se guardan como texto 'YYYY-MM-DD' en hora LOCAL
// (usar toISOString daría a veces el día anterior por la zona horaria).
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Fecha de hoy. */
export const today = () => toISO(new Date());

/** '2026-11-12' -> '12/11' */
export const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export const addDays = (iso, n) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// Suma meses sin desbordar (31 ene + 1 mes = 28/29 feb, no 3 mar).
export const addMonths = (iso, n) => {
  const d = fromISO(iso);
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return toISO(target);
};
export const addYears = (iso, n) => addMonths(iso, n * 12);

/**
 * Rango (inclusive) del periodo que contiene la fecha `anchor`.
 * level: 'day' | 'week' (lunes a domingo) | 'month' | 'year'
 */
export function periodRange(level, anchor) {
  const d = fromISO(anchor);
  if (level === 'day') return { start: anchor, end: anchor };
  if (level === 'week') {
    const start = addDays(anchor, -((d.getDay() + 6) % 7)); // retrocede hasta el lunes
    return { start, end: addDays(start, 6) };
  }
  if (level === 'month') {
    const y = d.getFullYear();
    const m = d.getMonth();
    return { start: toISO(new Date(y, m, 1)), end: toISO(new Date(y, m + 1, 0)) };
  }
  return { start: `${d.getFullYear()}-01-01`, end: `${d.getFullYear()}-12-31` };
}

/** Mueve la fecha un periodo hacia delante (dir = 1) o hacia atrás (dir = -1). */
export function shift(level, anchor, dir) {
  if (level === 'day') return addDays(anchor, dir);
  if (level === 'week') return addDays(anchor, 7 * dir);
  if (level === 'month') return addMonths(anchor, dir);
  return addYears(anchor, dir);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (iso, opts) => fromISO(iso).toLocaleDateString('es-ES', opts);

/** Texto del periodo: "Jueves, 12 de noviembre de 2026", "Noviembre de 2026"... */
export function periodLabel(level, anchor) {
  const { start, end } = periodRange(level, anchor);
  if (level === 'day') return cap(fmt(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  if (level === 'week') {
    return `Semana del ${fmt(start, { day: 'numeric', month: 'short' })} al ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  if (level === 'month') return cap(fmt(anchor, { month: 'long', year: 'numeric' }));
  return String(fromISO(anchor).getFullYear());
}

/** "Jueves, 12 de noviembre" (para las cabeceras de día). */
export const dayLabel = (iso) => cap(fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' }));

/** Nombre del mes (0 = enero). */
export const monthName = (year, monthIndex) =>
  cap(new Date(year, monthIndex, 1).toLocaleDateString('es-ES', { month: 'long' }));
