import { knockoutStageLabels, type KnockoutFixture, type KnockoutStage } from "./matches";
import { type KnockoutPrediction, type Submission } from "./prode";

export const knockoutPublicUnlocks: Record<KnockoutStage, string> = {
  R32: "2026-06-28T19:00:00.000Z",
  R16: "2026-07-04T17:00:00.000Z",
  QF: "2026-07-09T20:00:00.000Z",
  SF: "2026-07-14T19:00:00.000Z",
  THIRD: "2026-07-18T21:00:00.000Z",
  FINAL: "2026-07-19T19:00:00.000Z",
};

export function isKnockoutStagePublic(stage: KnockoutStage, now = new Date()) {
  return now.getTime() >= new Date(knockoutPublicUnlocks[stage]).getTime();
}

export function getKnockoutVisibility(now = new Date()) {
  return Object.fromEntries(
    Object.entries(knockoutPublicUnlocks).map(([stage, unlockAt]) => [
      stage,
      {
        label: knockoutStageLabels[stage as KnockoutStage],
        public: isKnockoutStagePublic(stage as KnockoutStage, now),
        unlockAt,
      },
    ]),
  ) as Record<KnockoutStage, { label: string; public: boolean; unlockAt: string }>;
}

export function filterPublicKnockoutPredictions(
  predictions: KnockoutPrediction[],
  fixtures: KnockoutFixture[],
  now = new Date(),
) {
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  return predictions.filter((prediction) => {
    const fixture = fixtureById.get(prediction.fixtureId);
    return fixture ? isKnockoutStagePublic(fixture.stage, now) : false;
  });
}

export function hideLockedKnockoutPredictions<T extends Omit<Submission, "pinHash">>(
  submission: T,
  fixtures: KnockoutFixture[],
  now = new Date(),
): T {
  return {
    ...submission,
    knockoutPredictions: filterPublicKnockoutPredictions(submission.knockoutPredictions ?? [], fixtures, now),
  };
}
