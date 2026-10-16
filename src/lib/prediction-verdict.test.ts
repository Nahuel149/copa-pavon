import { describe, expect, it } from "vitest";
import { predictionVerdict } from "./prediction-verdict";
const fixture = { id: "semi-ida", order: 1, stage: "SF" as const, home: "Boca", away: "Vasco" };
const result = { fixtureId: fixture.id, homeGoals: 2, awayGoals: 0, scorerNames: ["Valencia"] };
describe("prediction row colors", () => {
  it("stays neutral until there is an official result", () => {
    expect(predictionVerdict(fixture, undefined, undefined)).toBe("pending");
  });
  it("prioritizes exact scores regardless of scorer or qualifier", () => {
    expect(predictionVerdict(fixture, { fixtureId: fixture.id, homeGoals: 2, awayGoals: 0, goalScorer: "Wrong" }, result)).toBe("exact");
  });
  it("marks correct wins and draws without the exact score yellow", () => {
    expect(predictionVerdict(fixture, { fixtureId: fixture.id, homeGoals: 1, awayGoals: 0 }, result)).toBe("result");
    expect(predictionVerdict(fixture, { fixtureId: fixture.id, homeGoals: 1, awayGoals: 1 }, { ...result, homeGoals: 0, awayGoals: 0 })).toBe("result");
  });
  it("marks a correct qualifier yellow even if the match outcome was wrong", () => {
    expect(predictionVerdict({ ...fixture, id: "semi-vuelta" }, { fixtureId: "semi-vuelta", homeGoals: 0, awayGoals: 1, qualifiedTeam: "home" }, { ...result, fixtureId: "semi-vuelta", qualifiedTeam: "home" })).toBe("result");
  });
  it("never uses a first-leg qualifier or scorer to award a color", () => {
    expect(predictionVerdict(fixture, { fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, goalScorer: "Valencia", qualifiedTeam: "home" }, { ...result, qualifiedTeam: "home" })).toBe("miss");
    expect(predictionVerdict(fixture, undefined, result)).toBe("miss");
  });
});
