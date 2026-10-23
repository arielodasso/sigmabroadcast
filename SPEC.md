# Sigma Broadcast — SPEC.md

*Versión:* 1.1.0  
*Estado:* Especificación inicial + extensiones implementadas (§17)  
*Producto:* Sigma Broadcast  
*Marca:* Sigma Tecnologías  
*Proyecto:* Microsoft + Premier League — Inside the Game: Developer Hackathon  
*Presupuesto objetivo:* USD 0  
*Idioma de la interfaz:* Inglés por defecto; español implementado y conmutable en caliente.

---

## 1. Visión del producto

Sigma Broadcast es un sistema de inteligencia para transmisiones de fútbol que transforma eventos sintéticos de un partido en una experiencia audiovisual 3D con información contextual, explicaciones verificables y gráficos sincronizados.

El sistema no debe limitarse a mostrar estadísticas. Debe decidir:

- Qué está sucediendo en el partido.
- Qué acontecimientos merecen comunicarse.
- Por qué son relevantes.
- Qué información debe aparecer en pantalla y durante cuánto tiempo.
- Qué gráficos deben actualizarse o retirarse cuando cambia la validez de un evento.
- Cómo adaptar una explicación según el público.

### Propuesta de valor

*A synthetic football match, intelligently broadcast.*

La simulación 3D es la representación visual del partido. La innovación central es la inteligencia que interpreta sus eventos y gobierna la transmisión.

## 2. Alcance del MVP

### Incluido

1. Partido ficticio representado en 3D dentro del navegador.
2. Dos equipos ficticios y jugadores identificables mediante IDs.
3. Pelota y secuencias coordinadas de pases, desplazamientos, recuperaciones, tiros y goles.
4. Motor de eventos sintéticos con reloj de partido reproducible.
5. Interpretación de estadísticas y patrones tácticos básicos.
6. MatchTruth: validación de afirmaciones mediante evidencia de eventos.
7. BroadcastSync: priorización, planificación, expiración y corrección de gráficos.
8. Interfaz de transmisión con marcador, reloj y overlays.
9. Panel de control para inspeccionar eventos, decisiones y conflictos.
10. Modos de audiencia: analista y aficionado.
11. Escenario demostrativo de gol anulado y corrección propagada.
12. Pruebas automatizadas de reglas críticas.
13. Ejecución local sin servicios pagos obligatorios.

### Fuera del alcance inicial

- Simulación autónoma y realista de 22 jugadores.
- Física avanzada de balón y contacto.
- Captura o análisis de video real.
- Datos reales de partidos de la Premier League.
- Integración con transmisiones deportivas reales.
- Conexión obligatoria con servicios pagos de IA.
- Entrenamiento de modelos propios.
- Autenticación, multitenancy y despliegue productivo.
- Generación de comentarios de audio profesionales.
- Compatibilidad certificada con sistemas profesionales de producción televisiva.

Cualquier ampliación debe aprobarse expresamente antes de modificar el alcance.

## 3. Principios técnicos obligatorios

1. *Synthetic-only:* todos los eventos, equipos, jugadores y estadísticas del partido de demostración deben ser sintéticos.
2. *Determinismo:* una semilla fija debe permitir reproducir una misma secuencia de eventos.
3. *Single source of truth:* el estado del partido procede exclusivamente del motor de simulación y su registro de eventos.
4. *Evidence-based insights:* ninguna explicación puede introducir estadísticas o hechos que no estén respaldados por los datos.
5. *Deterministic authority:* las reglas del sistema tienen la última palabra sobre el marcador, la validez de los eventos y el estado de los overlays.
6. *AI optional:* el MVP debe funcionar sin API keys ni modelos remotos.
7. *Local-first:* renderizado y lógica ejecutados localmente en el navegador.
8. *Graceful degradation:* si falla un componente opcional, la simulación y los gráficos básicos deben seguir funcionando.
9. *Traceability:* cada insight debe poder rastrearse hasta sus eventos de origen.
10. *No fabricated capabilities:* no afirmar integraciones con Azure, Microsoft o sistemas externos que no estén implementadas y verificadas.

