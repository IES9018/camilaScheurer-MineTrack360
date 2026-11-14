import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  // Algunos tests corren en entorno Node (sin navegador simulado)
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});
