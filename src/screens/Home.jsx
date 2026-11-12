import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  addCategory, addExpense, addExtra, db, deleteExpense, deleteExtra, resetAll, updateExpense, updateIncome,
} from '../db';
import { BG_CLASS, groupCategories, isSaving } from '../lib/defaults';
import { shortDate, today } from '../lib/dates';
import { centsToInput, formatEuros, parseEuros } from '../lib/money';
import MoneyInput from '../components/MoneyInput';
import ExpenseRow from '../components/ExpenseRow';
import SpendingChart from '../components/SpendingChart';

const CARD_SHADOW = 'shadow-[0_10px_30px_rgba(0,0,0,0.35)]';

// Color del "nivel" del saldo según lo que queda (clases completas para que Tailwind las detecte).
const LEVELS = {
  normal: { bg: 'bg-nivel', text: 'text-nivel' },
  bajo: { bg: 'bg-nivel-bajo', text: 'text-nivel-bajo' },       // queda menos del 25 %
  agotado: { bg: 'bg-nivel-agotado', text: 'text-nivel-agotado' }, // saldo negativo
};

export default function Home({ settings }) {
  const month = today().slice(0, 7); // 'YYYY-MM'
  const range = [`${month}-01`, `${month}-31`];

  // Se vuelve a calcular solo cuando cambian los datos.
  const data = useLiveQuery(async () => ({
    categories: await db.categories.orderBy('order').toArray(),
    expenses: await db.expenses.where('date').between(...range, true, true).toArray(),
    extras: await db.extras.where('date').between(...range, true, true).toArray(),
  }), [month]);

  // Formulario de gasto
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [error, setError] = useState('');
  const amountRef = useRef(null);

  // Nueva categoría dentro de un sector: null = cerrado, { group, name } = escribiendo
  const [newCat, setNewCat] = useState(null);

  // Ingreso extra
  const [showExtra, setShowExtra] = useState(false);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [extraError, setExtraError] = useState('');

  // Edición de la nómina base
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeDraft, setIncomeDraft] = useState('');

  if (!data) return null;

  const { categories, expenses, extras } = data;
  const selectedId = categoryId ?? categories[0]?.id;     // por defecto, la primera
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Saldo = nómina + extras - gastos - dinero apartado (ahorro, inversión, viajes)
  const extrasTotal = extras.reduce((s, x) => s + x.amount, 0);
  let spent = 0;
  let saved = 0;
  for (const x of expenses) {
    if (isSaving(categoryById[x.categoryId])) saved += x.amount;
    else spent += x.amount;
  }
  const totalIn = settings.income + extrasTotal;
  const left = totalIn - spent - saved;
  const leftRatio = Math.max(0, Math.min(1, left / totalIn));

  // Si te pasas, el depósito se llena de rojo; si queda poco, de ámbar.
  const levelKey = left < 0 ? 'agotado' : leftRatio <= 0.25 ? 'bajo' : 'normal';
  const level = LEVELS[levelKey];
  const fillRatio = left < 0 ? 1 : leftRatio;

  const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id);
  const sortedExpenses = [...expenses].sort(byDateDesc);
  const sortedExtras = [...extras].sort(byDateDesc);

  async function submitExpense(e) {
    e.preventDefault();
    const cents = parseEuros(amount);
    if (!(cents > 0)) return setError('Escribe un importe mayor que 0.');
    if (!selectedId) return setError('Elige una categoría.');
    setError('');
    await addExpense({ categoryId: selectedId, amount: cents, note: note.trim(), date: today() });
    setAmount('');
    setNote('');
    amountRef.current?.focus();
  }

  async function submitCategory() {
    const name = newCat.name.trim();
    if (!name) return;
    // Si ya existe una categoría con ese nombre, se selecciona en vez de duplicarla.
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    setCategoryId(existing ? existing.id : await addCategory(name, newCat.group));
    setNewCat(null);
  }

  async function submitExtra(e) {
    e.preventDefault();
    const cents = parseEuros(extraAmount);
    if (!(cents > 0)) return setExtraError('Escribe un importe mayor que 0.');
    setExtraError('');
    await addExtra({ amount: cents, note: extraNote.trim(), date: today() });
    setExtraAmount('');
    setExtraNote('');
    setShowExtra(false);
  }

  async function saveIncome(e) {
    e.preventDefault();
    const cents = parseEuros(incomeDraft);
    if (!(cents > 0)) return;
    await updateIncome(cents);
    setEditingIncome(false);
  }

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-4 pb-28">
      {/* BLOQUE SUPERIOR: saldo del mes. Se queda fijo al hacer scroll.
          La zona azul clara es el "nivel": baja a medida que gastas y sube con los extras. */}
      <div className="sticky top-0 z-10 bg-cobalto pt-4 pb-3">
        <header className={`relative overflow-hidden rounded-3xl bg-panel p-5 ${CARD_SHADOW}`}>
          <div
            className={`absolute inset-x-0 bottom-0 transition-[height,background-color] duration-700 ${level.bg}`}
            style={{ height: `${fillRatio * 100}%` }}
            aria-hidden="true"
          >
            {fillRatio > 0.02 && fillRatio < 1 && (
              <svg className={`absolute left-0 w-full h-3 ${level.text}`} style={{ top: '-11px' }} viewBox="0 0 1200 20" preserveAspectRatio="none">
                <path fill="currentColor" d="M0 10 Q150 0 300 10 T600 10 T900 10 T1200 10 V20 H0Z" />
              </svg>
            )}
          </div>

          <div className="relative">
            <h1 className="font-extrabold text-lg">SALDO</h1>
            <p
              className="text-6xl font-extrabold leading-none tabular-nums mt-1"
              style={{ fontVariationSettings: '"wdth" 80' }}
              aria-live="polite"
            >
              {formatEuros(left)}
            </p>
            <p className="mt-2 text-lg font-bold">{settings.name}</p>
            <p className="mt-2 text-sm">
              {levelKey === 'agotado' && <strong>Te has pasado {formatEuros(-left)}. </strong>}
              {levelKey === 'bajo' && <strong>Te queda menos del 25 %. </strong>}
              Nómina {formatEuros(settings.income)}
              {extrasTotal > 0 && <> · Extras +{formatEuros(extrasTotal)}</>}
              {' '}· Gastado {formatEuros(spent)}
              {saved > 0 && <> · Apartado {formatEuros(saved)}</>}
            </p>

            {editingIncome ? (
              <form onSubmit={saveIncome} className="mt-3 flex items-start gap-3">
                <MoneyInput label="Nueva nómina mensual" value={incomeDraft} onChange={setIncomeDraft} className="flex-1" />
                <button className="boton" type="submit">Guardar</button>
              </form>
            ) : (
              <button
                className="underline text-sm font-semibold mt-1"
                onClick={() => { setIncomeDraft(centsToInput(settings.income)); setEditingIncome(true); }}
              >
                Cambiar nómina
              </button>
            )}
          </div>
        </header>
      </div>

      {/* NUEVO GASTO: importe + categoría (organizadas por sectores) + nota. */}
      <section aria-labelledby="titulo-gasto" className={`mt-2 bg-panel rounded-3xl p-5 ${CARD_SHADOW}`}>
        <h2 id="titulo-gasto" className="text-2xl font-extrabold mb-4">Nuevo gasto</h2>
        <form onSubmit={submitExpense} className="space-y-5">
          <label className="block">
            <span className="block font-semibold mb-2">Importe (€)</span>
            <input
              ref={amountRef} className="campo" inputMode="decimal" autoComplete="off" placeholder="0,00"
              value={amount} aria-invalid={Number.isNaN(parseEuros(amount))} onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <div>
            <span className="block font-semibold mb-3">Categoría</span>
            <div className="space-y-4">
              {groupCategories(categories).map((g) => (
                <div key={g.id} role="group" aria-labelledby={`grupo-${g.id}`}>
                  <p id={`grupo-${g.id}`} className="flex items-center gap-2 text-sm font-bold text-white/85 mb-2">
                    <span className={`size-3 rounded-full ring-2 ring-white/60 ${BG_CLASS[g.color]}`} aria-hidden="true" />
                    {g.name}
                    {g.hint && <span className="font-medium text-white/70"> · {g.hint}</span>}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {g.items.map((c) => {
                      const on = c.id === selectedId;
                      return (
                        <button
                          key={c.id} type="button" aria-pressed={on} onClick={() => setCategoryId(c.id)}
                          className={`rounded-full px-4 py-2 font-bold text-white ${on ? `${BG_CLASS[g.color]} ring-2 ring-white` : 'bg-white/10'}`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                    {newCat?.group !== g.id && (
                      <button type="button" className="rounded-full px-4 py-2 font-bold boton-suave" onClick={() => setNewCat({ group: g.id, name: '' })}>
                        + Añadir<span className="sr-only"> categoría a {g.name}</span>
                      </button>
                    )}
                  </div>

                  {newCat?.group === g.id && (
                    <div className="mt-3 flex items-center gap-3">
                      <label className="flex-1">
                        <span className="sr-only">Nombre de la nueva categoría en {g.name}</span>
                        <input
                          className="campo text-lg" autoFocus placeholder="Nombre de la categoría" value={newCat.name}
                          onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                          // Enter crea la categoría (sin esto enviaría el formulario del gasto).
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCategory(); } }}
                        />
                      </label>
                      <button type="button" className="boton" onClick={submitCategory}>Crear</button>
                      <button type="button" className="underline font-semibold" onClick={() => setNewCat(null)}>Cancelar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="block font-semibold mb-2">Nota (opcional)</span>
            <input className="campo text-lg" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qué has comprado" />
          </label>

          {error && <p className="text-acento font-semibold" role="alert">{error}</p>}
          <button type="submit" className="boton w-full">Añadir gasto</button>
        </form>
      </section>

      {/* INGRESO EXTRA: dinero que entra además de la nómina. Sube el saldo. */}
      <section aria-labelledby="titulo-extra" className={`mt-4 bg-panel rounded-3xl p-5 ${CARD_SHADOW}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 id="titulo-extra" className="text-2xl font-extrabold">Ingreso extra</h2>
          {!showExtra && (
            <button className="boton boton-suave min-h-10 px-4 text-base" onClick={() => setShowExtra(true)}>+ Añadir</button>
          )}
        </div>

        {!showExtra && sortedExtras.length === 0 && (
          <p className="mt-2 text-white/85">¿Has cobrado algo más este mes? Añádelo y se suma a tu saldo.</p>
        )}

        {showExtra && (
          <form onSubmit={submitExtra} className="mt-4 space-y-4">
            <label className="block">
              <span className="block font-semibold mb-2">Importe (€)</span>
              <input
                className="campo" autoFocus inputMode="decimal" autoComplete="off" placeholder="0,00"
                value={extraAmount} aria-invalid={Number.isNaN(parseEuros(extraAmount))} onChange={(e) => setExtraAmount(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="block font-semibold mb-2">De dónde viene (opcional)</span>
              <input className="campo text-lg" value={extraNote} onChange={(e) => setExtraNote(e.target.value)} placeholder="Horas extra, regalo, venta…" />
            </label>
            {extraError && <p className="text-acento font-semibold" role="alert">{extraError}</p>}
            <div className="flex gap-3">
              <button type="submit" className="boton flex-1">Añadir ingreso</button>
              <button type="button" className="boton boton-suave" onClick={() => { setShowExtra(false); setExtraError(''); }}>Cancelar</button>
            </div>
          </form>
        )}

        {sortedExtras.length > 0 && (
          <ul className="mt-4 space-y-2">
            {sortedExtras.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 bg-white/10 rounded-2xl px-4 py-3">
                <span className="min-w-0 truncate">
                  <span className="text-white/75 text-sm">{shortDate(x.date)}</span>{x.note ? ` · ${x.note}` : ''}
                </span>
                <span className="flex items-center gap-4 shrink-0">
                  <span className="font-extrabold tabular-nums">+{formatEuros(x.amount)}</span>
                  <button className="underline text-sm font-semibold" onClick={() => window.confirm('¿Borrar este ingreso?') && deleteExtra(x.id)}>
                    Borrar<span className="sr-only"> ingreso de {formatEuros(x.amount)}</span>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* RESUMEN: gráfico de barras con dónde se va el dinero este mes. */}
      <SpendingChart expenses={expenses} categoryById={categoryById} className="mt-4" />

      {/* Lista de gastos del mes, del más reciente al más antiguo. Cada fila se puede editar. */}
      <section aria-labelledby="titulo-lista" className="mt-10">
        <h2 id="titulo-lista" className="text-2xl font-extrabold mb-4 px-1">Gastos de este mes</h2>
        {sortedExpenses.length === 0 ? (
          <p className="text-white/85 px-1">Aún no hay gastos. Añade el primero arriba y verás cómo baja tu saldo.</p>
        ) : (
          <ul className="space-y-3">
            {sortedExpenses.map((x) => (
              <ExpenseRow
                key={x.id}
                expense={x}
                category={categoryById[x.categoryId]}
                categories={categories}
                onSave={updateExpense}
                onDelete={(id) => window.confirm('¿Borrar este gasto?') && deleteExpense(id)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Botón temporal para repetir desde cero mientras desarrollamos. */}
      <button className="boton boton-suave mt-14" onClick={() => window.confirm('Se borrarán todos tus datos. ¿Seguro?') && resetAll()}>
        Borrar datos y empezar de cero
      </button>
    </main>
  );
}
