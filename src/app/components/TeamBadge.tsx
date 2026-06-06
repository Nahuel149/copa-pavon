import { getTeamFlagUrl } from "@/lib/team-flags";

type TeamBadgeProps = {
  team: string;
  compact?: boolean;
};

export function TeamBadge({ team, compact = false }: TeamBadgeProps) {
  const flagUrl = getTeamFlagUrl(team);

  return (
    <span className={compact ? "teamBadge compact" : "teamBadge"}>
      {flagUrl ? <img alt="" aria-hidden="true" loading="lazy" src={flagUrl} /> : null}
      <span>{team}</span>
    </span>
  );
}
