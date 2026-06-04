import { NextResponse } from "next/server";
import { buildStandings } from "@/lib/prode";
import { readResultStore, readSubmissionStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [submissionStore, results] = await Promise.all([readSubmissionStore(), readResultStore()]);
  return NextResponse.json({
    standings: buildStandings(submissionStore.submissions, results),
    playedMatches: results.matchResults.length,
    decidedGroups: results.groupResults.length,
    knockoutFixtures: results.knockoutFixtures.length,
    playedKnockoutMatches: results.knockoutResults.length,
    updatedAt: new Date().toISOString(),
  });
}
