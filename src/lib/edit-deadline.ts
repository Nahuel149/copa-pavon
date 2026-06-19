import { matches, type Match, type MatchRound } from "./matches";

export const groupMatchEditCloseMinutes = 30;

export const roundEditDeadlines: Record<MatchRound, string> = {
  1: "2026-06-11T19:00:00.000Z",
  2: "2026-06-18T16:00:00.000Z",
  3: "2026-06-24T19:00:00.000Z",
};

export function getEditDeadline() {
  const rawDeadline = process.env.PRODE_EDIT_DEADLINE;
  if (!rawDeadline) return null;
  const deadline = new Date(rawDeadline);
  return Number.isNaN(deadline.getTime()) ? null : deadline;
}

function isValidDate(value: string | undefined): value is string {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function getMatchEditDeadline(match: Match) {
  const kickoffAt = match.kickoffAt;
  if (isValidDate(kickoffAt)) {
    return new Date(new Date(kickoffAt).getTime() - groupMatchEditCloseMinutes * 60_000).toISOString();
  }
  return new Date(roundEditDeadlines[match.round]).toISOString();
}

export function getMatchEditStatus(match: Match, now = new Date(), globalOpen = true) {
  const kickoffAt = match.kickoffAt;
  const deadline = getMatchEditDeadline(match);
  return {
    deadline,
    kickoffAt: isValidDate(kickoffAt) ? kickoffAt : null,
    open: globalOpen && now.getTime() <= new Date(deadline).getTime(),
    mode: isValidDate(kickoffAt) ? ("match" as const) : ("round" as const),
  };
}

export function getEditWindow(now = new Date()) {
  const deadline = getEditDeadline();
  const globalOpen = !deadline || now <= deadline;
  const rounds = Object.fromEntries(
    Object.entries(roundEditDeadlines).map(([round, roundDeadline]) => {
      const date = new Date(roundDeadline);
      return [
        round,
        {
          deadline: date.toISOString(),
          open: globalOpen && now <= date,
        },
      ];
    }),
  ) as Record<MatchRound, { deadline: string; open: boolean }>;
  const matchStatuses = Object.fromEntries(matches.map((match) => [match.id, getMatchEditStatus(match, now, globalOpen)]));

  return {
    deadline: deadline?.toISOString() ?? null,
    open: globalOpen && Object.values(matchStatuses).some((match) => match.open),
    rounds,
    matches: matchStatuses,
  };
}