## 4. Stack tecnológico

Usar versiones estables y compatibles disponibles al comenzar el proyecto.

| Componente | Tecnología |
|---|---|
| Aplicación | React + TypeScript |
| Bundler y servidor local | Vite |
| Escena 3D | Three.js |
| Renderizado | WebGL mediante Three.js |
| Estilos | CSS modular o CSS convencional |
| Validación de contratos | Zod |
| Testing | Vitest |
| Automatización de pruebas de interfaz | Playwright, si el entorno lo permite |
| Control de versiones | Git + GitHub |

Se recomienda TypeScript en modo estricto.

No agregar dependencias para funcionalidades que puedan resolverse con el stack existente. React Three Fiber es una alternativa válida a Three.js directo, pero no incorporar ambas tecnologías sin una necesidad demostrable.

## 5. Arquitectura lógica

Separar el sistema en cinco capas.

### A. Match Simulator

Responsabilidades:

- Crear equipos y jugadores ficticios.
- Generar secuencias de juego predefinidas y reproducibles.
- Mantener las posiciones de los jugadores y la pelota.
- Emitir eventos sintéticos con timestamps.
- Mantener el reloj, el marcador y el estado reglamentario simulado.
- Permitir pausar, reanudar, reiniciar y cambiar la velocidad de reproducción.

El simulador debe generar eventos semánticos, no depender de que otro módulo deduzca qué sucedió mirando la animación.

### B. MatchTruth

Responsabilidades:

- Consumir eventos del partido.
- Calcular métricas básicas.
- Detectar patrones definidos mediante reglas explícitas.
- Generar insights con evidencia asociada.
- Validar que las afirmaciones sean compatibles con los datos.
- Invalidar las conclusiones afectadas por una corrección.

La lógica inicial debe ser determinista. Se puede incorporar un modelo de lenguaje opcional para redactar explicaciones, pero nunca debe ser la fuente de verdad de los datos.

### C. BroadcastSync

Responsabilidades:

- Recibir insights validados.
- Asignar prioridad y duración.
- Planificar el momento de aparición de cada gráfico.
- Resolver conflictos entre overlays.
- Evitar mostrar información vencida o invalidada.
- Actualizar o retirar overlays ante correcciones.
- Registrar las decisiones de planificación.

### D. 3D Renderer

Responsabilidades:

- Renderizar la cancha, los jugadores, la pelota y las cámaras.
- Interpolar posiciones entre actualizaciones.
- Representar las secuencias generadas por el simulador.
- Sincronizar la escena con el reloj del partido.
- Mantener separada la animación del estado reglamentario.

La animación es una representación del estado, no una fuente alternativa de datos.

### E. Broadcast UI

Responsabilidades:

- Mostrar la escena 3D.
- Mostrar marcador y reloj.
- Renderizar overlays activos.
- Exponer el panel de control.
- Permitir cambiar de perfil de audiencia.
- Mostrar el registro de eventos, insights, validaciones y decisiones.

## 6. Estructuras de datos

Las siguientes estructuras constituyen el contrato inicial entre los módulos. OpenCode puede ajustarlas únicamente cuando exista una razón técnica concreta, documentando cualquier cambio.

### 6.1 Match

ts
export type MatchStatus =
  | "scheduled"
  | "live"
  | "halftime"
  | "finished";

export interface Match {
  id: string;
  seed: number;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  period: 1 | 2;
  clockMs: number;
  score: {
    home: number;
    away: number;
  };
  eventSequence: number;
}


clockMs representa el tiempo simulado transcurrido en el período actual. La interfaz puede mostrar minutos y segundos derivados de este valor.

### 6.2 Team y Player

ts
export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  shirtNumber: number;
  role: "GK" | "DEF" | "MID" | "FWD";
  position: Vector3;
}


