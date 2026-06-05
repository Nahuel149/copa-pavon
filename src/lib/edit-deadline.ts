import { type MatchRound } from "./matches";

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

export function getEditWindow() {
  const deadline = getEditDeadline();
  const now = new Date();
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

  return {
    deadline: deadline?.toISOString() ?? null,
    open: globalOpen && Object.values(rounds).some((round) => round.open),
    rounds,
  };
}
