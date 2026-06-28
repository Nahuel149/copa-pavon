import { knockoutStageLabels, type KnockoutFixture, type KnockoutStage } from "./matches";
import { getKnockoutEditDeadline } from "./knockout-deadlines";
import { type KnockoutPrediction, type Submission } from "./prode";

export const knockoutPublicUnlocks: Record<KnockoutStage, string> = {
  R32: "2026-06-28T19:00:00.000Z",
  R16: "2026-07-04T17:00:00.000Z",
  QF: "2026-07-09T20:00:00.000Z",
  SF: "2026-07-14T19:00:00.000Z",
  THIRD: "2026-07-18T21:00:00.000Z",
  FINAL: "2026-07-19T19:00:00.000Z",
};

export function getKnockoutFixturePublicUnlock(fixture: KnockoutFixture, fixtures: KnockoutFixture[] = []) {
  return getKnockoutEditDeadline(fixture, fixtures);
}

export function isKnockoutFixturePublic(fixture: KnockoutFixture, now = new Date(), fixtures: KnockoutFixture[] = []) {
  return now.getTime() >= new Date(getKnockoutFixturePublicUnlock(fixture, fixtures)).getTime();
}

export function getKnockoutVisibility(now = new Date(), fixtures: KnockoutFixture[] = []) {
  if (fixtures.length > 0) {
    return Object.fromEntries(
      fixtures.map((fixture) => {
        const unlockAt = getKnockoutFixturePublicUnlock(fixture, fixtures);
        return [
          fixture.id,
          {
            label: knockoutStageLabels[fixture.stage],
            public: isKnockoutFixturePublic(fixture, now, fixtures),
            unlockAt,
          },
        ];
      }),
    ) as Record<string, { label: string; public: boolean; unlockAt: string }>;
  }

  return Object.fromEntries(
    Object.keys(knockoutPublicUnlocks).map((stage) => {
      const knockoutStage = stage as KnockoutStage;
      const fallbackFixture: KnockoutFixture = { id: stage, order: 1, stage: knockoutStage, home: "Local", away: "Visitante" };
      const unlockAt = getKnockoutFixturePublicUnlock(fallbackFixture);
      return [
        stage,
        {
          label: knockoutStageLabels[knockoutStage],
          public: now.getTime() >= new Date(unlockAt).getTime(),
          unlockAt,
        },
      ];
    }),
  ) as Record<string, { label: string; public: boolean; unlockAt: string }>;
}

export function filterPublicKnockoutPredictions(
  predictions: KnockoutPrediction[],
  fixtures: KnockoutFixture[],
  now = new Date(),
) {
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  return predictions.filter((prediction) => {
    const fixture = fixtureById.get(prediction.fixtureId);
    return fixture ? isKnockoutFixturePublic(fixture, now, fixtures) : false;
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
