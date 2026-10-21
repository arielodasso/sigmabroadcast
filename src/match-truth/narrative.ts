import type {
  Match,
  MatchEvent,
  NarrativeRecap,
  RecapMoment,
  RecapMomentKind,
  RecapOutcome,
  RecapStatRow,
} from "../contracts";
import { t, type Locale, type TranslationVars } from "../i18n";
import { formatClock, formatMeters, formatPercent } from "../utils/format";
import { TEAM_NAMES } from "./insight-text";
import type { MatchStats } from "./stats";

export interface LocalizedRecapMoment {
  eventId: string;
  period: 1 | 2;
  clockMs: number;
  kind: RecapMomentKind;
  title: string;
  detail: string;
}

export interface LocalizedRecap {
  headline: string;
  sentences: string[];
  moments: LocalizedRecapMoment[];
  statistics: { home: RecapStatRow[]; away: RecapStatRow[] };
}

const MAX_MOMENTS = 8;

function outcomeOf(home: number, away: number): RecapOutcome {
  if (home > away) return "home_win";
  if (away > home) return "away_win";
  return "draw";
}

function teamName(
  teamId: string | undefined,
  teamNames: Record<string, string>,
): string {
  if (!teamId) return "";
  return teamNames[teamId] ?? teamId;
}

function statRows(
  teamId: string,
  stats: MatchStats,
  teamNames: Record<string, string>,
): RecapStatRow[] {
  const team = stats.teams[teamId];
  if (!team) return [];
  const possession = stats.possessionByTeam[teamId] ?? 0;
  const accuracy =
    team.passesAttempted > 0
      ? (team.passesCompleted / team.passesAttempted) * 100
      : 0;

  return [
    { id: "possession", labelKey: "stat.possession", value: formatPercent(possession) },
    {
      id: "passes",
      labelKey: "stat.passes",
      value: `${team.passesCompleted}/${team.passesAttempted}`,
    },
    { id: "passAccuracy", labelKey: "stat.passAccuracy", value: formatPercent(accuracy, 0) },
    {
      id: "avgPassDistance",
      labelKey: "stat.avgPassDistance",
      value: formatMeters(team.averagePassDistanceM),
    },
    {
      id: "avgPassDifficulty",
      labelKey: "stat.avgPassDifficulty",
      value: team.averagePassDifficulty.toFixed(2),
    },
    {
      id: "progressivePasses",
      labelKey: "stat.progressivePasses",
      value: String(team.progressivePasses),
    },
    { id: "shots", labelKey: "stat.shots", value: String(team.shots) },
    {
      id: "shotsOnTarget",
      labelKey: "stat.shotsOnTarget",
      value: String(team.shotsOnTarget),
    },
    {
      id: "avgShotSpeed",
      labelKey: "stat.avgShotSpeed",
      value:
        team.shotSpeedSamples > 0
          ? `${team.averageShotSpeedKmh.toFixed(1)} km/h`
          : "—",
    },
    {
      id: "goals",
      labelKey: "stat.goals",
      value: String(team.goals),
    },
  ];
}

/**
 * Build the structured narrative recap of a finished match.
 *
 * The recap is data, not prose: every sentence is a catalog key plus its
 * variables, so it can be rendered in any supported language without losing
 * its grounding in the event log.
 */
export function buildNarrativeRecap(
  match: Match,
  events: readonly MatchEvent[],
  stats: MatchStats,
  teamNames: Record<string, string> = TEAM_NAMES,
): NarrativeRecap {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;
  const homeTeam = teamName(homeTeamId, teamNames);
  const awayTeam = teamName(awayTeamId, teamNames);
  const home = match.score.home;
  const away = match.score.away;
  const outcome = outcomeOf(home, away);

  const headlineVars: TranslationVars = {
    homeTeam,
    awayTeam,
    homeScore: home,
    awayScore: away,
  };

  const sentences: Array<{ key: string; vars: TranslationVars }> = [
    {
      key:
        outcome === "home_win"
          ? "recap.sentence.homeWin"
          : outcome === "away_win"
            ? "recap.sentence.awayWin"
            : "recap.sentence.draw",
      vars: headlineVars,
    },
  ];

  const homePossession = stats.possessionByTeam[homeTeamId] ?? 0;
  const awayPossession = stats.possessionByTeam[awayTeamId] ?? 0;
  const possessionLeaderId =
    homePossession >= awayPossession ? homeTeamId : awayTeamId;
  const possessionLeader = stats.possessionByTeam[possessionLeaderId] ?? 0;
  if (possessionLeader > 0) {
    sentences.push({
      key: "recap.sentence.possession",
      vars: {
        team: teamName(possessionLeaderId, teamNames),
        percent: possessionLeader.toFixed(1),
      },
    });
  }

  const homeStats = stats.teams[homeTeamId];
  const awayStats = stats.teams[awayTeamId];
  const shotLeaderId =
    (homeStats?.shots ?? 0) >= (awayStats?.shots ?? 0) ? homeTeamId : awayTeamId;
  const shotLeader = stats.teams[shotLeaderId];
  if (shotLeader && shotLeader.shots > 0) {
    sentences.push({
      key: "recap.sentence.shots",
      vars: {
        team: teamName(shotLeaderId, teamNames),
        shots: shotLeader.shots,
        onTarget: shotLeader.shotsOnTarget,
      },
    });
  }

  const passLeaderId =
    (homeStats?.passesAttempted ?? 0) >= (awayStats?.passesAttempted ?? 0)
      ? homeTeamId
      : awayTeamId;
  const passLeader = stats.teams[passLeaderId];
  if (passLeader && passLeader.passesAttempted > 0) {
    sentences.push({
      key: "recap.sentence.passVolume",
      vars: {
        team: teamName(passLeaderId, teamNames),
        completed: passLeader.passesCompleted,
        attempted: passLeader.passesAttempted,
        distance: passLeader.averagePassDistanceM.toFixed(1),
      },
    });
  }

  const hardestPass = stats.passMetrics.reduce<number | null>(
    (max, metric) => (max === null || metric.difficulty > max ? metric.difficulty : max),
    null,
  );
  if (hardestPass !== null) {
    sentences.push({
      key: "recap.sentence.passDifficulty",
      vars: { difficulty: hardestPass.toFixed(2) },
    });
  }

  const fastestShot = stats.shotMetrics.reduce<number | null>(
    (max, metric) =>
      max === null || metric.estimatedSpeedKmh > max
        ? metric.estimatedSpeedKmh
        : max,
    null,
  );
  if (fastestShot !== null) {
    sentences.push({
      key: "recap.sentence.shotSpeed",
      vars: { speed: fastestShot.toFixed(1) },
    });
  }

  const disallowed = events.find(
    (event) => event.type === "goal_disallowed" && event.status !== "void",
  );
  if (disallowed) {
    sentences.push({
      key: "recap.sentence.correction",
      vars: { reason: String(disallowed.payload["reason"] ?? "correction") },
    });
  }

  const moments = collectMoments(events, stats, teamNames);
  const evidenceEventIds = moments.map((moment) => moment.eventId);

  return {
    matchId: match.id,
    generatedAtMs: match.clockMs,
    result: { home, away, outcome },
    headlineKey: "recap.headline",
    headlineVars,
    sentences,
    moments,
    statistics: {
      home: statRows(homeTeamId, stats, teamNames),
      away: statRows(awayTeamId, stats, teamNames),
    },
    evidenceEventIds,
  };
}

