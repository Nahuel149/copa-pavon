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
      const editClosed = editWindow.matches[match.id]?.open === false || editWindow.rounds[match.round]?.open === false;
      const hasOfficialResult = resultedMatchIds.has(match.id);
      return editClosed || hasOfficialResult;
    })
    .map((match) => match.id);
}
