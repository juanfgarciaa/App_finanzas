import { BG_CLASS, groupOf, isSaving } from '../lib/defaults';
import { formatEuros } from '../lib/money';

/** Lista de barras horizontales: la más larga es la categoría con más importe. */
function Bars({ rows, total }) {
  const max = Math.max(...rows.map((r) => r.amount));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-bold truncate">{r.name}</span>
            <span className="tabular-nums shrink-0">
              <strong>{formatEuros(r.amount)}</strong>{' '}
              <span className="text-white/75 text-sm">{Math.round((r.amount * 100) / total)} %</span>
            </span>
          </div>
          {/* La barra es decorativa: el dato ya está escrito en texto. */}
          <div className="mt-1 h-3 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
            <div
              className={`h-full rounded-full brightness-125 transition-[width] duration-700 ${BG_CLASS[r.color]}`}
              style={{ width: `${(r.amount / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Resumen del mes: dónde se va el dinero.
 * Los gastos y el dinero apartado (ahorro, inversión, viajes) van en bloques
 * separados para que el ahorro no distorsione "dónde gastas más".
 */
export default function SpendingChart({ expenses, categoryById, className = '' }) {
  const sums = new Map();
  for (const x of expenses) sums.set(x.categoryId, (sums.get(x.categoryId) ?? 0) + x.amount);

  const rows = [...sums]
    .map(([id, amount]) => {
      const c = categoryById[id];
      return { id, amount, name: c?.name ?? 'Sin categoría', color: groupOf(c).color, saving: isSaving(c) };
    })
    .sort((a, b) => b.amount - a.amount);

  const gastos = rows.filter((r) => !r.saving);
  const apartado = rows.filter((r) => r.saving);
  const totalGastos = gastos.reduce((s, r) => s + r.amount, 0);
  const totalApartado = apartado.reduce((s, r) => s + r.amount, 0);

  return (
    <section aria-labelledby="titulo-grafico" className={`bg-panel rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${className}`}>
      <h2 id="titulo-grafico" className="text-2xl font-extrabold">¿Dónde se va el dinero?</h2>

      {rows.length === 0 && (
        <p className="mt-2 text-white/85">Cuando añadas gastos verás aquí en qué categorías gastas más.</p>
      )}

      {gastos.length > 0 && (
        <div className="mt-3">
          <p className="mb-4 text-white/90">
            Donde más gastas: <strong>{gastos[0].name}</strong> ({Math.round((gastos[0].amount * 100) / totalGastos)} % de tus gastos).
          </p>
          <Bars rows={gastos} total={totalGastos} />
        </div>
      )}

      {apartado.length > 0 && (
        <div className="mt-7">
          <h3 className="font-extrabold text-lg mb-3">Apartado este mes: {formatEuros(totalApartado)}</h3>
          <Bars rows={apartado} total={totalApartado} />
        </div>
      )}
    </section>
  );
}
