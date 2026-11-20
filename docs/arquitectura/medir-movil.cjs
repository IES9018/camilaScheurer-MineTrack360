/**
 * Verificación de RNF-14 en P1 (/alertas) y P2 (/turnos) a 360 px de ancho:
 *   1. sin scroll horizontal de página;
 *   2. todo control visible e interactivo mide al menos 48 x 48 px (la etiqueta que
 *      envuelve a un radio cuenta como su área táctil).
 * Uso (frontend compilado y servido con `npx vite preview --port 4173`, backend con datos de demo):
 *   MEDIR_EMAIL=... MEDIR_PASSWORD=... node docs/arquitectura/medir-movil.cjs [carpeta-de-capturas]
 * Requiere `playwright` instalado fuera del proyecto (no es dependencia; R-07).
 * Sale con código 1 si algún control no cumple.
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';
const WIDTH = Number(process.env.ANCHO ?? 360);
const MIN = 48;
const SHOTS = process.argv[2];

async function audit(page, label) {
  return page.evaluate(
    ([min, label]) => {
      const bad = [];
      const total = { controls: 0 };
      const sel = 'a[href], button, select, input:not([type=radio]):not([type=hidden]), summary';
      const els = [...document.querySelectorAll(sel)];
      for (const radio of document.querySelectorAll('input[type=radio]')) {
        els.push(radio.closest('label') ?? radio);
      }
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (r.width === 0 || r.height === 0) continue;
        if (el.closest('.sr-only') || cs.position === 'absolute' && r.width <= 1) continue;
        total.controls++;
        if (r.height < min - 0.5 || r.width < min - 0.5) {
          bad.push(`${label}: <${el.tagName.toLowerCase()}> "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      return { bad, controls: total.controls, overflow };
    },
    [MIN, label],
  );
}

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
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 740 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(([k, v]) => sessionStorage.setItem(k, v), ['minetrack360.session', session]);
  const page = await ctx.newPage();
  let failed = false;
  const report = (label, r) => {
    console.log(`${label}: ${r.controls} controles, desborde horizontal ${r.overflow} px, ${r.bad.length} bajo ${MIN} px`);
    r.bad.forEach((b) => console.log('   ✗ ' + b));
    if (r.overflow > 0 || r.bad.length) failed = true;
  };
  const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });

  await page.goto(BASE + '/alertas', { waitUntil: 'networkidle' });
  report('P1 lista', await audit(page, 'P1'));
  await shot('p1-lista');
  await page.locator('table button').first().click();
  await page.waitForTimeout(300);
  report('P1 detalle', await audit(page, 'P1 detalle'));
  await shot('p1-detalle');
  await page.keyboard.press('Escape');

  await page.goto(BASE + '/turnos', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  report('P2 formulario', await audit(page, 'P2'));
  await shot('p2-formulario');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