Los nombres y los equipos son ficticios. Las posiciones utilizan coordenadas del mundo 3D y deben respetar una convención documentada.

### 6.3 MatchEvent

Todos los módulos deben consumir un contrato común de eventos.

ts
export type MatchEventType =
  | "kickoff"
  | "pass"
  | "ball_recovery"
  | "pressure"
  | "shot"
  | "goal"
  | "goal_disallowed"
  | "possession_change"
  | "period_end";

export interface MatchEvent {
  id: string;
  matchId: string;
  sequence: number;
  type: MatchEventType;
  period: 1 | 2;
  clockMs: number;
  occurredAtMs: number;
  teamId?: string;
  playerId?: string;
  relatedEventId?: string;
  position?: Vector3;
  targetPosition?: Vector3;
  payload: Record<string, unknown>;
  status: "valid" | "corrected" | "void";
}


Reglas:

- sequence debe ser estrictamente creciente dentro del partido.
- id identifica el evento de forma única.
- relatedEventId permite relacionar una corrección con el evento original.
- clockMs representa el tiempo del partido; occurredAtMs, el tiempo lógico de emisión dentro de la simulación.
- payload contiene datos específicos del evento y debe validarse según su tipo mediante esquemas Zod.
- Los eventos no deben borrarse al corregirse. Debe conservarse la trazabilidad.

### 6.4 MatchInsight

Representa una conclusión candidata generada por MatchTruth.

ts
export type InsightCategory =
  | "tactical"
  | "performance"
  | "match_event"
  | "milestone";

export type AudienceMode = "analyst" | "fan";

export interface MatchInsight {
  id: string;
  matchId: string;
  category: InsightCategory;
  headline: string;
  explanation: string;
  priority: number;
  evidenceEventIds: string[];
  createdAtMs: number;
  validUntilMs?: number;
  status: "candidate" | "validated" | "invalidated";
  audienceText: Partial<Record<AudienceMode, string>>;
}


Reglas:

- priority utiliza una escala documentada de 0 a 100.
- evidenceEventIds no puede estar vacío para una afirmación factual sobre el partido.
- El texto debe distinguir entre un hecho observado y una interpretación táctica.
- Si se invalida una evidencia necesaria, el insight debe reevaluarse.
- El modo analista puede incluir métricas y contexto táctico; el modo aficionado debe priorizar una explicación sencilla.
- No generar conclusiones que requieran información que el simulador no produce.

### 6.5 Overlay

Representa un elemento gráfico que puede mostrarse durante la transmisión.

ts
export type OverlayStatus =
  | "queued"
  | "scheduled"
  | "active"
  | "expired"
  | "withdrawn";

export interface BroadcastOverlay {
  id: string;
  matchId: string;
  insightId: string;
  priority: number;
  status: OverlayStatus;
  scheduledAtMs?: number;
  startedAtMs?: number;
  expiresAtMs?: number;
  slot: "scorebug" | "lower_third" | "side_panel";
  version: number;
}


Reglas:

- Cada overlay debe estar asociado con un insight existente.
- Los gráficos persistentes, como el marcador, deben diferenciarse de los overlays temporales.
- La versión aumenta cuando se modifica la planificación de un overlay.
- Los overlays retirados o vencidos no deben seguir visibles.
- Un overlay asociado a un insight invalidado debe retirarse o actualizarse antes de seguir presentándose como información vigente.

### 6.6 CorrectionEvent

ts
export interface CorrectionEvent {
  id: string;
  matchId: string;
  sourceEventId: string;
  sequence: number;
  clockMs: number;
  reason: string;
  replacementEventId?: string;
}


Una corrección debe activar un proceso explícito de reevaluación. Por ejemplo, un goal_disallowed relacionado con un gol previo debe:

