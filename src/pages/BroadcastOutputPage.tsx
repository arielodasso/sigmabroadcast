import { useSearchParams } from "react-router-dom";
import type { AudienceMode, Personalization } from "../contracts";
import { OverlayLayer } from "../broadcast-ui/OverlayLayer";
import { Scorebug } from "../broadcast-ui/Scorebug";
import type { Locale } from "../i18n";
import { AWAY_TEAM, HOME_TEAM, createRoster } from "../simulation/roster";
import type { BroadcastSnapshot } from "../state/broadcast-controller";

const ROSTER = createRoster();

export interface BroadcastOutputPageProps {
  snapshot: BroadcastSnapshot;
  locale: Locale;
  audience: AudienceMode;
}

/**
 * Bare broadcast graphics over a transparent canvas.
 *
 * The page renders the scorebug and the active overlays only — no editorial
 * chrome, no background — so it can be used as an OBS (or any broadcast
 * compositor) browser source layered on top of a camera feed or a rendered
 * match feed.
 *
 * Two query parameters make the source configurable without touching it:
 *
 * - `?audience=fan|analyst` selects which audience text the overlays use.
 * - `?locale=en|es` selects the language of the graphics.
 * - `?team=<teamId>&player=<playerId>` follows a club or player.
 */
export function BroadcastOutputPage({
  snapshot,
  locale,
  audience,
}: BroadcastOutputPageProps) {
  const [params] = useSearchParams();

  const requestedLocale = params.get("locale");
  const outputLocale: Locale =
    requestedLocale === "es" || requestedLocale === "en" ? requestedLocale : locale;

  const requestedAudience = params.get("audience");
  const outputAudience: AudienceMode =
    requestedAudience === "analyst" || requestedAudience === "fan"
      ? requestedAudience
      : audience;

  const requestedTeam = params.get("team") ?? snapshot.personalization.followedTeamId;
  const requestedPlayer =
    params.get("player") ?? snapshot.personalization.followedPlayerId;
  const followedTeamId = [HOME_TEAM.id, AWAY_TEAM.id].includes(requestedTeam ?? "")
    ? requestedTeam ?? undefined
    : undefined;
  const followedPlayerId = ROSTER.players.some(
    (player) => player.id === requestedPlayer,
  )
    ? requestedPlayer ?? undefined
    : undefined;
  const outputPersonalization: Personalization = {
    ...(followedTeamId ? { followedTeamId } : {}),
    ...(followedPlayerId ? { followedPlayerId } : {}),
  };

  return (
    <div className="output" data-output="transparent">
      <Scorebug
        match={snapshot.frame.match}
        homeTeam={HOME_TEAM}
        awayTeam={AWAY_TEAM}
        locale={outputLocale}
      />
      <OverlayLayer
        overlays={snapshot.activeOverlays}
        insights={snapshot.insights}
        events={snapshot.events}
        audience={outputAudience}
        locale={outputLocale}
        personalization={outputPersonalization}
      />
    </div>
  );
}
