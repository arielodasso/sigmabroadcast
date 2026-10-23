/**
 * English catalog — the default locale of Sigma Broadcast.
 *
 * Every visible string of the interface lives here (and in the sibling
 * `es.ts`). Templates use `{placeholder}` interpolation and are resolved by
 * `t()` in `src/i18n/translate.ts`.
 */

export const en: Record<string, string> = {
  // ── Navigation ──────────────────────────────────────────────────────────
  "nav.skip": "Skip to broadcast",
  "nav.broadcast": "Broadcast",
  "nav.audit": "Control panel",
  "nav.search": "Filter events, insights or decisions",
  "nav.searchLabel": "Search the broadcast log",
  "nav.language": "Language",
  "nav.menu": "Main navigation",
  "nav.brand": "Sigma Broadcast",
  "nav.brandTagline": "Synthetic match, intelligently broadcast",

  // ── Utility bar ─────────────────────────────────────────────────────────
  "utility.synthetic": "Synthetic match · no real data",
  "utility.help": "Help",
  "utility.docs": "Documentation",
  "utility.region": "Region",
  "utility.regionValue": "Global",

  // ── Editorial hero ──────────────────────────────────────────────────────
  "hero.kicker": "Sigma Broadcast",
  "hero.title": "INTELLIGENTLY BROADCAST",
  "hero.subtitle":
    "A synthetic football match read in real time. Every overlay is backed by evidence, every correction propagates instantly.",
  "hero.cta": "Watch the broadcast",
  "hero.ctaAudit": "Open the control panel",
  "hero.cardLabel": "Match card",
  "hero.status": "Status",
  "hero.clock": "Clock",
  "hero.score": "Score",

  // ── Control bar ─────────────────────────────────────────────────────────
  "controls.play": "Play",
  "controls.pause": "Pause",
  "controls.replay": "Replay",
  "controls.reset": "Reset",
  "controls.speed": "Playback speed",
  "controls.delay": "Broadcast delay",
  "controls.delay.off": "Off",
  "controls.camera": "Camera",
  "controls.audience": "Audience",
  "controls.camera.broadcast": "Broadcast",
  "controls.camera.tactical": "Tactical",
  "controls.audience.fan": "Fan",
  "controls.audience.analyst": "Analyst",
  "controls.playMatch": "Play match",
  "controls.group": "Transmission controls",

  // ── Scorebug ────────────────────────────────────────────────────────────
  "scorebug.label": "Scoreboard",
  "scorebug.ft": "FT",
  "scorebug.ht": "HT",
  "scorebug.firstHalf": "1ST",
  "scorebug.secondHalf": "2ND",
  "scorebug.scheduled": "—",

  // ── Overlays ────────────────────────────────────────────────────────────
  "overlay.label": "Broadcast overlays",
  "overlay.tactical": "Tactical",
  "overlay.live": "Live",
  "overlay.priority": "Priority",

  // ── Intelligence strip ──────────────────────────────────────────────────
  "strip.title": "Broadcast intelligence",
  "strip.insights": "Insights",
  "strip.onAir": "On air",
  "strip.decisions": "Decisions",
  "strip.corrections": "Corrections",

  // ── Control panel ───────────────────────────────────────────────────────
  "panel.title": "Control panel",
  "panel.lede":
    "Simulation state, evidence-backed insights, overlay scheduling and the full audit trail.",
  "panel.modules": "Modules",
  "panel.simulator": "Match Simulator",
  "panel.truth": "MatchTruth",
  "panel.sync": "BroadcastSync",
  "panel.validation": "Validation issues",
  "panel.possession": "Possession (derived)",
  "panel.overlays": "Overlays",
  "panel.corrections": "Corrections",
  "panel.events": "Events",
  "panel.insights": "Insights",
  "panel.decisions": "Scheduling decisions",
  "panel.insightDetail": "Insight detail",
  "panel.advanced": "Advanced metrics",
  "panel.passMetrics": "Pass metrics",
  "panel.shotMetrics": "Shot metrics",
  "panel.distance": "Distance",
  "panel.difficulty": "Difficulty",
  "panel.speed": "Speed",
  "panel.matchState": "Match state",
  "panel.status": "Status",
  "panel.clock": "Clock",
  "panel.score": "Score",
  "panel.period": "Period",
  "panel.none": "None",
  "panel.noneYet": "None yet",
  "panel.noInvalidated": "No invalidated insights",
  "panel.evidence": "evidence",
  "panel.filter": "Filter the log",
  "panel.noResults": "No entries match this filter.",
  "panel.version": "v",
  "panel.home": "Home",
  "panel.away": "Away",
  "panel.exportJson": "Download JSON export",
  "panel.outputSource": "Open transparent output",
  "panel.broadcastDelay": "Broadcast delay",

  // ── Narrative recap ─────────────────────────────────────────────────────
  "recap.kicker": "Full time",
  "recap.title": "Match recap",
  "recap.empty":
    "The narrative recap is generated automatically when the match reaches full time.",
  "recap.keyMoments": "Key moments",
  "recap.statistics": "Team statistics",
  "recap.generated": "Generated at {clock}",
  "recap.headline": "{homeTeam} {homeScore}–{awayScore} {awayTeam}",
  "recap.sentence.homeWin": "{homeTeam} beat {awayTeam} {homeScore}–{awayScore}.",
  "recap.sentence.awayWin": "{awayTeam} beat {homeTeam} {awayScore}–{homeScore}.",
  "recap.sentence.draw": "{homeTeam} and {awayTeam} drew {homeScore}–{awayScore}.",
  "recap.sentence.possession": "{team} controlled possession with {percent}% of the ball.",
  "recap.sentence.shots": "{team} registered {shots} shots, {onTarget} on target.",
  "recap.sentence.passVolume":
    "{team} completed {completed} of {attempted} passes with a {distance} m average distance.",
  "recap.sentence.passDifficulty":
    "The hardest pass of the match was rated {difficulty} on the difficulty scale.",
  "recap.sentence.correction":
    "A goal was disallowed for {reason} and the score was recomputed.",
  "recap.sentence.shotSpeed":
    "The fastest strike was estimated at {speed} km/h.",
  "recap.moment.goal": "Goal — {team}",
  "recap.moment.goalDetail": "Scored in the {period} half at {clock}.",
  "recap.moment.disallowed": "Goal disallowed — {reason}",
  "recap.moment.disallowedDetail":
    "The original goal was struck in the {period} half at {clock}.",
  "recap.moment.shot": "Shot on target — {team}",
  "recap.moment.shotDetail":
    "Estimated strike speed {speed} km/h from {distance} m out.",
  "recap.moment.recovery": "Advanced recovery — {team}",
  "recap.moment.recoveryDetail":
    "Ball won back in the {period} half at {clock}.",
  "recap.period.first": "1st",
  "recap.period.second": "2nd",

  // ── Statistics labels ───────────────────────────────────────────────────
  "stat.label": "Metric",
  "stat.possession": "Possession",
  "stat.passes": "Passes",
  "stat.passAccuracy": "Pass accuracy",
  "stat.avgPassDistance": "Avg pass distance",
  "stat.avgPassDifficulty": "Avg pass difficulty",
  "stat.progressivePasses": "Progressive passes",
  "stat.progressive": "progressive",
  "stat.underPressure": "under pressure",
  "stat.shots": "Shots",
  "stat.shotsOnTarget": "On target",
  "stat.avgShotSpeed": "Avg shot speed",
  "stat.recoveries": "Recoveries",
  "stat.goals": "Goals",
  "stat.events": "Events recorded",

  // ── Event labels ────────────────────────────────────────────────────────
  "event.goal": "Goal",
  "event.goal_disallowed": "Goal disallowed ({reason})",
  "event.shot": "Shot {result} #{player}",
  "event.ball_recovery": "Recovery ({zone}) #{player}",
  "event.pressure": "Pressure {intensity} #{player}",
  "event.pass": "Pass {result} #{player}",
  "event.possession_change": "Possession change",
  "event.kickoff": "Kickoff",
  "event.period_end": "Period end",
  "event.shot.onTarget": "on target",
  "event.shot.offTarget": "off target",
  "event.pass.completed": "completed",
  "event.pass.lost": "lost",
  "event.zone.defensive": "defensive",
  "event.zone.middle": "middle",
  "event.zone.advanced": "advanced",
  "event.reason.offside": "offside",

  // ── Insight templates ───────────────────────────────────────────────────
  "insight.goal.headline": "Goal",
  "insight.goal.explanation": "Valid goal scored by {team}.",
  "insight.goal.analyst": "Goal for {team} (event {eventId}).",
  "insight.goal.fan": "GOAL! {team} scores!",
  "insight.disallowed.headline": "Goal disallowed",
  "insight.disallowed.explanation": "The previous goal was disallowed ({reason}).",
  "insight.disallowed.analyst":
    "Goal disallowed, reason: {reason}. Correction tied to {relatedEventId}.",
  "insight.disallowed.fan": "The goal doesn't count — {reason}!",
  "insight.shot.headline": "Shot on target",
  "insight.shot.explanation": "A shot on target was registered for {team}.",
  "insight.shot.analyst":
    "Shot on target ({team}); event {eventId} at {clockSeconds}s.",
  "insight.shot.fan": "{team} forces the keeper to work!",
  "insight.advrec.headline": "Recovery in the final third",
  "insight.advrec.explanation":
    "{team} regained possession in an advanced zone.",
  "insight.advrec.analyst":
    "{team} high turnover: recovery at {position} supported by {count} recent pass(es).",
  "insight.advrec.fan": "{team} wins the ball back high up the pitch!",
  "insight.passseq.headline": "{count}-pass sequence",
  "insight.passseq.explanation":
    "{team} completed {count} consecutive passes before the last possession change.",
  "insight.passseq.analyst":
    "{team}: {count} consecutive completed passes (threshold {threshold}).",
  "insight.passseq.fan": "{team} strings together {count} passes!",
  "insight.press.headline": "Sustained pressure converted",
  "insight.press.explanation":
    "{team} recovered the ball after {count} high-intensity pressure actions.",
  "insight.press.analyst":
    "{team}: {count} pressure events with intensity >= {threshold} in the last {windowSeconds}s (avg {avgIntensity}) leading to recovery {eventId}.",
  "insight.press.fan": "{team} press hard and win it back!",
  "insight.firstgoal.headline": "First goal of the match",
  "insight.firstgoal.explanation": "The opening goal was scored by {team}.",
  "insight.firstgoal.analyst":
    "Opening goal of the match, scored by {team}.",
  "insight.firstgoal.fan": "The first goal is in! {team} lead!",

  "ai.title": "Broadcast AI",
  "ai.subtitle":
    "An on-device model scores every insight and a bounded agent decides what deserves airtime.",
  "ai.mode": "Agent mode",
  "ai.mode.advisory": "Advisory",
  "ai.mode.autonomous": "Autonomous",
  "ai.mode.advisoryHint":
    "The agent recommends actions; the deterministic director keeps control.",
  "ai.mode.autonomousHint":
    "The agent applies its priority and can suppress weak or invalidated insights.",
  "ai.provider": "Provider",
  "ai.provider.local": "On-device MLP",
  "ai.provider.proxy": "Azure proxy",
  "ai.provider.azure-openai": "Azure OpenAI",
  "ai.provider.github-models": "GitHub Models",
  "ai.provider.deterministic-fallback": "Deterministic fallback",
  "ai.status": "Status",
  "ai.status.ready": "Ready",
  "ai.status.fallback": "Fallback",
  "ai.status.disabled": "Disabled",
  "ai.status.error": "Error",
  "ai.model": "Model",
  "ai.confidence": "Confidence",
  "ai.score": "AI score",
  "ai.topSignal": "Top signal",
  "ai.decision": "Decision",
  "ai.action.air": "Air",
  "ai.action.boost": "Boost",
  "ai.action.hold": "Hold",
  "ai.action.suppress": "Suppress",
  "ai.decisions": "Agent decisions",
  "ai.noDecisions": "No agent decisions yet.",
  "ai.explain": "Explain with AI",
  "ai.recap": "AI recap",
  "ai.fallback": "Deterministic fallback",
  "ai.llm": "LLM",
  "ai.llm.configured": "Configured",
  "ai.llm.notConfigured": "On-device only",
  "ai.personalization": "Personalization",
  "ai.followTeam": "Follow a club",
  "ai.followPlayer": "Follow a player",
  "ai.followNone": "No preference",
  "ai.followHint":
    "Followed clubs and players are boosted by the on-device model using evidence only.",
  "ai.evidence": "{count} evidence events",
  "ai.latency": "{ms} ms",
  "ai.explainModel":
    "On-device model scores this insight {score} with {confidence} confidence, led by {feature} across {evidence} evidence events. {explanation}",
  "ai.prompt.system":
    "You are Sigma Broadcast's match analyst. Describe only facts contained in the supplied evidence. Never invent players, teams, scores, minutes, statistics, or event IDs. Reply with strict JSON and nothing else: an object with a text string and an evidenceEventIds array. The text must be one or two sentences in the requested language, and every number must appear in the evidence. Use only IDs from allowedEventIds.",
  "ai.prompt.explain":
    "Language: {locale}. Explain one broadcast insight. Insight: {insight}. Evidence: {evidence}. Allowed event IDs: {allowedEventIds}. Return the JSON object now.",
  "ai.prompt.recap":
    "Language: {locale}. Summarize the finished match for a broadcast audience. Match: {match}. Stats: {stats}. Structured recap: {recap}. Evidence: {evidence}. Allowed event IDs: {allowedEventIds}. Return the JSON object now.",
};
