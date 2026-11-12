import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteExpense, deleteExtra, updateExpense } from '../db';
import { isSaving } from '../lib/defaults';
import { dayLabel, fromISO, monthName, periodLabel, periodRange, shift, shortDate, today } from '../lib/dates';
import { formatEuros } from '../lib/money';
import ExpenseRow from '../components/ExpenseRow';
import SpendingChart from '../components/SpendingChart';

const CARD = 'bg-panel rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]';
const LEVELS = [
  { id: 'day', name: 'Día', noun: 'día' },
  { id: 'week', name: 'Semana', noun: 'semana' },
  { id: 'month', name: 'Mes', noun: 'mes' },
  { id: 'year', name: 'Año', noun: 'año' },
];

function Chevron({ flip = false }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-6 ${flip ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export default function History() {
  const [level, setLevel] = useState('month');
  const [anchor, setAnchor] = useState(today());     // cualquier fecha dentro del periodo mostrado

  const { start, end } = periodRange(level, anchor);
  const levelInfo = LEVELS.find((l) => l.id === level);

  // Se vuelve a leer solo cuando cambia el periodo o los datos.
  const data = useLiveQuery(async () => ({
    categories: await db.categories.orderBy('order').toArray(),
    expenses: await db.expenses.where('date').between(start, end, true, true).toArray(),
    extras: await db.extras.where('date').between(start, end, true, true).toArray(),
  }), [start, end]);

  if (!data) return <main className="min-h-dvh" />;

  const { categories, expenses, extras } = data;
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Totales del periodo (el dinero apartado va aparte, como en Inicio).
  let spent = 0;
  let saved = 0;
  for (const x of expenses) {
    if (isSaving(categoryById[x.categoryId])) saved += x.amount;
    else spent += x.amount;
  }
  const extrasTotal = extras.reduce((s, x) => s + x.amount, 0);

  // Navegación entre periodos. No se puede avanzar al futuro.
  const goPrev = () => setAnchor(shift(level, anchor, -1));
  const goNext = () => setAnchor(shift(level, anchor, 1));
  const nextIsFuture = periodRange(level, shift(level, anchor, 1)).start > today();
  const isCurrent = start <= today() && today() <= end;

  // Vista de año: totales por mes. Pulsar un mes abre esa vista de mes.
  const year = fromISO(anchor).getFullYear();
  const monthRows = level === 'year'
    ? Array.from({ length: 12 }, (_, i) => {
        const key = `${year}-${String(i + 1).padStart(2, '0')}`;
        let s = 0;
        let a = 0;
        for (const x of expenses) {
          if (!x.date.startsWith(key)) continue;
          if (isSaving(categoryById[x.categoryId])) a += x.amount;
          else s += x.amount;
        }
        return { key, name: monthName(year, i), spent: s, saved: a };
      })
    : [];
  const maxMonth = Math.max(1, ...monthRows.map((r) => r.spent));

  // Vistas de día, semana y mes: registro agrupado por día (el más reciente primero).
  const byDay = new Map();
  for (const x of expenses) byDay.set(x.date, [...(byDay.get(x.date) ?? []), x]);
  const days = [...byDay.keys()].sort().reverse().map((date) => {
    const items = byDay.get(date).sort((a, b) => b.id - a.id);
    const total = items.filter((x) => !isSaving(categoryById[x.categoryId])).reduce((s, x) => s + x.amount, 0);
    return { date, items, total };
  });
  const sortedExtras = [...extras].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-4 pt-6 pb-28">
      <h1 className="text-4xl font-extrabold px-1 mb-5">Historial</h1>

      {/* Selector de nivel: día, semana, mes o año. */}
      <div role="group" aria-label="Ver por" className="grid grid-cols-4 gap-1 rounded-full bg-white/10 p-1">
        {LEVELS.map((l) => (
          <button
            key={l.id} aria-pressed={level === l.id} onClick={() => setLevel(l.id)}
            className={`rounded-full py-2.5 font-bold ${level === l.id ? 'bg-acento text-tinta' : 'text-white'}`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Flechas para moverse entre periodos. */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button aria-label={`${levelInfo.name} anterior`} onClick={goPrev} className="size-12 shrink-0 rounded-full bg-white/10 grid place-items-center">
          <Chevron />
        </button>
        <p className="text-center font-extrabold text-lg leading-tight" aria-live="polite">{periodLabel(level, anchor)}</p>
        <button aria-label={`${levelInfo.name} siguiente`} onClick={goNext} disabled={nextIsFuture} className="size-12 shrink-0 rounded-full bg-white/10 grid place-items-center disabled:opacity-30">
          <Chevron flip />
        </button>
      </div>
      {!isCurrent && (
        <button className="underline font-semibold text-sm mt-2 block mx-auto" onClick={() => setAnchor(today())}>
          Volver a hoy
        </button>
      )}

      {/* Resumen del periodo. */}
      <section aria-labelledby="titulo-resumen" className={`mt-5 ${CARD}`}>
        <h2 id="titulo-resumen" className="font-extrabold text-lg">Gastado</h2>
        <p className="text-5xl font-extrabold leading-none tabular-nums mt-1" style={{ fontVariationSettings: '"wdth" 80' }}>
          {formatEuros(spent)}
        </p>
        <p className="mt-3 text-sm">
          {saved > 0 && <>Apartado {formatEuros(saved)} · </>}
          {extrasTotal > 0 && <>Extras +{formatEuros(extrasTotal)} · </>}
          {expenses.length} {expenses.length === 1 ? 'movimiento' : 'movimientos'}
        </p>
      </section>

      {/* Año: un bloque por mes; al pulsar, se abre ese mes. */}
      {level === 'year' && (
        <section aria-labelledby="titulo-meses" className={`mt-4 ${CARD}`}>
          <h2 id="titulo-meses" className="text-2xl font-extrabold mb-4">Mes a mes</h2>
          <ul className="space-y-1">
            {monthRows.map((r) => (
              <li key={r.key}>
                <button className="w-full text-left rounded-2xl px-3 py-2 hover:bg-white/10" onClick={() => { setLevel('month'); setAnchor(`${r.key}-01`); }}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{r.name}</span>
                    <span className="tabular-nums">
                      {r.spent > 0 ? <strong>{formatEuros(r.spent)}</strong> : <span className="text-white/60">Sin gastos</span>}
                      {r.saved > 0 && <span className="text-white/75 text-sm"> · apartado {formatEuros(r.saved)}</span>}
                    </span>
                  </span>
                  <span className="mt-1 block h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
                    <span className="block h-full rounded-full bg-nivel brightness-125 transition-[width] duration-700" style={{ width: `${(r.spent / maxMonth) * 100}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SpendingChart expenses={expenses} categoryById={categoryById} className="mt-4" />

      {/* Registro de gastos agrupado por día (no en la vista de año). */}
      {level !== 'year' && (
        <section aria-labelledby="titulo-registro" className="mt-10">
          <h2 id="titulo-registro" className="text-2xl font-extrabold mb-4 px-1">Registro de gastos</h2>
          {days.length === 0 ? (
            <p className="text-white/85 px-1">No hay gastos en este periodo.</p>
          ) : (
            <div className="space-y-6">
              {days.map((d) => (
                <div key={d.date}>
                  {level !== 'day' && (
                    <div className="flex items-baseline justify-between gap-3 px-1 mb-2">
                      <button className="font-bold underline text-left" onClick={() => { setLevel('day'); setAnchor(d.date); }}>
                        {dayLabel(d.date)}
                      </button>
                      <span className="tabular-nums text-white/85">{formatEuros(d.total)}</span>
                    </div>
                  )}
                  <ul className="space-y-3">
                    {d.items.map((x) => (
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
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Ingresos extra del periodo. */}
      {level !== 'year' && sortedExtras.length > 0 && (
        <section aria-labelledby="titulo-extras" className="mt-10">
          <h2 id="titulo-extras" className="text-2xl font-extrabold mb-4 px-1">Ingresos extra</h2>
          <ul className="space-y-2">
            {sortedExtras.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 bg-panel rounded-2xl px-4 py-3">
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
        </section>
      )}
    </main>
  );
}
