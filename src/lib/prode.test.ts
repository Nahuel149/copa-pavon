import { describe, expect, it } from "vitest";
import { getKnockoutEditDeadline, isKnockoutFixtureEditable } from "./knockout-deadlines";
import { filterPublicKnockoutPredictions, getKnockoutVisibility } from "./knockout-visibility";
import { getMatchEditDeadline, getMatchEditStatus } from "./edit-deadline";
import { getLateEditExcludedMatchIds } from "./edit-validation";
import { groups, matches, type KnockoutFixture, type Match } from "./matches";
import {
  buildStandings,
  countCompletePredictions,
  countCompleteKnockoutPredictions,
  defaultClan,
  getOutcome,
  normalizeName,
  parseScorerEvents,
  parseScorerNames,
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

    expect(row.knockoutPoints).toBe(8);
    expect(row.knockoutExactHits).toBe(1);
    expect(row.knockoutWinnerHits).toBe(0);
    expect(row.predictionMatchesPlayed).toBe(1);
    expect(row.predictionWins).toBe(1);
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

  it("closes each knockout fixture ten minutes before kickoff", () => {
    const fixture: KnockoutFixture = {
      id: "k-deadline",
      order: 1,
      stage: "R32",
      home: "Argentina",
      away: "Francia",
      kickoffAt: "2026-06-28T19:00:00.000Z",
    };

    expect(getKnockoutEditDeadline(fixture)).toBe("2026-06-28T18:50:00.000Z");
    expect(isKnockoutFixtureEditable(fixture, new Date("2026-06-28T18:49:59.000Z"))).toBe(true);
    expect(isKnockoutFixtureEditable(fixture, new Date("2026-06-28T18:50:00.000Z"))).toBe(false);
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

  it("hides public knockout predictions until each stage starts", () => {
    const fixtures: KnockoutFixture[] = [
      { id: "k-r32", order: 1, stage: "R32", home: "Argentina", away: "Francia" },
      { id: "k-r16", order: 2, stage: "R16", home: "Brasil", away: "Espana" },
    ];
    const predictions = [
      { fixtureId: "k-r32", homeGoals: 2, awayGoals: 1 },
      { fixtureId: "k-r16", homeGoals: 1, awayGoals: 0 },
    ];

    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-06-28T18:59:00.000Z"))).toEqual([]);
    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-06-28T19:00:00.000Z"))).toEqual([
      predictions[0],
    ]);
    expect(filterPublicKnockoutPredictions(predictions, fixtures, new Date("2026-07-04T17:00:00.000Z"))).toEqual(
      predictions,
    );
  });

  it("reports knockout public visibility by stage", () => {
    const visibility = getKnockoutVisibility(new Date("2026-07-04T16:59:00.000Z"));

    expect(visibility.R32.public).toBe(true);
    expect(visibility.R16.public).toBe(false);
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
