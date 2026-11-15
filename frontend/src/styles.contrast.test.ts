// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * RF-12 / CA-07: contraste WCAG AA de los pares de color del diseño. Lee los
 * tokens de styles.css, así que si alguien cambia un color, este test lo revisa.
 */

function token(name: string): string {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!match?.[1])
    throw new Error(`Falta el token --color-${name} en styles.css`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf-8');

const TEXT = 4.5; // texto normal
const COMPONENT = 3; // bordes, íconos y anillo de foco

describe('contraste de los tokens de color (WCAG AA)', () => {
  it.each([
    ['ink', 'surface', TEXT],
    ['ink', 'page', TEXT],
    ['ink-muted', 'surface', TEXT],
    ['ink-muted', 'page', TEXT],
    ['surface', 'brand', TEXT],
    ['surface', 'brand-strong', TEXT],
    ['status-ok', 'surface', TEXT],
    ['status-warn', 'surface', TEXT],
    ['status-crit', 'surface', TEXT],
    ['status-crit', 'page', TEXT],
    ['status-ok', 'status-ok-bg', TEXT],
    ['status-warn', 'status-warn-bg', TEXT],
    ['status-crit-on-bg', 'status-crit-bg', TEXT],
    ['line', 'surface', COMPONENT],
    ['line', 'page', COMPONENT],
    ['brand', 'surface', COMPONENT],
    ['brand', 'page', COMPONENT],
  ])('%s sobre %s llega a %d:1', (fg, bg, minimum) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(minimum);
  });

  it('detecta un par que no cumple (los colores de marcador del informe PP2)', () => {
    expect(contrast('#22c55e', '#ffffff')).toBeLessThan(COMPONENT);
    expect(contrast('#eab308', '#ffffff')).toBeLessThan(COMPONENT);
  });
});
