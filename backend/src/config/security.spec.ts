import {
  MIN_JWT_SECRET_LENGTH,
  assertStrongJwtSecret,
  isApiDocsEnabled,
} from './security';

describe('isApiDocsEnabled', () => {
  it.each([
    [undefined, true],
    ['development', true],
    ['test', true],
    ['production', false],
  ])('NODE_ENV=%s -> %s', (env, expected) => {
    expect(isApiDocsEnabled(env)).toBe(expected);
  });
});

describe('assertStrongJwtSecret', () => {
  const strong = 'a'.repeat(MIN_JWT_SECRET_LENGTH);

  it('en producción acepta un secreto largo', () => {
    expect(() => assertStrongJwtSecret(strong, 'production')).not.toThrow();
  });

  it('en producción rechaza un secreto corto', () => {
    expect(() =>
      assertStrongJwtSecret(
        'a'.repeat(MIN_JWT_SECRET_LENGTH - 1),
        'production',
      ),
    ).toThrow(/JWT_SECRET débil/);
  });

  it('en producción rechaza el valor de ejemplo aunque sea largo', () => {
    expect(() =>
      assertStrongJwtSecret(
        'CAMBIAR_generar_con_openssl_rand_hex_32_xxxxxxxx',
        'production',
      ),
    ).toThrow(/JWT_SECRET débil/);
  });

  it.each([undefined, 'development', 'test'])(
    'fuera de producción (%s) no exige nada',
    (env) => {
      expect(() => assertStrongJwtSecret('corto', env)).not.toThrow();
    },
  );
});
