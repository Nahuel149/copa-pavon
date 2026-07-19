import { describe, expect, it } from "vitest";
import {
  compareKnockoutFixturesByKickoff,
  getKnockoutEditDeadline,
  isKnockoutFixtureEditable,
  isKnockoutStageSuperseded,
} from "./knockout-deadlines";
import { filterPublicKnockoutPredictions, getKnockoutVisibility } from "./knockout-visibility";
import { getMatchEditDeadline, getMatchEditStatus } from "./edit-deadline";
import { getLateEditExcludedMatchIds } from "./edit-validation";
import { groups, matches, type KnockoutFixture, type Match } from "./matches";
import { getKnockoutRoster, knockoutTeamRosters } from "./knockout-rosters";
import {
  buildStandings,
  countCompletePredictions,
  countCompleteKnockoutPredictions,
  defaultClan,
  getOutcome,
  normalizeName,
  parseScorerEvents,
  parseScorerNames,
  scoreKnockoutPredictionForFixture,
  scoreSubmission,
  validateKnockoutSubmission,
  validateResultStore,
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
    clan: result.clan,
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
      expect(result.clan).toBe(defaultClan);
      expect(result.predictions).toHaveLength(72);
      expect(result.predictions.filter((prediction) => prediction.type === "score")).toHaveLength(30);
      expect(result.predictions.filter((prediction) => prediction.type === "choice")).toHaveLength(42);
      expect(result.groupPredictions).toHaveLength(12);
    }
  });

  it("allows late entries to skip matches that already have official results", () => {
    const payload = validPayload();
    payload.predictions = payload.predictions.filter((prediction) => prediction.matchId !== "m-01");

    const result = validateSubmission(payload, { excludedMatchIds: ["m-01"] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.predictions).toHaveLength(71);
      expect(result.predictions.some((prediction) => prediction.matchId === "m-01")).toBe(false);
    }
  });

  it("treats closed matches missing from late entries as already validated for editing", () => {
    const payload = validPayload("Ale..");
    const lateSubmission = submissionFromPayload("Ale..");
    lateSubmission.predictions = lateSubmission.predictions.filter(
      (prediction) => prediction.matchId !== "m-01" && prediction.matchId !== "m-25" && prediction.matchId !== "m-26",
    );
    payload.predictions = payload.predictions.filter(
      (prediction) => prediction.matchId !== "m-01" && prediction.matchId !== "m-25" && prediction.matchId !== "m-26",
    );
    const editWindow = {
      deadline: null,
      open: true,
      rounds: {
        1: { open: false, deadline: "2026-06-11T19:00:00.000Z" },
        2: { open: true, deadline: "2026-06-18T16:00:00.000Z" },
        3: { open: true, deadline: "2026-06-24T19:00:00.000Z" },
      },
      matches: {},
    };
    const excludedMatchIds = getLateEditExcludedMatchIds(
      lateSubmission,
      { ...emptyResults, matchResults: [{ matchId: "m-25", homeGoals: 1, awayGoals: 0, outcome: "home" }] },
      editWindow,
    );

    expect(excludedMatchIds).toEqual(["m-01", "m-25"]);
    expect(validateSubmission(payload, { excludedMatchIds }).ok).toBe(false);

    payload.predictions.push({ matchId: "m-26", type: "choice", choice: "home" });
    const result = validateSubmission(payload, { excludedMatchIds });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.predictions.some((prediction) => prediction.matchId === "m-01")).toBe(false);
      expect(result.predictions.some((prediction) => prediction.matchId === "m-25")).toBe(false);
      expect(result.predictions.some((prediction) => prediction.matchId === "m-26")).toBe(true);
    }
    expect(countCompletePredictions(Object.fromEntries(payload.predictions.map((prediction) => [prediction.matchId, prediction])), { excludedMatchIds })).toBe(
      matches.length - excludedMatchIds.length,
    );
  });

  it("supports match-level edit deadlines thirty minutes before kickoff", () => {
    const match: Match = { ...matches[0], kickoffAt: "2026-06-11T20:00:00.000Z" };

    expect(getMatchEditDeadline(match)).toBe("2026-06-11T19:30:00.000Z");
    expect(getMatchEditStatus(match, new Date("2026-06-11T19:29:59.000Z")).open).toBe(true);
    expect(getMatchEditStatus(match, new Date("2026-06-11T19:30:00.000Z")).open).toBe(true);
    expect(getMatchEditStatus(match, new Date("2026-06-11T19:30:01.000Z")).open).toBe(false);
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
    expect(row.predictionMatchesPlayed).toBe(2);
    expect(row.predictionWins).toBe(2);
    expect(row.predictionLosses).toBe(0);
    expect(row.pointAudit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "m-04", points: 2, verdict: "exact" }),
        expect.objectContaining({ id: "m-01", points: 1, verdict: "correct" }),
      ]),
    );
  });

  it("does not add winner points on top of an exact group-stage score", () => {
    const row = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      matchResults: [{ matchId: "m-04", homeGoals: 2, awayGoals: 1, outcome: "home" }],
    });

    expect(row.matchPoints).toBe(2);
    expect(row.exactHits).toBe(1);
    expect(row.winnerHits).toBe(0);
  });

  it("scores group top 2 without caring about order", () => {
    const result = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      groupResults: [
        { groupId: "A", first: groups[0].teams[1], second: groups[0].teams[0] },
        { groupId: "B", first: groups[1].teams[0], second: groups[1].teams[2] },
      ],
    });

    expect(result.groupPoints).toBe(3);
    expect(result.groupHits).toBe(1);
  });

  it("gives zero group points when only one qualified team is correct", () => {
    const result = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      groupResults: [{ groupId: "A", first: groups[0].teams[0], second: groups[0].teams[2] }],
    });

    expect(result.groupPoints).toBe(0);
    expect(result.groupHits).toBe(0);
    expect(result.pointAudit[0]).toMatchObject({ category: "group", points: 0, verdict: "miss" });
  });

  it("does not score automatic group top 2 until all group matches are played", () => {
    const result = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      matchResults: [
        { matchId: "m-01", homeGoals: 2, awayGoals: 0, outcome: "home" },
        { matchId: "m-02", homeGoals: 0, awayGoals: 0, outcome: "draw" },
        { matchId: "m-25", homeGoals: 0, awayGoals: 1, outcome: "away" },
        { matchId: "m-28", homeGoals: 1, awayGoals: 0, outcome: "home" },
        { matchId: "m-53", homeGoals: 0, awayGoals: 2, outcome: "away" },
      ],
    });

    expect(result.groupPoints).toBe(0);
    expect(result.decidedGroups).toBe(0);
  });

  it("scores automatic group top 2 when all six group matches are played", () => {
    const result = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      matchResults: [
        { matchId: "m-01", homeGoals: 2, awayGoals: 0, outcome: "home" },
        { matchId: "m-02", homeGoals: 0, awayGoals: 0, outcome: "draw" },
        { matchId: "m-25", homeGoals: 0, awayGoals: 1, outcome: "away" },
        { matchId: "m-28", homeGoals: 1, awayGoals: 0, outcome: "home" },
        { matchId: "m-53", homeGoals: 0, awayGoals: 2, outcome: "away" },
        { matchId: "m-54", homeGoals: 2, awayGoals: 1, outcome: "home" },
      ],
    });

    expect(result.groupPoints).toBe(3);
    expect(result.groupHits).toBe(1);
    expect(result.decidedGroups).toBe(1);
  });

  it("keeps manual group results as the trusted source over automatic tables", () => {
    const result = scoreSubmission(submissionFromPayload(), {
      ...emptyResults,
      matchResults: [
        { matchId: "m-01", homeGoals: 2, awayGoals: 0, outcome: "home" },
        { matchId: "m-02", homeGoals: 0, awayGoals: 0, outcome: "draw" },
        { matchId: "m-25", homeGoals: 0, awayGoals: 1, outcome: "away" },
        { matchId: "m-28", homeGoals: 1, awayGoals: 0, outcome: "home" },
        { matchId: "m-53", homeGoals: 0, awayGoals: 2, outcome: "away" },
        { matchId: "m-54", homeGoals: 2, awayGoals: 1, outcome: "home" },
      ],
      groupResults: [{ groupId: "A", first: groups[0].teams[2], second: groups[0].teams[3] }],
    });

    expect(result.groupPoints).toBe(0);
    expect(result.groupHits).toBe(0);
    expect(result.decidedGroups).toBe(1);
  });

  it("scores knockout winner without exact result by stage", () => {
    const fixture: KnockoutFixture = { id: "k-1", order: 1, stage: "QF", home: "Argentina", away: "Francia" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-1", homeGoals: 2, awayGoals: 1 }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-1", homeGoals: 3, awayGoals: 1 }],
    });

    expect(row.knockoutPoints).toBe(3);
    expect(row.knockoutExactHits).toBe(0);
    expect(row.knockoutWinnerHits).toBe(1);
    expect(row.predictionMatchesPlayed).toBe(1);
    expect(row.predictionWins).toBe(1);
  });

  it("scores final exact result with final exact points", () => {
    const fixture: KnockoutFixture = { id: "k-final", order: 1, stage: "FINAL", home: "Argentina", away: "Francia" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-final", homeGoals: 2, awayGoals: 1 }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-final", homeGoals: 2, awayGoals: 1 }],
    });

    expect(row.knockoutPoints).toBe(27);
    expect(row.knockoutExactHits).toBe(1);
    expect(row.knockoutWinnerHits).toBe(0);
    expect(row.predictionMatchesPlayed).toBe(1);
    expect(row.predictionWins).toBe(1);
  });

  it("counts knockout losses and scorer hits separately in standings", () => {
    const fixture: KnockoutFixture = { id: "k-split", order: 1, stage: "R32", home: "Argentina", away: "Francia" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, goalScorer: "Messi" }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: fixture.id, homeGoals: 2, awayGoals: 0, scorerNames: ["L. Messi"] }],
    });

    expect(row.predictionMatchesPlayed).toBe(1);
    expect(row.predictionWins).toBe(0);
    expect(row.predictionLosses).toBe(1);
    expect(row.knockoutScorerHits).toBe(1);
    expect(row.knockoutPoints).toBe(1);
  });

  it("scores only two points for exact knockout draw with wrong penalty qualifier", () => {
    const fixture: KnockoutFixture = { id: "k-pens", order: 1, stage: "R32", home: "Argentina", away: "Cabo Verde" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-pens", homeGoals: 1, awayGoals: 1, qualifiedTeam: "away" as const }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-pens", homeGoals: 1, awayGoals: 1, qualifiedTeam: "home" }],
    });

    expect(row.knockoutPoints).toBe(2);
    expect(row.knockoutExactHits).toBe(1);
    expect(row.knockoutWinnerHits).toBe(0);
    expect(row.pointAudit.find((entry) => entry.id === "k-pens")?.points).toBe(2);
  });

  it("scales exact knockout draw points by stage when the penalty qualifier is wrong", () => {
    const cases = [
      { stage: "QF" as const, points: 3 },
      { stage: "SF" as const, points: 4 },
      { stage: "THIRD" as const, points: 4 },
      { stage: "FINAL" as const, points: 15 },
    ];

    for (const item of cases) {
      const fixture: KnockoutFixture = { id: `k-pens-${item.stage}`, order: 1, stage: item.stage, home: "Argentina", away: "Cabo Verde" };
      const submission = {
        ...submissionFromPayload(),
        knockoutPredictions: [{ fixtureId: fixture.id, homeGoals: 1, awayGoals: 1, qualifiedTeam: "away" as const }],
      };

      const row = scoreSubmission(submission, {
        ...emptyResults,
        knockoutFixtures: [fixture],
        knockoutResults: [{ fixtureId: fixture.id, homeGoals: 1, awayGoals: 1, qualifiedTeam: "home" }],
      });

      expect(row.knockoutPoints).toBe(item.points);
      expect(row.knockoutExactHits).toBe(1);
      expect(row.pointAudit.find((entry) => entry.id === fixture.id)?.points).toBe(item.points);
    }
  });

  it("scores a single knockout prediction for public row colors", () => {
    const fixture: KnockoutFixture = { id: "k-row", order: 1, stage: "R32", home: "Argentina", away: "Cabo Verde" };
    const result = { fixtureId: fixture.id, homeGoals: 1, awayGoals: 0, scorerNames: ["Messi"] };

    expect(scoreKnockoutPredictionForFixture({ fixtureId: fixture.id, homeGoals: 1, awayGoals: 0 }, result, fixture)).toMatchObject({
      basePoints: 4,
      totalPoints: 4,
      verdict: "exact",
    });
    expect(scoreKnockoutPredictionForFixture({ fixtureId: fixture.id, homeGoals: 2, awayGoals: 0 }, result, fixture)).toMatchObject({
      basePoints: 2,
      totalPoints: 2,
      verdict: "partial",
    });
    expect(
      scoreKnockoutPredictionForFixture({ fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, goalScorer: "Messi" }, result, fixture),
    ).toMatchObject({
      basePoints: 0,
      scorerPoints: 1,
      totalPoints: 1,
      verdict: "partial",
    });
    expect(scoreKnockoutPredictionForFixture({ fixtureId: fixture.id, homeGoals: 0, awayGoals: 1 }, result, fixture)).toMatchObject({
      totalPoints: 0,
      verdict: "miss",
    });
  });

  it("scores full knockout exact points when tied score and penalty qualifier are both correct", () => {
    const fixture: KnockoutFixture = { id: "k-pens-full", order: 1, stage: "R32", home: "Argentina", away: "Cabo Verde" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-pens-full", homeGoals: 1, awayGoals: 1, qualifiedTeam: "home" as const }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-pens-full", homeGoals: 1, awayGoals: 1, qualifiedTeam: "home" }],
    });

    expect(row.knockoutPoints).toBe(4);
    expect(row.knockoutExactHits).toBe(1);
    expect(row.knockoutWinnerHits).toBe(0);
  });

  it("scores knockout qualifier points when only the qualifier is correct", () => {
    const fixture: KnockoutFixture = { id: "k-qualifier", order: 1, stage: "R32", home: "Argentina", away: "Cabo Verde" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-qualifier", homeGoals: 1, awayGoals: 0 }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-qualifier", homeGoals: 1, awayGoals: 1, qualifiedTeam: "home" }],
    });

    expect(row.knockoutPoints).toBe(2);
    expect(row.knockoutExactHits).toBe(0);
    expect(row.knockoutWinnerHits).toBe(1);
  });

  it("scores zero knockout points when the predicted qualifier is wrong", () => {
    const fixture: KnockoutFixture = { id: "k-wrong-qualifier", order: 1, stage: "R32", home: "Argentina", away: "Cabo Verde" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-wrong-qualifier", homeGoals: 0, awayGoals: 1 }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-wrong-qualifier", homeGoals: 1, awayGoals: 1, qualifiedTeam: "home" }],
    });

    expect(row.knockoutPoints).toBe(0);
    expect(row.knockoutExactHits).toBe(0);
    expect(row.knockoutWinnerHits).toBe(0);
  });

  it("does not accept a tied knockout result without a penalty qualifier", () => {
    const fixture: KnockoutFixture = { id: "k-missing-qualifier", order: 1, stage: "R32", home: "Argentina", away: "Cabo Verde" };
    const results = validateResultStore({
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-missing-qualifier", homeGoals: 1, awayGoals: 1 }],
    });

    expect(results.knockoutResults).toHaveLength(0);
  });

  it("requires a penalty qualifier when a knockout prediction is tied", () => {
    const fixture: KnockoutFixture = { id: "k-draw", order: 1, stage: "R32", home: "Argentina", away: "Cabo Verde" };
    const result = validateKnockoutSubmission(
      { name: "Nahuel", predictions: [{ fixtureId: "k-draw", homeGoals: 1, awayGoals: 1 }] },
      [fixture],
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("clasifica por penales");
  });

  it("tracks played, won and lost predictions and keeps point totals consistent", () => {
    const row = scoreSubmission(submissionFromPayload("Nahuel"), {
      ...emptyResults,
      matchResults: [
        { matchId: "m-04", homeGoals: 2, awayGoals: 1, outcome: "home" },
        { matchId: "m-01", homeGoals: 0, awayGoals: 1, outcome: "away" },
      ],
      groupResults: [{ groupId: "A", first: groups[0].teams[1], second: groups[0].teams[0] }],
      manualAdjustments: [{ normalizedName: "nahuel", points: 1, reason: "Ajuste" }],
    });

    expect(row.predictionMatchesPlayed).toBe(2);
    expect(row.predictionWins).toBe(1);
    expect(row.predictionLosses).toBe(1);
    expect(row.totalPoints).toBe(row.matchPoints + row.groupPoints + row.knockoutPoints + row.manualAdjustmentPoints);
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
    expect(updatedRow.totalPoints).toBe(6);
    expect(updatedRow.matchPoints).toBe(3);
    expect(updatedRow.groupPoints).toBe(3);
  });

  it("adds manual point adjustments to standings totals", () => {
    const row = scoreSubmission(submissionFromPayload("Lautaro flaco"), {
      ...emptyResults,
      manualAdjustments: [{ normalizedName: "lautaro flaco", name: "Lautaro flaco", points: 1, reason: "Ajuste manual" }],
    });

    expect(row.totalPoints).toBe(1);
    expect(row.manualAdjustmentPoints).toBe(1);
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

  it("closes each knockout fixture ten minutes before its own kickoff", () => {
    const fixture: KnockoutFixture = {
      id: "k-deadline",
      order: 1,
      stage: "R32",
      home: "Argentina",
      away: "Francia",
      kickoffAt: "2026-06-28T19:00:00.000Z",
    };
    const laterFixture: KnockoutFixture = {
      id: "k-later-deadline",
      order: 2,
      stage: "R32",
      home: "Brasil",
      away: "Espana",
      kickoffAt: "2026-06-29T19:00:00.000Z",
    };
    const fixtures = [fixture, laterFixture];

    expect(getKnockoutEditDeadline(fixture, fixtures)).toBe("2026-06-28T18:50:00.000Z");
    expect(getKnockoutEditDeadline(laterFixture, fixtures)).toBe("2026-06-29T18:50:00.000Z");
    expect(isKnockoutFixtureEditable(fixture, new Date("2026-06-28T18:50:00.000Z"), fixtures)).toBe(false);
    expect(isKnockoutFixtureEditable(laterFixture, new Date("2026-06-28T18:50:00.000Z"), fixtures)).toBe(true);
    expect(isKnockoutFixtureEditable(laterFixture, new Date("2026-06-29T18:50:00.000Z"), fixtures)).toBe(false);
  });

  it("closes completed rounds when a later knockout round exists", () => {
    const staleRoundOf32: KnockoutFixture = {
      id: "stale-r32",
      order: 1,
      stage: "R32",
      home: "Sudafrica",
      away: "Canada",
      kickoffAt: "2026-07-18T19:00:00.000Z",
    };
    const thirdPlace: KnockoutFixture = {
      id: "third-place",
      order: 31,
      stage: "THIRD",
      home: "Francia",
      away: "Inglaterra",
      kickoffAt: "2026-07-18T21:00:00.000Z",
    };
    const final: KnockoutFixture = {
      id: "final",
      order: 32,
      stage: "FINAL",
      home: "Argentina",
      away: "Espana",
      kickoffAt: "2026-07-19T19:00:00.000Z",
    };
    const fixtures = [staleRoundOf32, thirdPlace, final];
    const now = new Date("2026-07-16T12:00:00.000Z");

    expect(isKnockoutStageSuperseded("R32", fixtures)).toBe(true);
    expect(isKnockoutFixtureEditable(staleRoundOf32, now, fixtures)).toBe(false);
    expect(isKnockoutStageSuperseded("THIRD", fixtures)).toBe(false);
    expect(isKnockoutStageSuperseded("FINAL", fixtures)).toBe(false);
    expect(isKnockoutFixtureEditable(thirdPlace, now, fixtures)).toBe(true);
    expect(isKnockoutFixtureEditable(final, now, fixtures)).toBe(true);
  });

  it("sorts knockout fixtures by kickoff before order", () => {
    const fixtures: KnockoutFixture[] = [
      { id: "late", order: 1, stage: "R32", home: "Brasil", away: "Japon", kickoffAt: "2026-06-29T04:00:00.000Z" },
      { id: "early", order: 3, stage: "R32", home: "Estados Unidos", away: "Bosnia", kickoffAt: "2026-06-28T23:00:00.000Z" },
      { id: "same-time", order: 2, stage: "R32", home: "Australia", away: "Egipto", kickoffAt: "2026-06-29T04:00:00.000Z" },
    ];

    expect(fixtures.toSorted(compareKnockoutFixturesByKickoff).map((fixture) => fixture.id)).toEqual([
      "early",
      "late",
      "same-time",
    ]);
  });

  it("validates only knockout fixtures that are still open", () => {
    const fixtures: KnockoutFixture[] = [
      { id: "closed", order: 1, stage: "R32", home: "Argentina", away: "Francia" },
      { id: "open", order: 2, stage: "R32", home: "Brasil", away: "Espana" },
    ];
    const result = validateKnockoutSubmission(
      {
        name: "Nahuel",
        predictions: [{ fixtureId: "open", homeGoals: "2", awayGoals: "1" }],
      },
      fixtures,
      { excludedFixtureIds: ["closed"] },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.predictions).toEqual([{ fixtureId: "open", homeGoals: 2, awayGoals: 1 }]);
  });

  it("removes participants from standings after two closed knockout matches without predictions", () => {
    const fixtures: KnockoutFixture[] = [
      { id: "k-1", order: 1, stage: "R32", home: "Argentina", away: "Francia", kickoffAt: "2026-06-28T19:00:00.000Z" },
      { id: "k-2", order: 2, stage: "R32", home: "Brasil", away: "Espana", kickoffAt: "2026-06-28T20:00:00.000Z" },
    ];
    const complete = {
      ...submissionFromPayload("Completo"),
      knockoutPredictions: [
        { fixtureId: "k-1", homeGoals: 2, awayGoals: 1 },
        { fixtureId: "k-2", homeGoals: 1, awayGoals: 0 },
      ],
    };
    const oneMissing = {
      ...submissionFromPayload("Falta uno"),
      knockoutPredictions: [{ fixtureId: "k-1", homeGoals: 2, awayGoals: 1 }],
    };
    const twoMissing = submissionFromPayload("Falta dos");

    const standings = buildStandings(
      [complete, oneMissing, twoMissing],
      { ...emptyResults, knockoutFixtures: fixtures },
      new Date("2026-06-28T19:50:00.000Z"),
    );

    expect(standings.map((row) => row.name)).toEqual(["Completo", "Falta uno"]);
  });

  it("keeps Maxi in standings even when he misses closed knockout matches", () => {
    const fixtures: KnockoutFixture[] = [
      { id: "k-1", order: 1, stage: "R32", home: "Argentina", away: "Francia", kickoffAt: "2026-06-28T19:00:00.000Z" },
      { id: "k-2", order: 2, stage: "R32", home: "Brasil", away: "Espana", kickoffAt: "2026-06-28T20:00:00.000Z" },
    ];
    const maxi = submissionFromPayload("Maxi");

    const standings = buildStandings(
      [maxi],
      { ...emptyResults, knockoutFixtures: fixtures },
      new Date("2026-06-28T19:50:00.000Z"),
    );

    expect(standings.map((row) => row.name)).toEqual(["Maxi"]);
    expect(standings[0]?.playedKnockoutMatches).toBe(0);
  });

  it("hides public knockout predictions until each fixture edit deadline", () => {
    const fixtures: KnockoutFixture[] = [
      { id: "k-r32-a", order: 1, stage: "R32", home: "Argentina", away: "Francia", kickoffAt: "2026-06-28T19:00:00.000Z" },
      { id: "k-r32-b", order: 2, stage: "R32", home: "Brasil", away: "Espana", kickoffAt: "2026-06-29T19:00:00.000Z" },
    ];
    const predictions = [
      { fixtureId: "k-r32-a", homeGoals: 2, awayGoals: 1 },
      { fixtureId: "k-r32-b", homeGoals: 1, awayGoals: 0 },
    ];

    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-06-28T18:49:59.000Z"))).toEqual([]);
    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-06-28T18:50:00.000Z"))).toEqual([
      predictions[0],
    ]);
    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-06-29T18:50:00.000Z"))).toEqual(
      predictions,
    );
  });

  it("uses the fixture edit deadline to unlock public knockout predictions", () => {
    const fixtures: KnockoutFixture[] = [
      {
        id: "late-r32",
        order: 1,
        stage: "R32",
        home: "Argentina",
        away: "Francia",
        kickoffAt: "2026-06-28T20:00:00.000Z",
      },
    ];
    const predictions = [{ fixtureId: "late-r32", homeGoals: 2, awayGoals: 1 }];

    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-06-28T19:49:00.000Z"))).toEqual([]);
    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-06-28T19:50:00.000Z"))).toEqual(
      predictions,
    );
  });

  it("reports knockout public visibility by stage", () => {
    const visibility = getKnockoutVisibility(new Date("2026-07-04T16:49:00.000Z"));

    expect(visibility.R32.public).toBe(true);
    expect(visibility.R16.public).toBe(false);
  });

  it("reports knockout public visibility from loaded fixtures", () => {
    const visibility = getKnockoutVisibility(new Date("2026-06-28T19:49:00.000Z"), [
      {
        id: "late-r32",
        order: 1,
        stage: "R32",
        home: "Argentina",
        away: "Francia",
        kickoffAt: "2026-06-28T20:00:00.000Z",
      },
    ]);

    expect(visibility["late-r32"].public).toBe(false);
    expect(visibility["late-r32"].unlockAt).toBe("2026-06-28T19:50:00.000Z");
  });

  it("parses scorer names from the automatic result source", () => {
    expect(parseScorerNames("{\"F. Balogun 31'\",\"L. Messi 90'+2'\"}")).toEqual(["F. Balogun", "L. Messi"]);
    expect(parseScorerEvents("{\u201cJ. Quinones 9'\u201d,\u201dR. Jimenez 67'\u201d}", "home")).toEqual([
      { team: "home", name: "J. Quinones", minute: "9'" },
      { team: "home", name: "R. Jimenez", minute: "67'" },
    ]);
    expect(parseScorerEvents("{\"K. Mbappe 90+6'\",\"I. Mbaye 90'+5'\"}", "home")).toEqual([
      { team: "home", name: "K. Mbappe", minute: "90+6'" },
      { team: "home", name: "I. Mbaye", minute: "90'+5'" },
    ]);
    expect(parseScorerEvents("{\"F. Balogun 31'\",\"L. Messi 90'+2'\"}", "home")).toEqual([
      { team: "home", name: "F. Balogun", minute: "31'" },
      { team: "home", name: "L. Messi", minute: "90'+2'" },
    ]);
  });

  it("adds one knockout point for a fuzzy scorer hit", () => {
    const fixture: KnockoutFixture = { id: "k-scorer", order: 1, stage: "R32", home: "Estados Unidos", away: "Francia" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-scorer", homeGoals: 1, awayGoals: 2, goalScorer: "Foarin Baolgun" }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-scorer", homeGoals: 0, awayGoals: 1, scorerNames: ["Folarin Balogun"] }],
    });

    expect(row.knockoutPoints).toBe(3);
    expect(row.knockoutScorerHits).toBe(1);
  });

  it("adds one knockout scorer point when blank means no scorer in a 0-0", () => {
    const fixture: KnockoutFixture = { id: "k-scoreless", order: 1, stage: "R32", home: "Argentina", away: "Italia" };
    const submission = {
      ...submissionFromPayload(),
      knockoutPredictions: [{ fixtureId: "k-scoreless", homeGoals: 0, awayGoals: 0 }],
    };

    const row = scoreSubmission(submission, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: "k-scoreless", homeGoals: 0, awayGoals: 0 }],
    });

    expect(row.knockoutPoints).toBe(5);
    expect(row.knockoutExactHits).toBe(1);
    expect(row.knockoutScorerHits).toBe(1);
  });

  it("loads 26 scorer options per quarterfinal team", () => {
    expect(Object.keys(knockoutTeamRosters).sort()).toEqual(
      ["Argentina", "Belgica", "Espana", "Francia", "Inglaterra", "Marruecos", "Noruega", "Suiza"].sort(),
    );
    expect(Object.values(knockoutTeamRosters).every((roster) => roster.length === 26)).toBe(true);
  });

  it("has 26 scorer options for every current quarterfinal team", () => {
    const currentQuarterfinalTeams = ["Francia", "Marruecos", "Noruega", "Inglaterra", "Espana", "Belgica", "Argentina", "Suiza"];
    expect(currentQuarterfinalTeams.map((team) => [team, getKnockoutRoster(team).length])).toEqual(
      currentQuarterfinalTeams.map((team) => [team, 26]),
    );
  });

  it("keeps knockout scorer bonus fixed at one point before quarterfinals", () => {
    const fixture: KnockoutFixture = { id: "k-r16-scorer", order: 1, stage: "R16", home: "Inglaterra", away: "Noruega" };
    const result = { fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, scorerNames: ["Erling Haaland"] };

    expect(
      scoreKnockoutPredictionForFixture(
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 2, goalScorer: "Erling Haaland" },
        result,
        fixture,
      ),
    ).toMatchObject({
      basePoints: 2,
      scorerPoints: 1,
      totalPoints: 3,
    });
  });

  it("scores quarterfinal scorer picks by role only from quarterfinals onward", () => {
    const fixture: KnockoutFixture = { id: "k-qf-scorer", order: 1, stage: "QF", home: "Inglaterra", away: "Noruega" };

    expect(
      scoreKnockoutPredictionForFixture(
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 2, goalScorer: "Erling Haaland" },
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, scorerNames: ["Erling Haaland"] },
        fixture,
      ).scorerPoints,
    ).toBe(1);
    expect(
      scoreKnockoutPredictionForFixture(
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 2, goalScorer: "Alexander Sorloth" },
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, scorerNames: ["Alexander Sorloth"] },
        fixture,
      ).scorerPoints,
    ).toBe(2);
    expect(
      scoreKnockoutPredictionForFixture(
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 2, goalScorer: "Martin Odegaard" },
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, scorerNames: ["Martin Odegaard"] },
        fixture,
      ).scorerPoints,
    ).toBe(3);
  });

  it("triples every final scoring component without accumulating exact and winner points", () => {
    const fixture: KnockoutFixture = { id: "k-final-x3", order: 1, stage: "FINAL", home: "Inglaterra", away: "Noruega" };
    const result = { fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, scorerNames: ["Martin Odegaard"] };

    expect(
      scoreKnockoutPredictionForFixture(
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 1, goalScorer: "Martin Odegaard" },
        result,
        fixture,
        { underdogBonus: 9 },
      ),
    ).toMatchObject({
      basePoints: 27,
      scorerPoints: 9,
      underdogPoints: 9,
      totalPoints: 45,
      verdict: "exact",
    });

    expect(
      scoreKnockoutPredictionForFixture(
        { fixtureId: fixture.id, homeGoals: 0, awayGoals: 2 },
        result,
        fixture,
      ),
    ).toMatchObject({ basePoints: 15, totalPoints: 15, verdict: "partial" });

    const submissions = Array.from({ length: 8 }, (_, index) => ({
      ...submissionFromPayload(`Finalista ${index + 1}`),
      knockoutPredictions: [
        { fixtureId: fixture.id, homeGoals: index < 7 ? 0 : 2, awayGoals: index < 7 ? 1 : 0 },
      ],
    }));
    const standings = buildStandings(submissions, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [result],
    });
    expect(standings.find((row) => row.name === "Finalista 1")?.pointAudit).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "underdog", points: 9 })]),
    );
  });

  it("adds the minority qualifier bonus only from quarterfinals onward", () => {
    const fixture: KnockoutFixture = { id: "k-qf-underdog", order: 1, stage: "QF", home: "Argentina", away: "Colombia" };
    const submissions = Array.from({ length: 8 }, (_, index) => ({
      ...submissionFromPayload(`Jugador ${index + 1}`),
      knockoutPredictions: [
        {
          fixtureId: fixture.id,
          homeGoals: index < 7 ? 2 : 0,
          awayGoals: index < 7 ? 0 : 1,
        },
      ],
    }));

    const standings = buildStandings(submissions, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: fixture.id, homeGoals: 1, awayGoals: 0 }],
    });

    const argentinaPick = standings.find((row) => row.name === "Jugador 1");
    const colombiaPick = standings.find((row) => row.name === "Jugador 8");
    expect(argentinaPick?.knockoutPoints).toBe(6);
    expect(argentinaPick?.pointAudit).toEqual(expect.arrayContaining([expect.objectContaining({ category: "underdog", points: 3 })]));
    expect(colombiaPick?.knockoutPoints).toBe(0);
  });

  it("does not add a minority qualifier bonus in 16avos or octavos", () => {
    const fixture: KnockoutFixture = { id: "k-r16-no-underdog", order: 1, stage: "R16", home: "Argentina", away: "Colombia" };
    const submissions = Array.from({ length: 8 }, (_, index) => ({
      ...submissionFromPayload(`R16 ${index + 1}`),
      knockoutPredictions: [
        {
          fixtureId: fixture.id,
          homeGoals: index < 7 ? 2 : 0,
          awayGoals: index < 7 ? 0 : 1,
        },
      ],
    }));

    const standings = buildStandings(submissions, {
      ...emptyResults,
      knockoutFixtures: [fixture],
      knockoutResults: [{ fixtureId: fixture.id, homeGoals: 1, awayGoals: 0 }],
    });

    expect(standings.find((row) => row.name === "R16 1")?.knockoutPoints).toBe(2);
  });

  it("sorts tied standings by alphabetical name after points, exacts and wins", () => {
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

  it("sorts tied standings by more exact scores before wins and name", () => {
    const nahuel = submissionFromPayload("Nahuel");
    const ana = submissionFromPayload("Ana");
    nahuel.predictions = nahuel.predictions.map((prediction) =>
      prediction.matchId === "m-04" && prediction.type === "score"
        ? { ...prediction, homeGoals: 1, awayGoals: 0, outcome: "home" as const }
        : prediction,
    );
    ana.predictions = ana.predictions.map((prediction) =>
      prediction.matchId === "m-01" && prediction.type === "choice"
        ? { ...prediction, choice: "away" as const }
        : prediction,
    );

    const rows = buildStandings([ana, nahuel], {
      ...emptyResults,
      matchResults: [
        { matchId: "m-04", homeGoals: 2, awayGoals: 1, outcome: "home" },
        { matchId: "m-01", homeGoals: 1, awayGoals: 0, outcome: "home" },
      ],
    });

    expect(rows.map((row) => ({ name: row.name, points: row.totalPoints, exacts: row.exactHits }))).toEqual([
      { name: "Ana", points: 2, exacts: 1 },
      { name: "Nahuel", points: 2, exacts: 0 },
    ]);
  });

  it("sorts tied standings by more winning predictions after exact scores", () => {
    const twoWins = submissionFromPayload("Ana");
    const oneWin = submissionFromPayload("Nahuel");
    oneWin.predictions = oneWin.predictions.map((prediction) =>
      prediction.matchId === "m-01" && prediction.type === "choice"
        ? { ...prediction, choice: "away" as const }
        : prediction,
    );

    const rows = buildStandings([oneWin, twoWins], {
      ...emptyResults,
      matchResults: [
        { matchId: "m-01", homeGoals: 1, awayGoals: 0, outcome: "home" },
        { matchId: "m-02", homeGoals: 1, awayGoals: 0, outcome: "home" },
      ],
      manualAdjustments: [{ normalizedName: "nahuel", name: "Nahuel", points: 1, reason: "Ajuste de test" }],
    });

    expect(rows.map((row) => ({ name: row.name, points: row.totalPoints, exacts: row.exactHits, wins: row.predictionWins }))).toEqual([
      { name: "Ana", points: 2, exacts: 0, wins: 2 },
      { name: "Nahuel", points: 2, exacts: 0, wins: 1 },
    ]);
  });
});
