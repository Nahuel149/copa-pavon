import { knockoutStageLabels, type KnockoutFixture, type KnockoutStage } from "./matches";
import { getKnockoutKickoffAt } from "./knockout-deadlines";
import { type KnockoutPrediction, type Submission } from "./prode";

export const knockoutPublicUnlocks: Record<KnockoutStage, string> = {
  R32: "2026-06-28T19:00:00.000Z",
  R16: "2026-07-04T17:00:00.000Z",
  QF: "2026-07-09T20:00:00.000Z",
  SF: "2026-07-14T19:00:00.000Z",
  THIRD: "2026-07-18T21:00:00.000Z",
  FINAL: "2026-07-19T19:00:00.000Z",
};

function getStagePublicUnlock(stage: KnockoutStage, fixtures: KnockoutFixture[] = []) {
  const firstKickoff =
    fixtures
      .filter((fixture) => fixture.stage === stage)
      .map((fixture) => new Date(getKnockoutKickoffAt(fixture)).getTime())
      .filter((time) => !Number.isNaN(time))
      .sort((a, b) => a - b)[0] ?? new Date(knockoutPublicUnlocks[stage]).getTime();
  return new Date(firstKickoff).toISOString();
}

export function isKnockoutStagePublic(stage: KnockoutStage, now = new Date(), fixtures: KnockoutFixture[] = []) {
  return now.getTime() >= new Date(getStagePublicUnlock(stage, fixtures)).getTime();
}

export function getKnockoutVisibility(now = new Date(), fixtures: KnockoutFixture[] = []) {
  return Object.fromEntries(
    Object.keys(knockoutPublicUnlocks).map((stage) => {
      const knockoutStage = stage as KnockoutStage;
      const unlockAt = getStagePublicUnlock(knockoutStage, fixtures);
      return [
        stage,
        {
          label: knockoutStageLabels[knockoutStage],
          public: isKnockoutStagePublic(knockoutStage, now, fixtures),
          unlockAt,
        },
      ];
    }),
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
    return fixture ? isKnockoutStagePublic(fixture.stage, now, fixtures) : false;
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
