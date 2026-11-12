import Dexie from 'dexie';
import { DEFAULT_CATEGORIES } from './lib/defaults';

// Base de datos local (IndexedDB): los datos viven solo en este dispositivo.
export const db = new Dexie('gastos');

// Versión 1: la que ya tienes instalada.
db.version(1).stores({
  settings: 'id',
  categories: '++id, order',
  expenses: '++id, categoryId, date',
});

// Versión 2: categorías con sector (group) e ingresos extra.
// El "upgrade" convierte los datos que ya existen sin borrar nada.
const LEGACY_GROUP = {
  Vivienda: 'fijos', Alquiler: 'fijos', Luz: 'fijos', Agua: 'fijos', Suscripciones: 'fijos',
  Mercado: 'diario', 'Comida fuera': 'diario', Transporte: 'diario', Ocio: 'diario',
};

const STORES = {
  settings: 'id',                       // { id:'main', name, income (céntimos), onboarded }
  categories: '++id, order',            // { name, group, order }
  expenses: '++id, categoryId, date',   // { categoryId, amount (céntimos), note, date:'YYYY-MM-DD' }
  extras: '++id, date',                 // ingresos extra: { amount (céntimos), note, date }
};

db.version(2)
  .stores(STORES)
  .upgrade(async (tx) => {
    const cats = tx.table('categories');
    const all = await cats.toArray();
    const names = new Set(all.map((c) => c.name));

    for (const c of all) {
      let name = c.name;
      // "Vivienda" pasa a llamarse "Alquiler" (si no existe ya) para no duplicar.
      if (name === 'Vivienda' && !names.has('Alquiler')) { name = 'Alquiler'; names.add('Alquiler'); }
      await cats.update(c.id, { name, group: c.group ?? LEGACY_GROUP[c.name] ?? 'otros' });
    }

    // Se añaden las categorías fijas que faltan.
    let order = all.length;
    for (const name of ['Alquiler', 'Luz', 'Agua']) {
      if (!names.has(name)) await cats.add({ name, group: 'fijos', order: order++ });
    }
  });

// Versión 3: sector "Ahorro y objetivos" (Ahorro, Inversión, Viajes).
// Si ya tenías una categoría con ese nombre, se mueve al sector nuevo.
db.version(3)
  .stores(STORES)
  .upgrade(async (tx) => {
    const cats = tx.table('categories');
    const all = await cats.toArray();
    const byName = new Map(all.map((c) => [c.name.toLowerCase(), c]));
    let order = all.length;
    for (const name of ['Ahorro', 'Inversión', 'Viajes']) {
      const existing = byName.get(name.toLowerCase());
      if (existing) await cats.update(existing.id, { group: 'ahorro' });
      else await cats.add({ name, group: 'ahorro', order: order++ });
    }
  });

export const SETTINGS_ID = 'main';

/** Primer arranque: guarda nombre y nómina y crea las categorías por defecto. */
export async function startApp({ name, income }) {
  await db.transaction('rw', db.settings, db.categories, async () => {
    await db.categories.clear();
    await db.categories.bulkAdd(DEFAULT_CATEGORIES.map((c, order) => ({ ...c, order })));
    await db.settings.put({ id: SETTINGS_ID, name, income, onboarded: true, createdAt: Date.now() });
  });
}

export const updateIncome = (income) => db.settings.update(SETTINGS_ID, { income });

// Gastos
export const addExpense = ({ categoryId, amount, note, date }) =>
  db.expenses.add({ categoryId, amount, note, date });

/** Edita un gasto existente: changes = { categoryId, amount, note, date }. */
export const updateExpense = (id, changes) => db.expenses.update(id, changes);

export const deleteExpense = (id) => db.expenses.delete(id);

// Ingresos extra (se suman a la nómina del mes)
export const addExtra = ({ amount, note, date }) => db.extras.add({ amount, note, date });
export const deleteExtra = (id) => db.extras.delete(id);

/** Crea una categoría dentro de un sector y devuelve su id. */
export async function addCategory(name, group) {
  const order = await db.categories.count();
  return db.categories.add({ name, group, order });
}

/** Borra todos los datos y reinicia la app (útil mientras desarrollamos). */
export async function resetAll() {
  await db.delete();
  location.reload();
}
