import type { KnockoutFixture } from "./matches";

// Continental fixtures have stable ids ending in their leg: -ida / -vuelta.
export function isFirstLeg(fixture: KnockoutFixture) {
  return fixture.id.endsWith("-ida");
}

export function isSecondLeg(fixture: KnockoutFixture) {
  return fixture.id.endsWith("-vuelta");
}

export function usesSeparatedKnockoutScoring(fixture: KnockoutFixture) {
  return fixture.stage === "SF" || fixture.stage === "FINAL";
}

export function requiresQualifier(fixture: KnockoutFixture) {
  return !isFirstLeg(fixture);
}

export function needsQualifierSelection(fixture: KnockoutFixture, homeGoals: string | number, awayGoals: string | number) {
  if (isFirstLeg(fixture)) return false;
  return isSecondLeg(fixture) || usesSeparatedKnockoutScoring(fixture) || Number(homeGoals) === Number(awayGoals);
}
