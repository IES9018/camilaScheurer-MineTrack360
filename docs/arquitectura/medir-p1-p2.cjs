/**
 * Medición de P1 (/alertas) y P2 (/turnos) con sesión iniciada (RNF-11, RNF-12).
 * Uso (frontend compilado y servido con `npx vite preview --port 4173`, backend con datos de demo):
 *   MEDIR_EMAIL=... MEDIR_PASSWORD=... node docs/arquitectura/medir-p1-p2.cjs
 * Requiere `playwright` instalado fuera del proyecto (no es dependencia; R-07).
 * Emula un teléfono de gama media (Moto G4, CPU 4x más lenta, red 1,6 Mbps / 150 ms),
 * lo cual APROXIMA el perfil móvil de Lighthouse pero NO es Lighthouse.
 */
const { chromium, devices } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const RUNS = Number(process.env.RUNS ?? 5);
const CLICK_EVENTS = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];

(async () => {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: process.env.MEDIR_EMAIL, password: process.env.MEDIR_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login fallido (${res.status})`);
  const login = await res.json();
  const session = JSON.stringify({ token: login.accessToken, user: login.user });
  const browser = await chromium.launch();
  const out = {};
  for (const route of ['/alertas', '/turnos']) {
    out[route] = [];
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext({ ...devices['Moto G4'] });
      await ctx.addInitScript(([k, v]) => {
        sessionStorage.setItem(k, v);
        const m = (window.__m = { lcp: 0, cls: 0, long: [], fcp: 0, events: [] });
        const obs = (type, fn, extra = {}) =>
          new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...extra });
        obs('largest-contentful-paint', (e) => (m.lcp = e.startTime));
        obs('layout-shift', (e) => { if (!e.hadRecentInput) m.cls += e.value; });
        obs('longtask', (e) => m.long.push([e.startTime, e.duration]));
        obs('paint', (e) => { if (e.name === 'first-contentful-paint') m.fcp = e.startTime; });
        obs('event', (e) => m.events.push([e.name, e.duration]), { durationThreshold: 16 });
      }, ['minetrack360.session', session]);
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150,
      });
      let bytes = 0;
      cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      const finalPath = new URL(page.url()).pathname;
      if (finalPath !== route) throw new Error(`Se esperaba ${route} y se llegó a ${finalPath} (¿sesión inválida?)`);
      const target = route === '/turnos' ? page.locator('input[type=radio]').first() : page.locator('table button').first();
      if (!(await target.count())) throw new Error(`Sin control para interactuar en ${route} (¿faltan datos de demo?)`);
      await target.click({ force: true });
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => window.__m);
      const tbt = m.long.filter(([s]) => s >= m.fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
      const click = Math.max(0, ...m.events.filter((e) => CLICK_EVENTS.includes(e[0])).map((e) => e[1]));
      out[route].push({ lcp: Math.round(m.lcp), fcp: Math.round(m.fcp), tbt: Math.round(tbt), cls: +m.cls.toFixed(3), clickMs: click, kb: Math.round(bytes / 1024) });
      await ctx.close();
    }
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
