const TABS = [
  { id: 'inicio', name: 'Inicio', path: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
  { id: 'historial', name: 'Historial', path: 'M5 4h14a1 1 0 011 1v15a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM4 9h16M8 2v4M16 2v4' },
];

/** Barra fija inferior para cambiar entre Inicio y Historial. */
export default function BottomNav({ view, onChange }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed bottom-0 inset-x-0 z-20 bg-panel border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-xl mx-auto grid grid-cols-2">
        {TABS.map((t) => {
          const on = view === t.id;
          return (
            <button
              key={t.id}
              aria-current={on ? 'page' : undefined}
              onClick={() => onChange(t.id)}
              className={`flex flex-col items-center gap-1 py-2.5 font-bold ${on ? 'text-acento' : 'text-white/80'}`}
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.path} />
              </svg>
              {t.name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
