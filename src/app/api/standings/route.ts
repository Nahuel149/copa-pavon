import { NextResponse } from "next/server";
import { autoSyncGroupMatchResults } from "@/lib/auto-results";
import { matches } from "@/lib/matches";
import { buildStandings, clans, type ResultStore, type Submission } from "@/lib/prode";
import { readResultStore, readSubmissionStore, writeResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildHistorySnapshot(label: string, submissions: Submission[], results: ResultStore) {
  return {
    label,
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
  const snapshots = [1, 2, 3].map((round) => {
    const roundMatchIds = new Set(matches.filter((match) => match.round <= round).map((match) => match.id));
    return buildHistorySnapshot(`F${round}`, submissions, {
      matchResults: results.matchResults.filter((result) => roundMatchIds.has(result.matchId)),
      groupResults: [],
      knockoutFixtures: [],
      knockoutResults: [],
    });
  });

  if (results.groupResults.length > 0) {
    snapshots.push(
      buildHistorySnapshot("Grupos", submissions, {
        matchResults: results.matchResults,
        groupResults: results.groupResults,
        knockoutFixtures: [],
        knockoutResults: [],
      }),
    );
  }

  if (results.knockoutResults.length > 0) {
    snapshots.push(buildHistorySnapshot("Elim.", submissions, results));
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
