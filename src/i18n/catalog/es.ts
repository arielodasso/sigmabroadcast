/**
 * Spanish catalog — optional locale of Sigma Broadcast.
 *
 * Keys mirror `en.ts` one to one. The English catalog is the fallback for any
 * key missing here, so a partial translation never breaks the interface.
 */

export const es: Record<string, string> = {
  // ── Navigation ──────────────────────────────────────────────────────────
  "nav.skip": "Saltar a la transmisión",
  "nav.broadcast": "Transmisión",
  "nav.audit": "Panel de control",
  "nav.search": "Filtrar eventos, insights o decisiones",
  "nav.searchLabel": "Buscar en el registro de la transmisión",
  "nav.language": "Idioma",
  "nav.menu": "Navegación principal",
  "nav.brand": "Sigma Broadcast",
  "nav.brandTagline": "Partido sintético, transmitido con inteligencia",

  // ── Utility bar ─────────────────────────────────────────────────────────
  "utility.synthetic": "Partido sintético · sin datos reales",
  "utility.help": "Ayuda",
  "utility.docs": "Documentación",
  "utility.region": "Región",
  "utility.regionValue": "Global",

  // ── Editorial hero ──────────────────────────────────────────────────────
  "hero.kicker": "Sigma Broadcast",
  "hero.title": "TRANSMISIÓN INTELIGENTE",
  "hero.subtitle":
    "Un partido de fútbol sintético leído en tiempo real. Cada overlay se apoya en evidencia y cada corrección se propaga al instante.",
  "hero.cta": "Ver la transmisión",
  "hero.ctaAudit": "Abrir el panel de control",
  "hero.cardLabel": "Ficha del partido",
  "hero.status": "Estado",
  "hero.clock": "Reloj",
  "hero.score": "Marcador",

  // ── Control bar ─────────────────────────────────────────────────────────
  "controls.play": "Reproducir",
  "controls.pause": "Pausar",
  "controls.replay": "Repetir",
  "controls.reset": "Reiniciar",
  "controls.speed": "Velocidad de reproducción",
  "controls.delay": "Retraso de transmisión",
  "controls.delay.off": "Sin retraso",
  "controls.camera": "Cámara",
  "controls.audience": "Audiencia",
  "controls.camera.broadcast": "Transmisión",
  "controls.camera.tactical": "Táctica",
  "controls.audience.fan": "Aficionado",
  "controls.audience.analyst": "Analista",
  "controls.playMatch": "Reproducir partido",
  "controls.group": "Controles de transmisión",

  // ── Scorebug ────────────────────────────────────────────────────────────
  "scorebug.label": "Marcador",
  "scorebug.ft": "FT",
  "scorebug.ht": "MT",
  "scorebug.firstHalf": "1ª",
  "scorebug.secondHalf": "2ª",
  "scorebug.scheduled": "—",

  // ── Overlays ────────────────────────────────────────────────────────────
  "overlay.label": "Overlays de la transmisión",
  "overlay.tactical": "Táctica",
  "overlay.live": "En vivo",
  "overlay.priority": "Prioridad",

  // ── Intelligence strip ──────────────────────────────────────────────────
  "strip.title": "Inteligencia de la transmisión",
  "strip.insights": "Insights",
  "strip.onAir": "En pantalla",
  "strip.decisions": "Decisiones",
  "strip.corrections": "Correcciones",

  // ── Control panel ───────────────────────────────────────────────────────
  "panel.title": "Panel de control",
  "panel.lede":
    "Estado de la simulación, insights con evidencia, planificación de overlays y el historial completo de auditoría.",
  "panel.modules": "Módulos",
  "panel.simulator": "Simulador de partido",
  "panel.truth": "MatchTruth",
  "panel.sync": "BroadcastSync",
  "panel.validation": "Problemas de validación",
  "panel.possession": "Posesión (derivada)",
  "panel.overlays": "Overlays",
  "panel.corrections": "Correcciones",
  "panel.events": "Eventos",
  "panel.insights": "Insights",
  "panel.decisions": "Decisiones de planificación",
  "panel.insightDetail": "Detalle del insight",
  "panel.advanced": "Métricas avanzadas",
  "panel.passMetrics": "Métricas de pase",
  "panel.shotMetrics": "Métricas de tiro",
  "panel.distance": "Distancia",
  "panel.difficulty": "Dificultad",
  "panel.speed": "Velocidad",
  "panel.matchState": "Estado del partido",
  "panel.status": "Estado",
  "panel.clock": "Reloj",
  "panel.score": "Marcador",
  "panel.period": "Período",
  "panel.none": "Ninguno",
  "panel.noneYet": "Todavía ninguno",
  "panel.noInvalidated": "No hay insights invalidados",
  "panel.evidence": "evidencia",
  "panel.filter": "Filtrar el registro",
  "panel.noResults": "Ninguna entrada coincide con este filtro.",
  "panel.version": "v",
  "panel.home": "Local",
  "panel.away": "Visitante",
  "panel.exportJson": "Descargar exportación JSON",
  "panel.outputSource": "Abrir salida transparente",
  "panel.broadcastDelay": "Retraso de transmisión",

  // ── Narrative recap ─────────────────────────────────────────────────────
  "recap.kicker": "Final",
  "recap.title": "Resumen del partido",
  "recap.empty":
    "El resumen narrativo se genera automáticamente cuando el partido llega al final.",
  "recap.keyMoments": "Hitos clave",
  "recap.statistics": "Estadísticas de equipo",
  "recap.generated": "Generado a las {clock}",
  "recap.headline": "{homeTeam} {homeScore}–{awayScore} {awayTeam}",
  "recap.sentence.homeWin": "{homeTeam} venció a {awayTeam} {homeScore}–{awayScore}.",
  "recap.sentence.awayWin": "{awayTeam} venció a {homeTeam} {awayScore}–{homeScore}.",
  "recap.sentence.draw": "{homeTeam} y {awayTeam} empataron {homeScore}–{awayScore}.",
  "recap.sentence.possession": "{team} controló la posesión con el {percent}% del balón.",
  "recap.sentence.shots": "{team} registró {shots} tiros, {onTarget} a puerta.",
  "recap.sentence.passVolume":
    "{team} completó {completed} de {attempted} pases con una distancia media de {distance} m.",
  "recap.sentence.passDifficulty":
    "El pase más difícil del partido puntuó {difficulty} en la escala de dificultad.",
  "recap.sentence.correction":
    "Se anuló un gol por {reason} y se recalculó el marcador.",
  "recap.sentence.shotSpeed":
    "El golpe más rápido se estimó en {speed} km/h.",
  "recap.moment.goal": "Gol — {team}",
  "recap.moment.goalDetail": "Marcado en la {period} parte a los {clock}.",
  "recap.moment.disallowed": "Gol anulado — {reason}",
  "recap.moment.disallowedDetail":
    "El gol original se ejecutó en la {period} parte a los {clock}.",
  "recap.moment.shot": "Tiro a puerta — {team}",
  "recap.moment.shotDetail":
    "Velocidad de golpe estimada {speed} km/h desde {distance} m.",
  "recap.moment.recovery": "Recuperación en campo rival — {team}",
  "recap.moment.recoveryDetail":
    "Balón recuperado en la {period} parte a los {clock}.",
  "recap.period.first": "1ª",
  "recap.period.second": "2ª",

  // ── Statistics labels ───────────────────────────────────────────────────
  "stat.label": "Métrica",
  "stat.possession": "Posesión",
  "stat.passes": "Pases",
  "stat.passAccuracy": "Precisión de pases",
  "stat.avgPassDistance": "Distancia media de pase",
  "stat.avgPassDifficulty": "Dificultad media de pase",
  "stat.progressivePasses": "Pases progresivos",
  "stat.progressive": "progresivo",
  "stat.underPressure": "bajo presión",
  "stat.shots": "Tiros",
  "stat.shotsOnTarget": "A puerta",
  "stat.avgShotSpeed": "Velocidad media de tiro",
  "stat.recoveries": "Recuperaciones",
  "stat.goals": "Goles",
  "stat.events": "Eventos registrados",

  // ── Event labels ────────────────────────────────────────────────────────
  "event.goal": "Gol",
  "event.goal_disallowed": "Gol anulado ({reason})",
  "event.shot": "Tiro {result} #{player}",
  "event.ball_recovery": "Recuperación ({zone}) #{player}",
  "event.pressure": "Presión {intensity} #{player}",
  "event.pass": "Pase {result} #{player}",
  "event.possession_change": "Cambio de posesión",
  "event.kickoff": "Saque de centro",
  "event.period_end": "Fin del período",
  "event.shot.onTarget": "a puerta",
  "event.shot.offTarget": "fuera",
  "event.pass.completed": "completado",
  "event.pass.lost": "perdido",
  "event.zone.defensive": "defensiva",
  "event.zone.middle": "media",
  "event.zone.advanced": "avanzada",
  "event.reason.offside": "posición adelantada",

  // ── Insight templates ───────────────────────────────────────────────────
  "insight.goal.headline": "Gol",
  "insight.goal.explanation": "Gol válido marcado por {team}.",
  "insight.goal.analyst": "Gol de {team} (evento {eventId}).",
  "insight.goal.fan": "¡GOL! ¡Marca {team}!",
  "insight.disallowed.headline": "Gol anulado",
  "insight.disallowed.explanation": "Se anuló el gol anterior ({reason}).",
  "insight.disallowed.analyst":
    "Gol anulado, motivo: {reason}. Corrección vinculada a {relatedEventId}.",
  "insight.disallowed.fan": "El gol no cuenta — ¡{reason}!",
  "insight.shot.headline": "Tiro a puerta",
  "insight.shot.explanation": "Se registró un tiro a puerta de {team}.",
  "insight.shot.analyst":
    "Tiro a puerta ({team}); evento {eventId} en el segundo {clockSeconds}.",
  "insight.shot.fan": "¡{team} Obliga a trabajar al portero!",
  "insight.advrec.headline": "Recuperación en campo rival",
  "insight.advrec.explanation": "{team} recuperó la posesión en una zona avanzada.",
  "insight.advrec.analyst":
    "{team} recuperación alta: robo en {position} apoyado por {count} pase(s) reciente(s).",
  "insight.advrec.fan": "¡{team} recupera el balón arriba!",
  "insight.passseq.headline": "Secuencia de {count} pases",
  "insight.passseq.explanation":
    "{team} completó {count} pases consecutivos antes del último cambio de posesión.",
  "insight.passseq.analyst":
    "{team}: {count} pases consecutivos completados (umbral {threshold}).",
  "insight.passseq.fan": "¡{team} encadena {count} pases!",
  "insight.press.headline": "Presión sostenida convertida",
  "insight.press.explanation":
    "{team} recuperó el balón tras {count} acciones de presión de alta intensidad.",
  "insight.press.analyst":
    "{team}: {count} eventos de presión con intensidad >= {threshold} en los últimos {windowSeconds}s (media {avgIntensity}) que derivan en la recuperación {eventId}.",
  "insight.press.fan": "¡{team} presiona fuerte y recupera!",
  "insight.firstgoal.headline": "Primer gol del partido",
  "insight.firstgoal.explanation": "El gol inaugural lo marcó {team}.",
  "insight.firstgoal.analyst": "Gol inaugural del partido, marcado por {team}.",
  "insight.firstgoal.fan": "¡El primer gol ya está! ¡{team} lidera!",

  "ai.title": "IA de transmisión",
  "ai.subtitle":
    "Un modelo local puntúa cada insight y un agente acotado decide qué merece salir al aire.",
  "ai.mode": "Modo del agente",
  "ai.mode.advisory": "Asesor",
  "ai.mode.autonomous": "Autónomo",
  "ai.mode.advisoryHint":
    "El agente recomienda acciones; el director determinista mantiene el control.",
  "ai.mode.autonomousHint":
    "El agente aplica su prioridad y puede retener insights débiles o invalidados.",
  "ai.provider": "Proveedor",
  "ai.provider.local": "MLP local",
  "ai.provider.proxy": "Proxy en Azure",
  "ai.provider.azure-openai": "Azure OpenAI",
  "ai.provider.github-models": "GitHub Models",
  "ai.provider.deterministic-fallback": "Fallback determinista",
  "ai.status": "Estado",
  "ai.status.ready": "Listo",
  "ai.status.fallback": "Fallback",
  "ai.status.disabled": "Desactivado",
  "ai.status.error": "Error",
  "ai.model": "Modelo",
  "ai.confidence": "Confianza",
  "ai.score": "Puntaje IA",
  "ai.topSignal": "Señal principal",
  "ai.decision": "Decisión",
  "ai.action.air": "Emitir",
  "ai.action.boost": "Impulsar",
  "ai.action.hold": "Retener",
  "ai.action.suppress": "Suprimir",
  "ai.decisions": "Decisiones del agente",
  "ai.noDecisions": "Todavía no hay decisiones del agente.",
  "ai.explain": "Explicar con IA",
  "ai.recap": "Resumen con IA",
  "ai.fallback": "Fallback determinista",
  "ai.llm": "LLM",
  "ai.llm.configured": "Configurado",
  "ai.llm.notConfigured": "Solo modelo local",
  "ai.personalization": "Personalización",
  "ai.followTeam": "Seguir un club",
  "ai.followPlayer": "Seguir un jugador",
  "ai.followNone": "Sin preferencia",
  "ai.followHint":
    "El modelo local impulsa clubes y jugadores seguidos usando solo la evidencia del partido.",
  "ai.evidence": "{count} eventos de evidencia",
  "ai.latency": "{ms} ms",
  "ai.explainModel":
    "El modelo local puntúa este insight {score} con confianza {confidence}, liderado por {feature} sobre {evidence} eventos de evidencia. {explanation}",
  "ai.prompt.system":
    "Sos el analista de partidos de Sigma Broadcast. Describí solo hechos contenidos en la evidencia suministrada. Nunca inventes jugadores, equipos, marcadores, minutos, estadísticas ni IDs de eventos. Respondé con JSON estricto y nada más: un objeto con un string text y un array evidenceEventIds. El texto debe tener una o dos oraciones en el idioma solicitado y cada número debe aparecer en la evidencia. Usá solo IDs de allowedEventIds.",
  "ai.prompt.explain":
    "Idioma: {locale}. Explicá un insight de transmisión. Insight: {insight}. Evidencia: {evidence}. IDs de evento permitidos: {allowedEventIds}. Devolvé el objeto JSON ahora.",
  "ai.prompt.recap":
    "Idioma: {locale}. Resumí el partido terminado para una audiencia de transmisión. Partido: {match}. Estadísticas: {stats}. Resumen estructurado: {recap}. Evidencia: {evidence}. IDs de evento permitidos: {allowedEventIds}. Devolvé el objeto JSON ahora.",
};
