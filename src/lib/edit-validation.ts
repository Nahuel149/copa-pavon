import { matches } from "./matches";
import type { getEditWindow } from "./edit-deadline";
import type { ResultStore, Submission } from "./prode";

type EditWindow = ReturnType<typeof getEditWindow>;

export function getLateEditExcludedMatchIds(submission: Submission, results: ResultStore, editWindow: EditWindow) {
  const originalMatchIds = new Set(submission.predictions.map((prediction) => prediction.matchId));
  const resultedMatchIds = new Set(results.matchResults.map((result) => result.matchId));

  return matches
    .filter((match) => {
      if (originalMatchIds.has(match.id)) return false;
      const roundClosed = editWindow.rounds[match.round]?.open === false;
      const hasOfficialResult = resultedMatchIds.has(match.id);
      return roundClosed || hasOfficialResult;
    })
    .map((match) => match.id);
}
