import { NextResponse } from "next/server";
import { autoSyncGroupMatchResults } from "@/lib/auto-results";
import { knockoutStageLabels, knockoutStages, matches, type KnockoutFixture } from "@/lib/matches";
import {
  buildStandings,
  clans,
  getEffectiveGroupResults,
  scoreKnockoutPredictionForFixture,
  standingsTieBreakRules,
  type KnockoutResult,
  type ResultStore,
  type Submission,
} from "@/lib/prode";
import { readResultStore, readSubmissionStore, writeResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildHistorySnapshot(label: string, title: string, submissions: Submission[], results: ResultStore) {
  return {
    label,
    title,
    positions: buildStandings(submissions, results).map((standing, index) => ({
      submissionId: standing.submissionId,
      name: standing.name,
      clan: standing.clan,
      position: index + 1,
      points: standing.totalPoints,
    })),
  };
}

function buildStandingsHistory(submissions: Submission[], results: ResultStore) {
  const matchOrder = new Map(matches.map((match) => [match.id, match.order]));
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const playedMatchResults = [...results.matchResults].sort(
    (a, b) => (matchOrder.get(a.matchId) ?? 999) - (matchOrder.get(b.matchId) ?? 999),
  );

  const playedDays = Array.from(
    new Set(playedMatchResults.map((result) => matchById.get(result.matchId)?.dateLabel).filter((day): day is string => Boolean(day))),
  ).sort((a, b) => {
    const firstOrder = matches.find((match) => match.dateLabel === a)?.order ?? 999;
    const secondOrder = matches.find((match) => match.dateLabel === b)?.order ?? 999;
    return firstOrder - secondOrder;
  });

  const snapshots = playedDays.map((day) => {
    const cumulativeResults = playedMatchResults.filter((result) => {
      const match = matchById.get(result.matchId);
      const dayOrder = matches.find((item) => item.dateLabel === day)?.order ?? 999;
      return match && match.order <= dayOrder + matches.filter((item) => item.dateLabel === day).length - 1;
    });
    const dayResults = playedMatchResults.filter((result) => matchById.get(result.matchId)?.dateLabel === day);
    return buildHistorySnapshot(day, `${dayResults.length} partidos con resultado`, submissions, {
      matchResults: cumulativeResults,
      groupResults: [],
      knockoutFixtures: [],
      knockoutResults: [],
      manualAdjustments: results.manualAdjustments ?? [],
    });
  });

  const effectiveGroupResults = getEffectiveGroupResults(results);
  if (effectiveGroupResults.length > 0) {
    snapshots.push(
      buildHistorySnapshot("Grupos", "Top 2 de grupos", submissions, {
        matchResults: results.matchResults,
        groupResults: effectiveGroupResults,
        knockoutFixtures: [],
        knockoutResults: [],
        manualAdjustments: results.manualAdjustments ?? [],
      }),
    );
  }

  if (results.knockoutResults.length > 0) {
    snapshots.push(buildHistorySnapshot("Elim.", "Eliminatorias", submissions, results));
  }

  return snapshots;
}

function buildDailyRecap(
  submissions: Submission[],
  results: ResultStore,
  history: ReturnType<typeof buildStandingsHistory>,
) {
  const knockoutRecap = buildKnockoutDailyRecap(submissions, results, history);
  if (knockoutRecap) return knockoutRecap;

  const resultByMatch = new Map(results.matchResults.map((result) => [result.matchId, result]));
  const latestPlayedMatch = matches.toReversed().find((match) => resultByMatch.has(match.id));
  if (!latestPlayedMatch) return null;
  const dayMatches = matches.filter((match) => match.dateLabel === latestPlayedMatch.dateLabel && resultByMatch.has(match.id));
  const dayResults = dayMatches.map((match) => resultByMatch.get(match.id)).filter((result): result is NonNullable<typeof result> => Boolean(result));
  const dailyStandings = buildStandings(submissions, {
    matchResults: dayResults,
    groupResults: [],
    knockoutFixtures: [],
    knockoutResults: [],
    manualAdjustments: [],
  });
  const leader = dailyStandings[0];
  const latestSnapshot = history.findLast((snapshot) => snapshot.label === latestPlayedMatch.dateLabel);
  const latestIndex = latestSnapshot ? history.indexOf(latestSnapshot) : -1;
  const previousSnapshot = latestIndex > 0 ? history[latestIndex - 1] : undefined;
  const previousPosition = new Map((previousSnapshot?.positions ?? []).map((row) => [row.submissionId, row.position]));
  const biggestRise = latestSnapshot?.positions
    .map((row) => ({ ...row, movement: (previousPosition.get(row.submissionId) ?? row.position) - row.position }))
    .toSorted((a, b) => b.movement - a.movement || b.points - a.points || b.name.localeCompare(a.name, "es"))[0];

  return {
    dateLabel: latestPlayedMatch.dateLabel,
    matchesPlayed: dayMatches.length,
    matches: dayMatches.map((match) => {
      const result = resultByMatch.get(match.id)!;
      return {
        matchId: match.id,
        label: `${match.home} vs. ${match.away}`,
        score: `${result.homeGoals}-${result.awayGoals}`,
        source: result.source ?? "api",
      };
    }),
    leader: leader
      ? {
          submissionId: leader.submissionId,
          name: leader.name,
          points: leader.totalPoints,
          hits: leader.predictionWins,
          exacts: leader.exactHits,
        }
      : null,
    correctPredictions: dailyStandings.reduce((total, row) => total + row.predictionWins, 0),
    exactPredictions: dailyStandings.reduce((total, row) => total + row.exactHits, 0),
    biggestRise:
      biggestRise && biggestRise.movement > 0
        ? { name: biggestRise.name, positions: biggestRise.movement }
        : null,
  };
}

function buildKnockoutDailyRecap(
  submissions: Submission[],
  results: ResultStore,
  history: ReturnType<typeof buildStandingsHistory>,
) {
  const resultByFixture = new Map(results.knockoutResults.map((result) => [result.fixtureId, result]));
  const fixturesWithResults = results.knockoutFixtures.filter((fixture) => resultByFixture.has(fixture.id));
  if (fixturesWithResults.length === 0) return null;

  const latestStage = knockoutStages.toReversed().find((stage) => fixturesWithResults.some((fixture) => fixture.stage === stage));
  if (!latestStage) return null;

  const stageFixtures = fixturesWithResults
    .filter((fixture) => fixture.stage === latestStage)
    .toSorted(compareKnockoutFixtureOrder)
    .slice(-6);
  const stageResults = stageFixtures
    .map((fixture) => resultByFixture.get(fixture.id))
    .filter((result): result is KnockoutResult => Boolean(result));
  const stageRows = submissions
    .map((submission) => {
      const predictionByFixture = new Map((submission.knockoutPredictions ?? []).map((prediction) => [prediction.fixtureId, prediction]));
      const totals = stageFixtures.reduce(
        (acc, fixture) => {
          const scoring = scoreKnockoutPredictionForFixture(predictionByFixture.get(fixture.id), resultByFixture.get(fixture.id), fixture);
          acc.points += scoring.totalPoints;
          if (scoring.verdict === "exact") acc.exacts += 1;
          if (scoring.totalPoints > 0) acc.hits += 1;
          return acc;
        },
        { points: 0, hits: 0, exacts: 0 },
      );
      return { submissionId: submission.id, name: submission.name, ...totals };
    })
    .toSorted((a, b) => b.points - a.points || b.exacts - a.exacts || b.hits - a.hits || b.name.localeCompare(a.name, "es"));

  const latestSnapshot = history.at(-1);
  const previousSnapshot = history.length > 1 ? history.at(-2) : undefined;
  const previousPosition = new Map((previousSnapshot?.positions ?? []).map((row) => [row.submissionId, row.position]));
  const biggestRise = latestSnapshot?.positions
    .map((row) => ({ ...row, movement: (previousPosition.get(row.submissionId) ?? row.position) - row.position }))
    .toSorted((a, b) => b.movement - a.movement || b.points - a.points || b.name.localeCompare(a.name, "es"))[0];

  const stageLabel = knockoutStageLabels[latestStage];
  return {
    dateLabel: stageLabel,
    matchesPlayed: stageResults.length,
    matches: stageFixtures.map((fixture) => {
      const result = resultByFixture.get(fixture.id)!;
      return {
        matchId: fixture.id,
        label: `${fixture.home} vs. ${fixture.away}`,
        score: `${result.homeGoals}-${result.awayGoals}`,
        source: result.source ?? "manual",
      };
    }),
    leader: stageRows[0]
      ? {
          submissionId: stageRows[0].submissionId,
          name: stageRows[0].name,
          points: stageRows[0].points,
          hits: stageRows[0].hits,
          exacts: stageRows[0].exacts,
        }
      : null,
    correctPredictions: stageRows.reduce((total, row) => total + row.hits, 0),
    exactPredictions: stageRows.reduce((total, row) => total + row.exacts, 0),
    biggestRise:
      biggestRise && biggestRise.movement > 0
        ? { name: biggestRise.name, positions: biggestRise.movement }
        : null,
  };
}

function compareKnockoutFixtureOrder(a: KnockoutFixture, b: KnockoutFixture) {
  const firstKickoff = a.kickoffAt ? new Date(a.kickoffAt).getTime() : Number.NaN;
  const secondKickoff = b.kickoffAt ? new Date(b.kickoffAt).getTime() : Number.NaN;
  if (Number.isFinite(firstKickoff) && Number.isFinite(secondKickoff) && firstKickoff !== secondKickoff) {
    return firstKickoff - secondKickoff;
  }
  if (Number.isFinite(firstKickoff) !== Number.isFinite(secondKickoff)) {
    return Number.isFinite(firstKickoff) ? -1 : 1;
  }
  return a.order - b.order;
}

export async function GET() {
  try {
    let syncReport = null;
    try {
      syncReport = await autoSyncGroupMatchResults(readResultStore, writeResultStore);
    } catch {
      syncReport = null;
    }

    const [submissionStore, results] = await Promise.all([readSubmissionStore(), readResultStore()]);
    const effectiveGroupResults = getEffectiveGroupResults(results);
    const standings = buildStandings(submissionStore.submissions, results);
    const history = buildStandingsHistory(submissionStore.submissions, results);
    return NextResponse.json({
      standings,
      standingsByClan: Object.fromEntries(
        clans.map((clan) => [clan.id, standings.filter((standing) => standing.clan === clan.id)]),
      ),
      history,
      dailyRecap: buildDailyRecap(submissionStore.submissions, results, history),
      tieBreakRules: standingsTieBreakRules,
      playedMatches: results.matchResults.length,
      decidedGroups: effectiveGroupResults.length,
      knockoutFixtures: results.knockoutFixtures.length,
      playedKnockoutMatches: results.knockoutResults.length,
      autoSync: syncReport,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la tabla. Intenta nuevamente." }, { status: 500 });
  }
}
