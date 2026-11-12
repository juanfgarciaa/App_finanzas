import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Tipografía autoalojada (sin peticiones externas). La variante "wdth"
// añade el eje de anchura, que usaremos para los números enormes.
import '@fontsource-variable/bricolage-grotesque/wdth.css';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
