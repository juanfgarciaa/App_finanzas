import { useState } from 'react';
import { startApp } from '../db';
import { parseEuros } from '../lib/money';

// Pantalla única de inicio: nombre + nómina mensual.
export default function Onboarding() {
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cents = parseEuros(income);          // 0 si vacío, NaN si no es válido
  const incomeInvalid = Number.isNaN(cents);
  const canStart = name.trim().length > 0 && cents > 0 && !saving;

  async function submit(e) {
    e.preventDefault();
    if (!canStart) return;
    setSaving(true);
    setError('');
    try {
      await startApp({ name: name.trim(), income: cents });
    } catch {
      setError('No se han podido guardar los datos. Inténtalo de nuevo.');
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-4 pt-12 pb-10">
      <h1 className="text-5xl font-extrabold leading-[0.95] mb-8 px-1">Empecemos</h1>

      <form onSubmit={submit} className="space-y-7 bg-panel rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <label className="block">
          <span className="block font-semibold mb-2">Tu nombre</span>
          <input className="campo" autoFocus autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label className="block">
          <span className="block font-semibold mb-2">Tu nómina mensual (€)</span>
          <input
            className="campo" inputMode="decimal" autoComplete="off" placeholder="1.250,00"
            value={income} aria-invalid={incomeInvalid} onChange={(e) => setIncome(e.target.value)}
          />
          {incomeInvalid && <span className="block text-acento mt-2" role="alert">Escribe un importe válido, por ejemplo 1.250,50</span>}
        </label>

        {error && <p className="text-acento font-semibold" role="alert">{error}</p>}

        <button type="submit" className="boton w-full" disabled={!canStart}>
          {saving ? 'Guardando…' : 'Empezar'}
        </button>
      </form>
    </main>
  );
}
