# ADR-001: Stack tecnológico de MineTrack360

**Fecha:** 2026-09-15
**Estado:** Propuesto

## Contexto
MineTrack360 requiere ingesta de telemetría de alta frecuencia (≥50 msg/s),
consultas relacionales entre vehículos/mantenimiento/turnos, y despliegue
reproducible de bajo costo. Hay que fijar lenguaje, framework, base de datos
y estrategia de arquitectura para el prototipo.

## Decisión
Backend Node.js 20 + TypeScript + NestJS (arquitectura modular en capas,
monolito modular con fronteras por dominio); frontend React 18 + Vite;
PostgreSQL 16 + TimescaleDB como motor único (hypertable para telemetría);
MQTT (Mosquitto) para ingesta; Redis para cache/colas; Docker para despliegue.

## Alternativas Descartadas
- **MongoDB (NoSQL documental):** descartado con criterios objetivos — integridad
  referencial débil (requiere lógica de aplicación), consultas JOIN complejas entre
  vehículos/mantenimiento/turnos poco naturales (aggregation pipelines), y series
  temporales menos maduras que TimescaleDB.
- **Microservicios completos:** descartado por YAGNI — la orquestación, service
  discovery y tracing distribuido no se justifican para el volumen del prototipo;
  el diseño modular preserva la extracción futura del módulo Telemetría.
- **Toolchain Node en el host local:** descartado por política de seguridad del
  estudiante — el motor IA corre como binario autónomo y el toolchain Node de
  desarrollo se ejecutará en contenedor Docker.

## Consecuencias
- **Positivas:** un solo motor de datos simplifica backup y operación; tipado estricto
  end-to-end; el stack coincide con la demanda del mercado laboral; despliegue reproducible.
- **Negativas / Riesgos:** TimescaleDB tiene menos hosting gratuito que PostgreSQL puro
  (Render/Railway lo soportan con limitaciones); Docker en el flujo de desarrollo agrega
  curva inicial; un monolito modular exige disciplina para no acoplar los módulos.

  