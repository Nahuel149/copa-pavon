import type { KnockoutFixture } from "./matches";

function normalizeTeamName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isOptionalLateKnockoutFixture(fixture: KnockoutFixture) {
  const teams = [normalizeTeamName(fixture.home), normalizeTeamName(fixture.away)].sort();
  return fixture.stage === "R32" && teams[0] === "canada" && teams[1] === "sudafrica";
}
