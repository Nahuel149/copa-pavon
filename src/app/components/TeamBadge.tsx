import { getTeamFlagUrl } from "@/lib/team-flags";
import { getClubBadgeUrl } from "@/lib/club-badges";

type TeamBadgeProps = {
  team: string;
  compact?: boolean;
};

export function TeamBadge({ team, compact = false }: TeamBadgeProps) {
  const clubBadgeUrl = getClubBadgeUrl(team);
  const imageUrl = clubBadgeUrl ?? getTeamFlagUrl(team);

  return (
    <span className={compact ? "teamBadge compact" : "teamBadge"}>
      {imageUrl ? <img className={clubBadgeUrl ? "clubCrest" : undefined} alt="" aria-hidden="true" loading="lazy" src={imageUrl} /> : null}
      <span>{team}</span>
    </span>
  );
}
