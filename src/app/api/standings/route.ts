import { NextResponse } from "next/server";
import { autoSyncGroupMatchResults } from "@/lib/auto-results";
import { matches } from "@/lib/matches";
import { buildStandings, clans, type ResultStore, type Submission } from "@/lib/prode";
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

  if (results.groupResults.length > 0) {
    snapshots.push(
      buildHistorySnapshot("Grupos", "Top 2 de grupos", submissions, {
        matchResults: results.matchResults,
        groupResults: results.groupResults,
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

export async function GET() {
  try {
    let syncReport = null;
    try {
      syncReport = await autoSyncGroupMatchResults(readResultStore, writeResultStore);
    } catch {
      syncReport = null;
    }

    const [submissionStore, results] = await Promise.all([readSubmissionStore(), readResultStore()]);
    const standings = buildStandings(submissionStore.submissions, results);
    return NextResponse.json({
      standings,
      standingsByClan: Object.fromEntries(
        clans.map((clan) => [clan.id, standings.filter((standing) => standing.clan === clan.id)]),
      ),
      history: buildStandingsHistory(submissionStore.submissions, results),
      playedMatches: results.matchResults.length,
      decidedGroups: results.groupResults.length,
      knockoutFixtures: results.knockoutFixtures.length,
      playedKnockoutMatches: results.knockoutResults.length,
      autoSync: syncReport,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la tabla. Intenta nuevamente." }, { status: 500 });
  }
}