1. Marcar el gol original como invalidado para el estado actual.
2. Recalcular el marcador oficial simulado.
3. Invalidar o reevaluar los insights afectados.
4. Retirar o actualizar los overlays dependientes.
5. Corregir cualquier resumen generado a partir del gol.
6. Registrar el resultado de la corrección en el panel de control.

No implementar VAR real. Es una secuencia ficticia controlada por el simulador.

## 7. Sincronización y reloj

El sistema debe separar:

- *Match clock:* tiempo de juego mostrado en la transmisión.
- *Simulation clock:* tiempo lógico empleado para reproducir los eventos.
- *Wall clock:* tiempo real del navegador, usado únicamente para animación y medición de rendimiento.

Los eventos y las decisiones de planificación deben depender del tiempo lógico simulado. La animación puede interpolarse entre posiciones usando el tiempo del navegador.

Cambiar la velocidad de reproducción no debe alterar el orden, los resultados ni las estadísticas del partido.

Al pausar, la escena, el reloj simulado y las transiciones temporales deben detenerse de forma coherente.

## 8. Reglas de MatchTruth

Implementar inicialmente un conjunto pequeño de detectores deterministas.

### Detectores iniciales

1. Cambio de posesión.
2. Recuperación en zona avanzada.
3. Secuencia de pases consecutivos.
4. Tiro a puerta.
5. Gol.
6. Cambio de ritmo o presión, únicamente cuando existan métricas suficientes.
7. Hito simple del partido, si se cumplen sus condiciones.

Cada detector debe definir:

- Sus eventos de entrada.
- Su ventana temporal.
- Sus condiciones de activación.
- Los datos utilizados.
- La evidencia asociada.
- La condición de expiración.
- Las condiciones de invalidación.

No utilizar expresiones como «dominio absoluto» o «presión creciente» sin una regla mensurable y datos suficientes que las respalden.

## 9. Reglas de BroadcastSync

### Priorización

Implementar una función determinista que considere:

- Importancia del insight.
- Vigencia de la evidencia.
- Relevancia del evento.
- Compatibilidad con el espacio gráfico disponible.
- Si existe otro overlay activo que transmite información equivalente.

### Conflictos

En la primera versión:

- Permitir un único overlay temporal principal en el slot lower_third.
- Mantener el marcador en su slot persistente.
- Permitir el panel lateral si no tapa información esencial.
- Priorizar los eventos de alta importancia sobre los informativos de menor prioridad.
- Posponer o descartar insights vencidos.
- Evitar duplicados visuales de un mismo insight.

Los slots y las reglas deben centralizarse en el planificador, no dispersarse entre componentes visuales.

### Expiración

Un overlay debe tener una política de expiración explícita. Cuando vence:

- Cambia a expired.
- Deja de renderizarse.
- Permanece en el historial para auditoría.

### Corrección

Una corrección tiene prioridad sobre la presentación de información dependiente de los hechos invalidados. No basta con cambiar el texto en pantalla: también hay que revisar las métricas y los resúmenes afectados.

## 10. Interfaz de usuario

La aplicación tendrá una pantalla principal de transmisión y un panel de control.

### Vista de transmisión

- Cancha 3D.
- Jugadores y pelota.
- Cámaras configuradas para una vista general y una vista táctica.
- Marcador y reloj.
- Overlays temporales.
- Selector de audiencia.
- Controles de reproducción.

### Panel de control

- Estado de la simulación.
- Últimos eventos emitidos.
- Insights candidatos y validados.
- Evidencias asociadas a cada insight.
- Overlays activos, en cola, vencidos o retirados.
- Conflictos de planificación y su resolución.
- Historial de correcciones.
- Estado de cada módulo.

La interfaz debe distinguir claramente la transmisión del panel técnico. El panel no debe ocupar el lugar de la experiencia de transmisión.

## 11. Escenario de demostración obligatorio

El simulador debe contar con una secuencia reproducible que muestre el diferencial del producto.

