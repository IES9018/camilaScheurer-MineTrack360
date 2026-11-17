// Carga datos de demostración usando la API real (no toca la base de datos).
//
// Requisitos: backend en marcha, migraciones aplicadas, un usuario admin y los tipos
// de vehículo cargados (docs/deploy/demo-tipos-vehiculo.sql). Usa solo Node 18+.
//
// Uso (desde la raíz del repositorio, dentro del contenedor backend-dev):
//   ADMIN_EMAIL=admin@minetrack360.com ADMIN_PASSWORD='<la clave del admin>' \
//   node docs/deploy/cargar-datos-demo.mjs
// Opcional: API_URL (por defecto http://localhost:3000) y DEMO_DATE (AAAA-MM-DD, la fecha de la
// asignación de ejemplo; por defecto «hoy» según la zona horaria de esta máquina, que en un
// contenedor suele ser UTC: si la demo es de noche en Argentina, pasá la fecha local).
//
// Es repetible: lo que ya existe se informa como «ya existía» y se sigue.
// Resultado esperado en las alertas (intervalo de 500 h): 2 CRÍTICO, 1 ADVERTENCIA, 3 OK.
import process from 'node:process';

const API = process.env.API_URL ?? 'http://localhost:3000';
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Faltan ADMIN_EMAIL y ADMIN_PASSWORD.');
  process.exit(1);
}

let token = '';

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin cuerpo JSON
  }
  return { status: res.status, data };
}

function report(label, { status, data }) {
  if (status >= 200 && status < 300) console.log(`  ok         ${label}`);
  else if (status === 409) console.log(`  ya existía ${label}`);
  else
    console.log(
      `  AVISO      ${label} -> HTTP ${status} ${JSON.stringify(data?.message ?? data)}`,
    );
}

const login = await call('POST', '/api/v1/auth/login', { email, password });
if (login.status !== 200 || !login.data?.accessToken) {
  console.error(
    `No se pudo iniciar sesión (HTTP ${login.status}). Revisá API_URL, el usuario y la clave.`,
  );
  process.exit(1);
}
token = login.data.accessToken;
console.log(`Sesión iniciada como ${email}.`);

console.log('Umbral de mantenimiento (500 h entre servicios), tipos 1 y 2:');
for (const id of [1, 2]) {
  report(
    `tipo ${id}`,
    await call('PUT', `/api/v1/maintenance/thresholds/${id}`, {
      intervalHours: 500,
    }),
  );
}

console.log('Vehículos:');
// [código, patente, tipo, horas de motor, horas en el último servicio]
const vehicles = [
  ['CAM-014', 'AB014CD', 1, 505, 0], // 101 % -> CRÍTICO
  ['CAM-003', 'AB003CD', 1, 512, 0], // 102 % -> CRÍTICO
  ['CAM-007', 'AB007CD', 1, 460, 0], // 92 %  -> ADVERTENCIA
  ['CAM-021', 'AB021CD', 1, 120, 0], // 24 %  -> OK
  ['CAM-009', 'AB009CD', 1, 80, 0], //  16 % -> OK
  ['PAL-003', 'AB903CD', 2, 80, 0], //  16 % -> OK
];
for (const [
  internalCode,
  licensePlate,
  vehicleTypeId,
  totalEngineHours,
  lastServiceHours,
] of vehicles) {
  report(
    internalCode,
    await call('POST', '/api/v1/vehicles', {
      internalCode,
      licensePlate,
      vehicleTypeId,
      totalEngineHours,
      lastServiceHours,
    }),
  );
}

console.log('Operadores:');
const operators = [
  ['Juan Pérez', 'OP-0001'],
  ['Luis Gómez', 'OP-0002'],
  ['Marta Díaz', 'OP-0003'],
];
for (const [fullName, employeeCode] of operators) {
  report(
    fullName,
    await call('POST', '/api/v1/operators', { fullName, employeeCode }),
  );
}

console.log(
  'Asignación de ejemplo (CAM-009 a Luis Gómez, turno tarde de hoy), para mostrar «ya asignado»:',
);
const list = (r) =>
  Array.isArray(r.data) ? r.data : (r.data?.items ?? r.data?.data ?? []);
const vehicle = list(await call('GET', '/api/v1/vehicles')).find(
  (v) => v.internalCode === 'CAM-009',
);
const operator = list(await call('GET', '/api/v1/operators')).find(
  (o) => o.employeeCode === 'OP-0002',
);
if (vehicle && operator) {
  const date = process.env.DEMO_DATE ?? new Date().toLocaleDateString('en-CA'); // AAAA-MM-DD
  console.log(`  fecha de la asignación: ${date} (turno tarde)`);
  report(
    'asignación',
    await call('POST', '/api/v1/shifts/assignments', {
      vehicleId: vehicle.id,
      operatorId: operator.id,
      date,
      shift: 'AFTERNOON',
    }),
  );
} else {
  console.log(
    '  AVISO      no se encontraron CAM-009 u OP-0002; se omite la asignación.',
  );
}
console.log('Listo.');
