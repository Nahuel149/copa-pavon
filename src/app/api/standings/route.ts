import { NextResponse } from "next/server";
import { buildStandings, clans } from "@/lib/prode";
import { readResultStore, readSubmissionStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
    updatedAt: new Date().toISOString(),
  });
}