1. Inicio del partido.
2. Secuencia de pases.
3. Recuperación en campo rival.
4. MatchTruth genera un insight táctico respaldado por los eventos.
5. BroadcastSync decide cuándo mostrarlo.
6. El insight aparece en la transmisión.
7. Se produce un gol sintético.
8. El marcador se actualiza.
9. El simulador emite una corrección que anula el gol.
10. El sistema recalcula el marcador, retira los gráficos afectados y actualiza el resumen.
11. El panel de control permite inspeccionar toda la secuencia.
12. El modo aficionado y el modo analista presentan explicaciones distintas, basadas en la misma evidencia válida.

El escenario debe poder ejecutarse con una semilla fija y sin depender de una llamada de IA remota.

## 12. Pruebas y criterios de aceptación

### Motor de simulación

- Una semilla fija produce la misma secuencia lógica de eventos.
- El número de secuencia es estrictamente creciente.
- La pausa detiene el reloj lógico.
- La velocidad de reproducción no cambia el resultado del partido.
- Los eventos se validan contra sus respectivos esquemas.

### MatchTruth

- Cada insight factual referencia eventos existentes.
- No se generan estadísticas que no puedan calcularse a partir de los datos.
- Una corrección invalida o reevalúa las conclusiones dependientes.
- Las explicaciones para analistas y aficionados conservan el mismo fundamento factual.

### BroadcastSync

- No se muestran overlays vencidos.
- Los conflictos se resuelven según las reglas documentadas.
- Un insight invalidado no permanece como información vigente.
- La corrección del gol actualiza el marcador y los gráficos dependientes.
- Los cambios quedan registrados en el historial.

### Interfaz 3D

- La pelota y los jugadores siguen la secuencia definida.
- El reloj de la transmisión permanece sincronizado con el partido.
- Pausa, reanudación y reinicio funcionan.
- Los overlays pueden mostrarse y retirarse sin bloquear la interacción con la escena.
- El sistema mantiene una experiencia fluida en el equipo de desarrollo.

No declarar cumplimiento de rendimiento sin medirlo. Registrar el navegador, el hardware y las condiciones de las pruebas.

### Pruebas de integración

El flujo completo de la demostración debe ejecutarse automáticamente, al menos a nivel de lógica, desde la emisión de eventos hasta la corrección del marcador y los overlays.

No se considera terminado un módulo porque compile: debe cumplir sus criterios de aceptación.

## 13. Organización sugerida del proyecto

text
sigma-broadcast/
├── SPEC.md
├── README.md
├── package.json
├── index.html
├── public/
│   └── assets/
├── src/
│   ├── app/
│   ├── components/
│   ├── simulation/
│   │   ├── engine.ts
│   │   ├── scenarios.ts
│   │   └── event-factory.ts
│   ├── contracts/
│   │   ├── match.ts
│   │   ├── events.ts
│   │   ├── insights.ts
│   │   └── overlays.ts
│   ├── match-truth/
│   │   ├── detectors/
│   │   ├── validation.ts
│   │   └── insight-engine.ts
│   ├── broadcast-sync/
│   │   ├── scheduler.ts
│   │   ├── conflict-resolver.ts
│   │   └── correction-handler.ts
│   ├── renderer3d/
│   │   ├── pitch.ts
│   │   ├── players.ts
│   │   ├── ball.ts
│   │   └── cameras.ts
│   ├── broadcast-ui/
│   ├── state/
│   └── main.tsx
└── tests/
    ├── simulation/
    ├── match-truth/
    ├── broadcast-sync/
    └── integration/


Esta estructura es una guía, no una obligación de crear archivos vacíos. Crear módulos cuando se implemente su funcionalidad.

## 14. Presupuesto y dependencias externas

El MVP debe funcionar localmente sin credenciales ni servicios pagos.

