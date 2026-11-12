// Todos los importes se guardan en CÉNTIMOS (enteros) para evitar errores
// de redondeo: 0,1 + 0,2 en decimales da 0,30000000000000004.

const formatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/** 123456 -> "1234,56 €" (en es-ES el separador de miles aparece desde 5 cifras: 12.345,67 €) */
export const formatEuros = (cents) => formatter.format(cents / 100);

/** 123456 -> "1234,56" (para rellenar un input) */
export const centsToInput = (cents) => (cents ? String(cents / 100).replace('.', ',') : '');

/**
 * Convierte lo que escribe la persona a céntimos.
 * Acepta "1234,56", "1.234,56", "1234.56" y "1.500" (= 1500).
 * Devuelve 0 si está vacío y NaN si no es un número válido.
 */
export function parseEuros(text) {
  const t = String(text ?? '').trim().replace(/\s/g, '').replace('€', '');
  if (!t) return 0;
  let normalized;
  if (t.includes(',')) normalized = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) normalized = t.replace(/\./g, '');
  else normalized = t;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n * 100);
}

/** Suma de textos de importe, ignorando los no válidos. */
export const sumEuros = (texts) =>
  texts.reduce((acc, t) => {
    const c = parseEuros(t);
    return acc + (Number.isNaN(c) ? 0 : c);
  }, 0);
