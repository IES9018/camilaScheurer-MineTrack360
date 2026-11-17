#!/usr/bin/env node
/**
 * Gate de auditoría de dependencias de producción (backend).
 *
 * Regla de decisión (determinista, sin criterio humano en el momento del CI):
 *   1. Corre `npm audit --omit=dev --json`.
 *   2. Toma las advertencias "hoja" (las que tienen advisory propio: GHSA/CVE)
 *      de severidad high o critical. Las entradas que sólo heredan la
 *      vulnerabilidad de un hijo (fdir, tinyglobby, typeorm) no se cuentan
 *      aparte: se cuentan por la advertencia que las origina.
 *   3. FALLA si alguna advertencia high/critical no está en EXCEPCIONES.
 *   4. PASA (con salida explícita en el log) si todas están en EXCEPCIONES y
 *      la excepción no venció.
 *
 * Las excepciones existen para un caso concreto y verificable: paquetes que el
 * mantenedor NO ha parcheado todavía. Ahí no hay nada que actualizar, y el
 * único "fix" que ofrece npm es un salto mayor (o un downgrade) que rompería
 * el proyecto. Se documentan, se les pone fecha de revisión y no bloquean.
 *
 * Uso:   node scripts/audit-gate.mjs              (corre npm audit)
 *        node scripts/audit-gate.mjs report.json  (lee un audit ya generado)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EXCEPCIONES = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    paquete: 'picomatch',
    motivo:
      'picomatch <= 4.0.7 (ReDoS con extglobs repetidos en una sola rama) no tiene version publicada. ' +
      'Llega como dependencia transitiva de typeorm -> tinyglobby -> fdir. El unico arreglo que ofrece npm ' +
      'es bajar typeorm de 1.x a 0.3.31 (salto mayor hacia atras), no un parche de picomatch.',
    revisarAntesDe: '2026-12-15',
  },
];

const archivo = process.argv[2];
let crudo;

if (archivo) {
  crudo = readFileSync(archivo, 'utf8');
} else {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  crudo = r.stdout || '';
  if (!crudo.trim()) {
    console.error('npm audit no devolvio nada. stderr:');
    console.error(r.stderr || '(vacio)');
    process.exit(1);
  }
}

let reporte;
try {
  reporte = JSON.parse(crudo);
} catch {
  console.error('No se pudo interpretar el JSON de npm audit:');
  console.error(crudo.slice(0, 2000));
  process.exit(1);
}

if (reporte.error) {
  console.error(`npm audit devolvio un error: ${JSON.stringify(reporte.error)}`);
  process.exit(1);
}

const vulnerabilidades = reporte.vulnerabilities ?? {};
const hoy = new Date();

// Advertencias hoja (con advisory propio) de severidad alta/critica.
const hojas = new Map();
for (const [nombre, v] of Object.entries(vulnerabilidades)) {
  for (const via of v.via ?? []) {
    if (typeof via !== 'object' || via === null) continue;
    if (via.severity !== 'high' && via.severity !== 'critical') continue;
    const id = (via.url ?? '').split('/').pop() || `${nombre}:${via.title ?? 'sin-id'}`;
    if (!hojas.has(id)) {
      hojas.set(id, {
        id,
        paquete: nombre,
        titulo: via.title ?? 'sin titulo',
        severidad: via.severity,
        rango: via.range ?? 'desconocido',
        url: via.url ?? '',
      });
    }
  }
}

const porId = new Map(EXCEPCIONES.map((e) => [e.id, e]));
const bloqueantes = [];
const aceptadas = [];

for (const hoja of hojas.values()) {
  const excepcion = porId.get(hoja.id);
  if (!excepcion) {
    bloqueantes.push({ ...hoja, causa: 'sin excepcion registrada' });
    continue;
  }
  const limite = new Date(`${excepcion.revisarAntesDe}T23:59:59Z`);
  if (Number.isNaN(limite.getTime()) || hoy > limite) {
    bloqueantes.push({
      ...hoja,
      causa: `la excepcion vencio el ${excepcion.revisarAntesDe}: revisar si ya hay parche`,
    });
  } else {
    aceptadas.push({ ...hoja, excepcion });
  }
}

const sinUsar = EXCEPCIONES.filter((e) => !hojas.has(e.id));

console.log('');
console.log('== Auditoria de dependencias de produccion (npm audit --omit=dev) ==');
const meta = reporte.metadata?.vulnerabilities ?? {};
console.log(
  `Totales: ${meta.total ?? 0} (critical ${meta.critical ?? 0}, high ${meta.high ?? 0}, ` +
    `moderate ${meta.moderate ?? 0}, low ${meta.low ?? 0})`,
);
console.log(`Advertencias high/critical con advisory propio: ${hojas.size}`);

for (const a of aceptadas) {
  console.log('');
  console.log(`ACEPTADA  ${a.id}  ${a.paquete} [${a.severidad}] rango "${a.rango}"`);
  console.log(`          ${a.titulo}`);
  if (a.url) console.log(`          ${a.url}`);
  console.log(`          motivo: ${a.excepcion.motivo}`);
  console.log(`          revisar antes de: ${a.excepcion.revisarAntesDe}`);
}

for (const s of sinUsar) {
  console.log('');
  console.log(`AVISO  la excepcion ${s.id} (${s.paquete}) ya no se reporta: se puede borrar del script.`);
}

if (bloqueantes.length > 0) {
  for (const b of bloqueantes) {
    console.error('');
    console.error(`BLOQUEA  ${b.id}  ${b.paquete} [${b.severidad}] rango "${b.rango}"`);
    console.error(`         ${b.titulo} -> ${b.causa}`);
    if (b.url) console.error(`         ${b.url}`);
  }
  console.error('');
  console.error(`FALLO: ${bloqueantes.length} advertencia(s) high/critical sin excepcion vigente.`);
  console.error('Corregir con: npm audit fix   (y si no alcanza, evaluar el salto mayor en un PR aparte)');
  process.exit(1);
}

console.log('');
console.log(
  `OK: 0 advertencias high/critical bloqueantes. ${aceptadas.length} aceptada(s) y documentada(s).`,
);
