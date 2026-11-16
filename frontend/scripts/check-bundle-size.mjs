// Presupuesto de peso del JavaScript inicial (RNF-13, docs/arquitectura/presupuestos-rendimiento.md).
// Suma el tamaño gzip de los scripts que index.html carga al inicio. Sin dependencias.
// Uso: npm run build && npm run check:bundle
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 200; // 1 KB = 1024 bytes
const dist = new URL('../dist/', import.meta.url).pathname;

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const refs = new Set();
for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(
  /<link[^>]*rel="modulepreload"[^>]*\shref="([^"]+)"/g,
)) {
  refs.add(m[1]);
}

if (refs.size === 0) {
  console.error(
    'No se encontraron scripts en dist/index.html. ¿Corriste npm run build?',
  );
  process.exit(1);
}

let total = 0;
for (const ref of refs) {
  const bytes = gzipSync(readFileSync(join(dist, ref)), { level: 9 }).length;
  total += bytes;
  console.log(`${ref}: ${(bytes / 1024).toFixed(1)} KB gzip`);
}

const totalKb = total / 1024;
console.log(
  `Total JS inicial: ${totalKb.toFixed(1)} KB gzip (presupuesto: ${LIMIT_KB} KB)`,
);
if (totalKb > LIMIT_KB) {
  console.error('Presupuesto excedido.');
  process.exit(1);
}
