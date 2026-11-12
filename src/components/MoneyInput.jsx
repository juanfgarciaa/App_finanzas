import { parseEuros } from '../lib/money';

/**
 * Input de importe en euros. Guarda el TEXTO que escribe la persona
 * (así puede escribir "12," sin que se lo borremos) y avisa si no es válido.
 */
export default function MoneyInput({ label, value, onChange, placeholder = '0,00', className = '' }) {
  const invalid = Number.isNaN(parseEuros(value));
  return (
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <input
        className="campo text-right"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid && <span className="block text-sm text-acento mt-1" role="alert">Escribe un importe válido, por ejemplo 1.250,50</span>}
    </label>
  );
}
