import { useState } from 'react';
import { categoryBg, groupCategories } from '../lib/defaults';
import { shortDate } from '../lib/dates';
import { centsToInput, formatEuros, parseEuros } from '../lib/money';

/**
 * Una fila de la lista de gastos. Tiene dos modos:
 *  - lectura: categoría, importe, fecha, nota y botones Editar / Borrar
 *  - edición: formulario en la propia fila (importe, fecha, categoría, nota)
 */
export default function ExpenseRow({ expense, category, categories, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function startEditing() {
    // Se copian los valores actuales al formulario cada vez que se abre.
    setAmount(centsToInput(expense.amount));
    setDate(expense.date);
    setCategoryId(expense.categoryId);
    setNote(expense.note ?? '');
    setError('');
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    const cents = parseEuros(amount);
    if (!(cents > 0)) return setError('Escribe un importe mayor que 0.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Elige una fecha válida.');
    await onSave(expense.id, { amount: cents, date, categoryId, note: note.trim() });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="bg-panel rounded-2xl p-4 ring-2 ring-acento">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-sm font-semibold mb-1">Importe (€)</span>
              <input className="campo text-lg" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold mb-1">Fecha</span>
              <input className="campo text-lg [color-scheme:dark]" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-semibold mb-1">Categoría</span>
            <select className="campo text-lg [color-scheme:dark]" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {groupCategories(categories).filter((g) => g.items.length > 0).map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {g.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-semibold mb-1">Nota</span>
            <input className="campo text-lg" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Qué has comprado" />
          </label>

          {error && <p className="text-acento font-semibold" role="alert">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" className="boton flex-1">Guardar cambios</button>
            <button type="button" className="boton boton-suave" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="bg-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-0.5 text-sm font-bold text-white ${categoryBg(category)}`}>
          {category?.name ?? 'Sin categoría'}
        </span>
        <span className="font-extrabold text-lg tabular-nums">-{formatEuros(expense.amount)}</span>
      </div>
      <p className="mt-2 text-white/80 truncate">
        {shortDate(expense.date)}{expense.note ? ` · ${expense.note}` : ''}
      </p>
      <div className="mt-2 flex gap-5 text-sm font-semibold">
        <button className="underline" onClick={startEditing}>
          Editar<span className="sr-only"> gasto de {formatEuros(expense.amount)}</span>
        </button>
        <button className="underline" onClick={() => onDelete(expense.id)}>
          Borrar<span className="sr-only"> gasto de {formatEuros(expense.amount)}</span>
        </button>
      </div>
    </li>
  );
}