- No utilizar APIs pagas.
- No depender de cuotas gratuitas que no se hayan verificado.
- No hacer que la IA sea necesaria para ejecutar la demostración.
- No incorporar assets con licencias incompatibles.
- Priorizar modelos geométricos y recursos propios.
- Documentar licencias de las dependencias.
- Verificar cualquier servicio de Microsoft antes de integrarlo o mencionarlo como tecnología utilizada.

El uso de OpenCode como herramienta de desarrollo no constituye por sí solo una integración tecnológica del producto.

## 15. Fases de implementación

### Fase 0 — Fundamentos

- Inicializar el repositorio.
- Configurar TypeScript, Vite y testing.
- Implementar los contratos de datos.
- Documentar coordenadas, reloj y eventos.
- Validar la ejecución local.

*Salida:* aplicación ejecutable y contratos compartidos.

### Fase 1 — Simulación

- Construir la cancha 3D.
- Añadir equipos, jugadores y pelota.
- Implementar movimientos coordinados.
- Crear el escenario sintético reproducible.
- Implementar reloj, pausa y velocidad.

*Salida:* partido 3D controlado por eventos.

### Fase 2 — MatchTruth

- Implementar detectores.
- Calcular estadísticas básicas.
- Crear insights respaldados por evidencia.
- Implementar validación e invalidación.
- Añadir pruebas unitarias.

*Salida:* motor de interpretación verificable.

### Fase 3 — BroadcastSync

- Implementar prioridad y planificación.
- Resolver conflictos entre overlays.
- Gestionar duración y expiración.
- Implementar el flujo de corrección.
- Añadir historial auditable.

*Salida:* motor de dirección de transmisión funcional.

### Fase 4 — Experiencia integrada

- Diseñar la interfaz de transmisión.
- Integrar marcador, reloj y overlays.
- Construir el panel de control.
- Incorporar modos de audiencia.
- Ejecutar el escenario completo de demostración.

*Salida:* MVP funcional de extremo a extremo.

### Fase 5 — Preparación del hackathon

- Ejecutar las pruebas.
- Corregir defectos críticos.
- Documentar instalación y ejecución.
- Preparar README y descripción técnica.
- Grabar una demostración de menos de dos minutos.
- Verificar el repositorio público y los requisitos de entrega.

*Prioridad:* una demo completa, reproducible y verificable antes que una cantidad elevada de funcionalidades incompletas.

## 16. Instrucciones para OpenCode

Antes de implementar:

1. Inspeccionar el repositorio y su estado actual.
2. Leer este documento completo.
3. Proponer un plan por fases con dependencias y criterios de aceptación.
4. Identificar riesgos técnicos reales, especialmente la sincronización entre reloj, eventos, escena y overlays.
5. Comenzar por la Fase 0 y no avanzar a ciegas.

Durante el desarrollo:

- Implementar una fase por vez.
- Ejecutar las pruebas relevantes tras cada cambio.
- No reemplazar lógica funcional con mocks permanentes.
- No inventar funcionalidades ni integraciones.
- No introducir dependencias pagas.
- Mantener los contratos compartidos como fuente de verdad.
- Documentar decisiones arquitectónicas que cambien esta especificación.
- Corregir errores antes de ampliar el alcance.
- Informar qué está implementado, qué está probado y qué permanece pendiente.

### Definición de terminado

Una fase está terminada cuando su funcionalidad está implementada, las pruebas correspondientes pasan y sus criterios de aceptación se cumplen. La compilación por sí sola no es suficiente.

---

## 17. Extensiones implementadas

Esta sección documenta las ampliaciones construidas sobre la especificación inicial. No modifican los principios de §3 ni el contrato de `MatchInsight`: lasLocalization se resuelve fuera del insight y las métricas nuevas viven en estructuras propias.

### 17.1 Narrative Recap (resumen narrativo automático)

Al alcanzar el estado `finished`, el sistema genera un resumen narrativo del partido sin intervención manual.

