import { describe, expect, it } from "vitest";
import { buildPredictionShareSvg } from "./prediction-share";
const fixture = { id: "test-ida", order: 1, stage: "SF" as const, home: "Estudiantes", away: "Flamengo" };
const participants = [{ name: "Ana <test>", knockoutPredictions: [{ fixtureId: "test-ida", homeGoals: 2, awayGoals: 1, qualifiedTeam: "home" as const, goalScorer: "Carrillo & otro" }] }];
describe("prediction share images", () => {
  it("includes the public score, qualifier and scorer and safely escapes text", () => {
    const svg = buildPredictionShareSvg(fixture, participants, true);
    expect(svg).toContain("2 - 1");
    expect(svg).toContain("Carrillo &amp; otro");
    expect(svg).toContain("Ana &lt;test&gt;");
    expect(svg).not.toContain("Ana <test>");
  });
  it("does not reveal private predictions even if they are supplied", () => {
    const svg = buildPredictionShareSvg(fixture, participants, false);
    expect(svg).toContain("Privado");
    expect(svg).not.toContain("2 - 1");
    expect(svg).not.toContain("Carrillo");
  });
});
