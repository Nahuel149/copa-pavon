import type { KnockoutFixture } from "./matches";
import { requiresQualifier } from "./knockout-format";
import type { KnockoutPrediction, KnockoutResult } from "./prode";

export type PredictionVerdict = "pending" | "exact" | "result" | "miss";

export function predictionVerdict(fixture: KnockoutFixture, prediction?: KnockoutPrediction, result?: KnockoutResult): PredictionVerdict {
  if (!result) return "pending";
  if (!prediction) return "miss";
  if (prediction.homeGoals === result.homeGoals && prediction.awayGoals === result.awayGoals) return "exact";
  const correctOutcome = Math.sign(prediction.homeGoals - prediction.awayGoals) === Math.sign(result.homeGoals - result.awayGoals);
  const correctQualifier = requiresQualifier(fixture) && !!result.qualifiedTeam && prediction.qualifiedTeam === result.qualifiedTeam;
  return correctOutcome || correctQualifier ? "result" : "miss";
}

export const predictionVerdictLabels: Record<PredictionVerdict, string> = {
  pending: "Sin resultado oficial",
  exact: "Marcador exacto",
  result: "Resultado o clasificado acertado, sin exacto",
  miss: "Sin acierto de marcador, resultado ni clasificado",
};
