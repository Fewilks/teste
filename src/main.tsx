import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installPokemonApiInterceptor } from './services/pokemonLocalApi';

try {
  installPokemonApiInterceptor();
} catch (e) {
  console.warn('Falha ao instalar interceptor local:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
