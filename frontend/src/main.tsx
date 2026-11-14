import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/AppRoutes';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento #root');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
);
