/**
 * Límite global de pedidos por IP (auditoría S2, N-06; modelo de amenazas, T-15).
 * El login define uno más estricto con @Throttle (5 por minuto).
 */
export const GLOBAL_THROTTLE = { name: 'default', ttl: 60_000, limit: 100 };