function collectMoments(
  events: readonly MatchEvent[],
  stats: MatchStats,
  teamNames: Record<string, string>,
): RecapMoment[] {
  const shotById = new Map(stats.shotMetrics.map((metric) => [metric.eventId, metric]));
  const candidates: Array<{ moment: RecapMoment; weight: number }> = [];

  for (const event of events) {
    if (event.status === "void") continue;
    const clock = formatClock(event.clockMs);
    const name = teamName(event.teamId, teamNames);

    if (event.type === "goal" && event.status === "valid") {
      candidates.push({
        weight: 100,
        moment: {
          eventId: event.id,
          period: event.period,
          clockMs: event.clockMs,
          kind: "goal",
          titleKey: "recap.moment.goal",
          titleVars: { team: name },
          detailKey: "recap.moment.goalDetail",
          detailVars: { period: event.period, clock },
        },
      });
    } else if (event.type === "goal_disallowed") {
      candidates.push({
        weight: 95,
        moment: {
          eventId: event.id,
          period: event.period,
          clockMs: event.clockMs,
          kind: "goal_disallowed",
          titleKey: "recap.moment.disallowed",
          titleVars: { reason: String(event.payload["reason"] ?? "correction") },
          detailKey: "recap.moment.disallowedDetail",
          detailVars: { period: event.period, clock },
        },
      });
    } else if (event.type === "shot" && event.payload["onTarget"] === true) {
      const shot = shotById.get(event.id);
      candidates.push({
        weight: 60,
        moment: {
          eventId: event.id,
          period: event.period,
          clockMs: event.clockMs,
          kind: "shot_on_target",
          titleKey: "recap.moment.shot",
          titleVars: { team: name },
          detailKey: "recap.moment.shotDetail",
          detailVars: {
            speed: shot ? shot.estimatedSpeedKmh.toFixed(1) : "—",
            distance: shot ? shot.distanceToGoalM.toFixed(1) : "—",
          },
        },
      });
    } else if (
      event.type === "ball_recovery" &&
      event.payload["zone"] === "advanced"
    ) {
      candidates.push({
        weight: 40,
        moment: {
          eventId: event.id,
          period: event.period,
          clockMs: event.clockMs,
          kind: "advanced_recovery",
          titleKey: "recap.moment.recovery",
          titleVars: { team: name },
          detailKey: "recap.moment.recoveryDetail",
          detailVars: { period: event.period, clock },
        },
      });
    }
  }

  return candidates
    .sort((a, b) => b.weight - a.weight || a.moment.clockMs - b.moment.clockMs)
    .slice(0, MAX_MOMENTS)
    .sort(
      (a, b) =>
        a.moment.period - b.moment.period || a.moment.clockMs - b.moment.clockMs,
    )
    .map((candidate) => candidate.moment);
}

/** Render the structured recap in a given language. */
export function localizeRecap(locale: Locale, recap: NarrativeRecap): LocalizedRecap {
  const periodLabel = (period: 1 | 2): string =>
    t(locale, period === 1 ? "recap.period.first" : "recap.period.second");

  return {
    headline: t(locale, recap.headlineKey, recap.headlineVars),
    sentences: recap.sentences.map((sentence) =>
      t(locale, sentence.key, sentence.vars),
    ),
    moments: recap.moments.map((moment) => ({
      eventId: moment.eventId,
      period: moment.period,
      clockMs: moment.clockMs,
      kind: moment.kind,
      title: t(locale, moment.titleKey, moment.titleVars),
      detail: t(locale, moment.detailKey, {
        ...moment.detailVars,
        period: periodLabel(moment.period),
      }),
    })),
    statistics: recap.statistics,
  };
}