- Origen: `src/match-truth/narrative.ts` (`buildNarrativeRecap`) y `src/contracts/recap.ts` (contrato Zod `narrativeRecapSchema`).
- El recap es **dato, no prosa**: cada frase es una clave de catálogo más sus variables, por lo que puede renderizarse en cualquier idioma sin perder su trazabilidad.
- Contenido: titular del resultado, frases de síntesis (posesión, tiros, volumen y dificultad de pases, velocidad de golpe, correcciones), hitos clave ordenados cronológicamente y tabla de estadísticas por equipo.
- Se genera una sola vez por partido (`BroadcastController.refreshRecap`) y se limpia con `BroadcastController.reset()`.
- Se renderiza en `src/broadcast-ui/MatchRecap.tsx` y se localiza con `localizeRecap(locale, recap)`.
- No introduce afirmaciones sin respaldo: cada frase se deriva del registro de eventos y de las estadísticas calculadas.

### 17.2 Localización (i18n)

- Módulo: `src/i18n/` con `locale.ts`, `translate.ts` y los catálogos `catalog/en.ts` y `catalog/es.ts`.
- `t(locale, key, vars)` interpola `{placeholders}`; las claves ausentes caen al inglés y, en último caso, se renderiza la propia clave.
- Detección inicial por `navigator.language` (`detectLocale`) y cambio en caliente desde la interfaz (`setLocale`).
- Los insights se generan con el texto en inglés y un `id` estable; `localizeInsight(locale, insight, events)` reconstruye el texto resolviendo las variables desde los eventos de evidencia originales. El contrato `MatchInsight` no cambia.

### 17.3 Métricas avanzadas

- Módulo: `src/match-truth/advanced-metrics.ts`.
- Distancia de pase, progresividad, pase bajo presión y dificultad de pase (0..1).
- Velocidad de golpe estimada en m/s y km/h, distancia al arco y dificultad del tiro (0..1).
- La velocidad de golpe es una **estimación** derivada del intervalo entre eventos (ventana 200–6000 ms, clamp 6–34 m/s); así se declara en la interfaz y en `docs/coordinates-clock-events.md` §5.
- Las métricas se agregan en `computeStats` y se muestran en el panel de control y en el recap.

### 17.4 Rediseño de interfaz

- Sistema visual monocromático estricto: `#111111`, `#ffffff`, `#e5e5e5`, `#f5f5f5`, `#707072`, `#9e9ea0`. Sin sombras, sin degradados de color, sin acentos cromáticos.
- Geometría: botones pill (`30px`), buscador pill (`24px`), tarjetas con radio `0` y bordes hairline de `1px`.
- Tipografía: pesos 400/500, jerarquía de 12–20 px y display de hasta 76 px con interletrado negativo.
- Arquitectura de pantallas: navegación de dos niveles con pestañas *Transmisión* / *Panel de control*, hero editorial, escenario 3D, controles de transporte, tira de inteligencia, resumen narrativo y pie de cuatro columnas.
- Accesibilidad: estados de foco visibles, contraste ≥ 4.5:1, `prefers-reduced-motion`, layout responsive en 375 / 768 / 1024 / 1440 px, iconos SVG sin emojis y `cursor: pointer` en todo control interactivo.
- Microinteracciones limitadas a `transform` y `opacity`, entre 150 y 200 ms.

### 17.5 Criterios de aceptación añadidos

- El recap no existe antes del final del partido y se genera automáticamente al terminarlo.
- El mismo recap se renderiza íntegramente en inglés y en español conservando marcador, orden e hitos.
- `reset()` deja motor, verdad y director en estado limpio y borra el recap.
- Cada idioma contiene todas las claves del catálogo por defecto.
- La vista de aplicación se renderiza sin errores en ambos idiomas.

---

## 18. Capa de IA y diseño agéntico

La IA es una capa **opcional y degradable** sobre el pipeline determinista. Nunca es la fuente de verdad: toda decisión conserva evidencia, modelo y motivo.

### 18.1 Modelo local de prioridad y audiencia

