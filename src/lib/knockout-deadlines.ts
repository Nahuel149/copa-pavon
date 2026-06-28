import { type KnockoutFixture, type KnockoutStage } from "./matches";

export const knockoutEditCloseMinutes = 10;

const fallbackStageKickoffs: Record<KnockoutStage, string> = {
  R32: "2026-06-28T19:00:00.000Z",
  R16: "2026-07-04T17:00:00.000Z",
  QF: "2026-07-09T20:00:00.000Z",
  SF: "2026-07-14T19:00:00.000Z",
  THIRD: "2026-07-18T21:00:00.000Z",
  FINAL: "2026-07-19T19:00:00.000Z",
};

const defaultRoundOf32Kickoffs = [
  "2026-06-28T19:00:00.000Z",
  "2026-06-29T17:00:00.000Z",
  "2026-06-29T20:30:00.000Z",
  "2026-06-30T01:00:00.000Z",
  "2026-06-30T17:00:00.000Z",
  "2026-06-30T21:00:00.000Z",
  "2026-07-01T01:00:00.000Z",
  "2026-07-01T16:00:00.000Z",
  "2026-07-01T20:00:00.000Z",
  "2026-07-02T00:00:00.000Z",
  "2026-07-02T19:00:00.000Z",
  "2026-07-02T23:00:00.000Z",
  "2026-07-03T03:00:00.000Z",
  "2026-07-03T18:00:00.000Z",
  "2026-07-03T22:00:00.000Z",
  "2026-07-04T01:30:00.000Z",
];

export function getKnockoutKickoffAt(fixture: KnockoutFixture) {
  if (fixture.kickoffAt && !Number.isNaN(new Date(fixture.kickoffAt).getTime())) return fixture.kickoffAt;
  if (fixture.stage === "R32") return defaultRoundOf32Kickoffs[fixture.order - 1] ?? fallbackStageKickoffs.R32;
  return fallbackStageKickoffs[fixture.stage];
}

export function compareKnockoutFixturesByKickoff(a: KnockoutFixture, b: KnockoutFixture) {
  const byKickoff = new Date(getKnockoutKickoffAt(a)).getTime() - new Date(getKnockoutKickoffAt(b)).getTime();
  return byKickoff || a.order - b.order || a.id.localeCompare(b.id);
}

export function getKnockoutStageEditDeadline(stage: KnockoutStage, fixtures: KnockoutFixture[] = []) {
  const stageFixtures = fixtures.filter((fixture) => fixture.stage === stage);
  const firstKickoff =
    stageFixtures
      .map((fixture) => new Date(getKnockoutKickoffAt(fixture)).getTime())
      .filter((time) => !Number.isNaN(time))
      .sort((a, b) => a - b)[0] ?? new Date(fallbackStageKickoffs[stage]).getTime();
  return new Date(firstKickoff - knockoutEditCloseMinutes * 60_000).toISOString();
}

export function getKnockoutEditDeadline(fixture: KnockoutFixture, fixtures: KnockoutFixture[] = []) {
  const kickoff = new Date(getKnockoutKickoffAt(fixture)).getTime();
  const fallback = new Date(getKnockoutStageEditDeadline(fixture.stage, fixtures.length > 0 ? fixtures : [fixture])).getTime();
  const baseTime = Number.isNaN(kickoff) ? fallback : kickoff;
  return new Date(baseTime - knockoutEditCloseMinutes * 60_000).toISOString();
}

export function isKnockoutFixtureEditable(fixture: KnockoutFixture, now = new Date(), fixtures: KnockoutFixture[] = []) {
  return now.getTime() < new Date(getKnockoutEditDeadline(fixture, fixtures)).getTime();
}

export function knockoutFixtureStatus(fixture: KnockoutFixture, now = new Date(), fixtures: KnockoutFixture[] = []) {
  return {
    kickoffAt: getKnockoutKickoffAt(fixture),
    editDeadline: getKnockoutEditDeadline(fixture, fixtures),
    open: isKnockoutFixtureEditable(fixture, now, fixtures),
  };
}
