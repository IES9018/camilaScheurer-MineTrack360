# TP3 — Auditoría heurística (Nielsen) y accesibilidad básica

> **Método:** evaluación heurística con las 10 heurísticas de Nielsen sobre los wireframes **v0** de P1 y P2. Auditora única (la autora), por lo que los hallazgos son una lista de revisión experta y **no** un test con usuarios. Severidad (0–4): 0 sin problema, 1 cosmético, 2 menor, 3 mayor, 4 catastrófico.
> **Resultado:** cada hallazgo con severidad ≥ 2 tiene su corrección en el wireframe v1 (columna "Corrección").

## 1. Heurísticas aplicadas

| # | Heurística | Cómo se aplicó |
|---|---|---|
| H1 | Visibilidad del estado del sistema | Hora de actualización, estados cargando/error/vacío |
| H2 | Coincidencia con el mundo real | Palabras de planta: "service", "turno", "ADVERTENCIA/CRÍTICO" |
| H3 | Control y libertad del usuario | Deshacer asignación, cancelar, Esc |
| H4 | Consistencia y estándares | Misma navegación y mismos colores en P1 y P2 |
| H5 | Prevención de errores | Vehículos no disponibles visibles pero no seleccionables |
| H6 | Reconocer en lugar de recordar | Opciones visibles en lugar de texto libre |
| H7 | Flexibilidad y eficiencia | Filtros, orden por criticidad, teclado |
| H8 | Diseño estético y minimalista | Solo columnas necesarias para decidir |
| H9 | Ayuda a reconocer y recuperarse de errores | Mensajes con causa y salida |
| H10 | Ayuda y documentación | Texto de apoyo breve; manual por rol (informe Anexo A) queda fuera de este TP |

## 2. Hallazgos y correcciones

| ID | Pantalla | Heurística | Hallazgo en v0 | Sev. | Corrección en v1 |
|---|---|---|---|---|---|
| H-P1-01 | P1 | H1 | No indica cuándo se actualizaron los datos ni si hay error de carga | 3 | Hora de actualización, botón Recargar y estados cargando/error/vacío |
| H-P1-02 | P1 | H1, accesibilidad | El estado se expresa solo con color (rojo/amarillo/verde): ilegible para daltonismo y a pleno sol | 4 | Ícono + texto (CRÍTICO/ADVERTENCIA/OK) + color |
| H-P1-03 | P1 | H7, H8 | Sin orden ni filtro: el vehículo crítico puede quedar enterrado | 3 | Orden por criticidad por defecto, filtro y resumen de conteos |
| H-P1-04 | P1 | H4 | Sin navegación ni marca de la sección actual | 2 | Barra de navegación con sección activa |
| H-P1-05 | P1 | H2 | Muestra solo el color: no dice cuánto falta | 3 | Columna "Horas desde service / intervalo" y % del intervalo; mensaje en el detalle |
| H-P2-01 | P2 | H1 | Sin confirmación del resultado al guardar | 3 | Mensaje de éxito con detalle |
| H-P2-02 | P2 | H6 | Vehículo, operador y turno son campos libres: hay que recordar códigos | 3 | Lista de opciones y selector de turno |
| H-P2-03 | P2 | H5 | El conflicto de doble asignación aparece recién al guardar | 4 | Se muestran los no disponibles con motivo y no se pueden seleccionar |
| H-P2-04 | P2 | H9 | No hay mensaje de error que indique cómo seguir | 3 | Mensajes con causa y acción ("Elegí otro vehículo") |
| H-P2-05 | P2 | H3 | No hay forma de deshacer una asignación equivocada | 2 | Acción "Deshacer" tras confirmar |

Cobertura: los 10 principios están referenciados en la tabla 1 y los 10 hallazgos de la tabla 2 tienen corrección. Mínimo exigido (≥ 3 corregidos): **cumplido (10)**.

## 3. Accesibilidad básica (RF-12, WCAG 2.x AA — alcance limitado)

Alcance acordado: **navegación por teclado y contraste** en P1 y P2. Quedan fuera: lectores de pantalla, zoom/reflow y otras pautas.

### 3.1 Contraste (calculado con la fórmula de luminancia relativa de WCAG)
Umbrales AA: 4,5:1 para texto normal y 3:1 para componentes de interfaz.

| Color | Uso | Contraste sobre blanco | Resultado |
|---|---|---|---|
| `#22c55e` (verde del informe §6.4) | marcador/estado OK | 2,28 | **No cumple** (3:1) |
| `#eab308` (amarillo del informe §6.4) | marcador/estado advertencia | 1,92 | **No cumple** |
| `#9ca3af` (gris del informe §6.4) | sin señal | 2,54 | **No cumple** |
| `#ef4444` (rojo del informe §6.4) | crítico | 3,76 | Cumple 3:1 como componente; **no** 4,5:1 como texto |
| `#166534` | texto OK (propuesto) | 7,13 | Cumple |
| `#92400e` | texto ADVERTENCIA (propuesto) | 7,09 | Cumple |
| `#b91c1c` | texto CRÍTICO (propuesto) | 6,47 | Cumple |
| `#4b5563` | texto secundario / sin señal | 7,56 | Cumple |
| `#111827` | texto principal | 17,74 | Cumple |
| `#166534` sobre `#dcfce7` | chip OK | 6,49 | Cumple |
| `#92400e` sobre `#fef3c7` | chip ADVERTENCIA | 6,37 | Cumple |
| `#991b1b` sobre `#fee2e2` | chip CRÍTICO | 6,80 | Cumple |

**Hallazgo adicional:** los colores del marcador de mapa del informe PP2 (§6.4) no cumplen contraste; se reemplazan por los valores propuestos cuando se implemente RF-04.

### 3.2 Teclado
| Verificación | P1 | P2 |
|---|---|---|
| Todo es operable sin mouse | Tab recorre filtro, orden, filas y botón | Tab entre grupos; flechas en opciones |
| Abrir/cerrar | Enter abre detalle; Esc cierra | Enter confirma; Esc cancela |
| Foco visible | Contorno de 2 px de alto contraste | Idem |
| Sin trampas de foco | El panel de detalle devuelve el foco a la fila | El resumen no bloquea el foco |

Estas verificaciones son criterios de diseño. Se comprobarán manualmente sobre la implementación en Sprint 2.