- Dos perceptrones multicapa entrenados offline con `scripts/train-models.mjs` y exportados como pesos TypeScript en `src/ai/model/weights.ts` (sin dependencias de runtime).
- 25 features derivadas de reglas, evidencia, categoría, ventana de validez, contexto del partido y personalización.
- El modelo de prioridad produce un `score` (0..1) y el de audiencia elige `fan` o `analyst`; la confianza se deriva de la distancia a 0.5.
- La explicación se calcula por ablación: se anula cada feature normalizada y se mide el cambio en la salida. Las contribuciones quedan en `MatchInsight.ai.contributions`.
- Entrenamiento reproducible por semilla; pesos versionados y auditables.

### 18.2 Agente de dirección

- `BroadcastAgent` (`src/ai/agent.ts`) observa cada insight nuevo y emite una decisión: `air`, `boost`, `hold` o `suppress`.
- Herramientas declaradas en cada decisión: contexto del partido, evidencia, puntuación, selección de audiencia, relevancia de seguimiento y ventana de validez.
- Modos:
  - `advisory` (por defecto): el director determinista mantiene el control; la IA solo recomienda y anota.
  - `autonomous`: la prioridad combinada (`60%` regla + `40%` modelo) se aplica al director y los insights débiles o invalidados pueden suprimirse.
- Cada decisión incluye `score`, `confidence`, `topFeature`, evidencia, modelo, modo, herramientas usadas y si se aplicó. El historial se exporta en JSON.

### 18.3 Personalización

- El operador puede seguir un club o un jugador; también se puede fijar por URL en `/output?team=<teamId>&player=<playerId>`.
- La personalización solo modifica features y resaltado visual: los insights que involucran al club/jugador seguido reciben `boost` y borde dorado en el overlay.
- No se usan datos reales de usuarios ni perfiles; la preferencia es explícita y local.

### 18.4 LLM opcional y grounding

- Proveedores: Azure OpenAI, GitHub Models o proxy de Azure Functions (`api/`).
- La explicación y el recap por LLM se solicitan bajo demanda; si no hay proveedor o la validación falla, se usa el fallback on-device/determinista.
- Validación estricta: el texto debe citar solo IDs de evidencia permitidos y todo número debe existir en la evidencia o estadísticas. Una respuesta inventada se descarta.
- Los prompts piden JSON estricto y prohíben inventar jugadores, equipos, marcadores, minutos o estadísticas.

## 19. Tecnologías Microsoft y Azure

- **Azure Static Web Apps**: hosting del frontend y de las Azure Functions administradas (`staticwebapp.config.json`, `.github/workflows/azure-static-web-apps.yml`).
- **Azure Functions (Node.js v4)**: proxy `POST /api/ai` y `GET /api/health`; las claves viven solo en configuración del servidor.
- **Azure OpenAI**: proveedor LLM principal cuando está configurado.
- **GitHub Models**: alternativa para demos sin suscripción de Azure.
- **Application Insights**: telemetría de producto vía `@microsoft/applicationinsights-web` (eventos de modo agente, explicación, recap y export), sin enviar prompts ni datos personales.
- **GitHub Actions**: CI, deploy a Azure Static Web Apps y demo pública en GitHub Pages.
- **GitHub**: repositorio público, control de versiones y entrega.

## 20. Criterios de aceptación de la capa IA

- La aplicación funciona sin credenciales y sin red: el modelo local y el fallback determinista cubren toda la demo.
- Todo insight creado recibe metadata IA y una decisión de agente cuando la IA está activa.
- En modo `advisory` la planificación determinista no cambia; en `autonomous` la prioridad aplicada coincide con la recomendada.
- Las decisiones y narrativas se exportan con timecodes y evidencia.
- Una respuesta LLM con IDs o números no respaldados se rechaza y se registra el fallback.
- El build, el typecheck y la suite de pruebas pasan sin variables de entorno.

---

*Fin de la especificación inicial.*