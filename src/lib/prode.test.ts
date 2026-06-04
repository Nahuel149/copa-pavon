import { describe, expect, it } from "vitest";
import { groups, matches, type KnockoutFixture } from "./matches";
import {
  buildStandings,
  countCompleteKnockoutPredictions,
  getOutcome,
  normalizeName,
  scoreSubmission,
  validateKnockoutSubmission,
  validateSubmission,
  type ResultStore,
} from "./prode";

const emptyResults: ResultStore = {
  matchResults: [],
  groupResults: [],
  knockoutFixtures: [],
  knockoutResults: [],
};

function validPayload(name = "Nahuel") {
  return {
    name,
    predictions: matches.map((match) =>
      match.exactScore
        ? { matchId: match.id, type: "score", homeGoals: "2", awayGoals: "1" }
        : { matchId: match.id, type: "choice", choice: "home" },
    ),
    groupPredictions: groups.map((group) => ({
      groupId: group.id,
      first: group.teams[0],
      second: group.teams[1],
    })),
  };
}

function submissionFromPayload(name = "Nahuel") {
  const result = validateSubmission(validPayload(name));
  if (!result.ok) throw new Error(result.errors.join(", "));
  return {
    id: `s-${name}`,
    name,
    normalizedName: normalizeName(name),
    createdAt: new Date().toISOString(),
    predictions: result.predictions,
    groupPredictions: result.groupPredictions,
    knockoutPredictions: [],
  };
}

describe("prode validation", () => {
  it("normalizes names for immutable duplicate checks", () => {
    expect(normalizeName("  José   Pérez ")).toBe("jose perez");
  });

  it("keeps ten exact-score matches per group-stage fecha", () => {
    expect([1, 2, 3].map((round) => matches.filter((match) => match.round === round && match.exactScore).length)).toEqual([
      10,
      10,
      10,
    ]);
    expect(matches.filter((match) => !match.exactScore)).toHaveLength(42);
  });

  it("accepts a hybrid first-phase payload with all groups", () => {
    const result = validateSubmission(validPayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.predictions).toHaveLength(72);
      expect(result.predictions.filter((prediction) => prediction.type === "score")).toHaveLength(30);
      expect(result.predictions.filter((prediction) => prediction.type === "choice")).toHaveLength(42);
      expect(result.groupPredictions).toHaveLength(12);
    }
  });

  it("requires exact scores only for important marked matches", () => {
    const payload = validPayload();
    payload.predictions[3] = { matchId: "m-04", type: "score", homeGoals: "", awayGoals: "1" };
    const result = validateSubmission(payload);
    expect(result.ok).toBe(false);
  });

  it("requires 1X2 choice for non-exact matches", () => {
    const payload = validPayload();
    payload.predictions[0] = { matchId: "m-01", type: "choice", choice: "" };
    const result = validateSubmission(payload);
    expect(result.ok).toBe(false);
  });

  it("requires two distinct teams per group", () => {
    const payload = validPayload();
    payload.groupPredictions[0] = {
      groupId: "A",
      first: groups[0].teams[0],
      second: groups[0].teams[0],
    };
    const result = validateSubmission(payload);
    expect(result.ok).toBe(false);
  });

  it("infers the outcome from exact scores", () => {
    expect(getOutcome(3, 1)).toBe("home");
    expect(getOutcome(1, 1)).toBe("draw");
    expect(getOutcome(0, 2)).toBe("away");
  });
});

describe("prode scoring", () => {
  it("scores group-stage exact result with 2 points and choice winner with 1 point", () => {
    const row = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      matchResults: [
        { matchId: "m-04", homeGoals: 2, awayGoals: 1, outcome: "home" },
        { matchId: "m-01", homeGoals: 3, awayGoals: 0, outcome: "home" },
      ],
    });

    expect(row.matchPoints).toBe(3);
    expect(row.exactHits).toBe(1);
    expect(row.winnerHits).toBe(1);
  });

  it("scores group top 2 without caring about order", () => {
    const result = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      groupResults: [
        { groupId: "A", first: groups[0].teams[1], second: groups[0].teams[0] },
        { groupId: "B", first: groups[1].teams[0], second: groups[1].teams[2] },
      ],
    });

    expect(result.groupPoints).toBe(5);
    expect(result.groupHits).toBe(1);
  });

  it("scores knockout only by exact result", () => {
    const fixture: KnockoutFixture = { id: "k-1", order: 1, stage: "R16", home: "Argentina", away: "Francia" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-1", homeGoals: 2, awayGoals: 1 }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-1", homeGoals: 3, awayGoals: 1 }],
    });

    expect(row.knockoutPoints).toBe(0);
    expect(row.knockoutExactHits).toBe(0);
  });

  it("accumulates standings automatically from official results", () => {
    const submission = submissionFromPayload("Nahuel");
    const emptyRow = buildStandings([submission], emptyResults)[0];
    const updatedRow = buildStandings([submission], {
      ...emptyResults,
      matchResults: [
        { matchId: "m-04", homeGoals: 2, awayGoals: 1, outcome: "home" },
        { matchId: "m-01", homeGoals: 1, awayGoals: 0, outcome: "home" },
      ],
      groupResults: [{ groupId: "A", first: groups[0].teams[1], second: groups[0].teams[0] }],
    })[0];

    expect(emptyRow.totalPoints).toBe(0);
    expect(updatedRow.totalPoints).toBe(8);
    expect(updatedRow.matchPoints).toBe(3);
    expect(updatedRow.groupPoints).toBe(5);
  });

  it("does not count missing knockout draft entries as complete", () => {
    const fixtures: KnockoutFixture[] = [{ id: "k-1", order: 1, stage: "R16", home: "Argentina", away: "Francia" }];
    expect(countCompleteKnockoutPredictions({}, fixtures)).toBe(0);
  });

  it("validates knockout submissions against configured fixtures", () => {
    const fixtures: KnockoutFixture[] = [{ id: "k-1", order: 1, stage: "R16", home: "Argentina", away: "Francia" }];
    const result = validateKnockoutSubmission(
      {
        name: "Nahuel",
        predictions: [{ fixtureId: "k-1", homeGoals: "2", awayGoals: "1" }],
      },
      fixtures,
    );

    expect(result.ok).toBe(true);
  });

  it("sorts standings by total points and then exact hits", () => {
    const first = submissionFromPayload("Nahuel");
    const second = submissionFromPayload("Ana");
    const rows = buildStandings(
      [first, second],
      {
        ...emptyResults,
        matchResults: [{ matchId: "m-04", homeGoals: 2, awayGoals: 1, outcome: "home" }],
      },
    );

    expect(rows[0].name).toBe("Ana");
  });
});
