import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, SETTINGS_ID } from './db';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import History from './screens/History';
import BottomNav from './components/BottomNav';

export default function App() {
  // undefined = cargando; null = no hay datos todavía (primera vez).
  const settings = useLiveQuery(async () => (await db.settings.get(SETTINGS_ID)) ?? null);
  const [view, setView] = useState('inicio'); // 'inicio' | 'historial'

  if (settings === undefined) return null;
  if (!settings?.onboarded) return <Onboarding />;

  return (
    <>
      {view === 'inicio' ? <Home settings={settings} /> : <History />}
      <BottomNav view={view} onChange={(v) => { setView(v); window.scrollTo(0, 0); }} />
    </>
  );
}
