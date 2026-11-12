// Sectores (grupos) de categorías. Cada sector tiene su color, así las
// etiquetas se reconocen de un vistazo. Para añadir un sector nuevo,
// añade una línea aquí (el color debe existir en BG_CLASS).
export const GROUPS = [
  { id: 'fijos', name: 'Gastos fijos', color: 'cielo' },
  { id: 'diario', name: 'Día a día', color: 'menta' },
  // Dinero que apartas: resta del saldo, pero no cuenta como "gastado".
  { id: 'ahorro', name: 'Ahorro y objetivos', color: 'naranja', saving: true, hint: 'Se resta de tu saldo, pero no cuenta como gasto' },
  { id: 'otros', name: 'Otros', color: 'lila' },
];

// Categorías que se crean al empezar. La persona puede añadir más
// dentro de cada sector con el botón "+ Añadir".
export const DEFAULT_CATEGORIES = [
  { name: 'Alquiler', group: 'fijos' },
  { name: 'Luz', group: 'fijos' },
  { name: 'Agua', group: 'fijos' },
  { name: 'Suscripciones', group: 'fijos' },
  { name: 'Mercado', group: 'diario' },
  { name: 'Comida fuera', group: 'diario' },
  { name: 'Transporte', group: 'diario' },
  { name: 'Ocio', group: 'diario' },
  { name: 'Ahorro', group: 'ahorro' },
  { name: 'Inversión', group: 'ahorro' },
  { name: 'Viajes', group: 'ahorro' },
  { name: 'Salud', group: 'otros' },
  { name: 'Otros', group: 'otros' },
];

// Nombre de color -> clase de fondo. Van escritas completas para que
// Tailwind las detecte al compilar.
export const BG_CLASS = {
  coral: 'bg-coral',
  sol: 'bg-sol',
  menta: 'bg-menta',
  rosa: 'bg-rosa',
  cielo: 'bg-cielo',
  lila: 'bg-lila',
  naranja: 'bg-naranja',
  lima: 'bg-lima',
};

/** Sector de una categoría (si no tiene, va a "Otros"). */
export const groupOf = (category) => GROUPS.find((g) => g.id === category?.group) ?? GROUPS[GROUPS.length - 1];

/** Clase de fondo de una categoría, según su sector. */
export const categoryBg = (category) => (category ? BG_CLASS[groupOf(category).color] : 'bg-white/30');

/** Agrupa una lista de categorías por sector, en el orden de GROUPS. */
export const groupCategories = (categories) =>
  GROUPS.map((g) => ({ ...g, items: categories.filter((c) => groupOf(c).id === g.id) }));

/** ¿La categoría es de ahorro/objetivos (dinero apartado, no gasto)? */
export const isSaving = (category) => Boolean(groupOf(category).saving);
