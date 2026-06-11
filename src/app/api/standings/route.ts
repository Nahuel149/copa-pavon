import { NextResponse } from "next/server";
import { autoSyncGroupMatchResults } from "@/lib/auto-results";
import { buildStandings, clans } from "@/lib/prode";
import { readResultStore, readSubmissionStore, writeResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
