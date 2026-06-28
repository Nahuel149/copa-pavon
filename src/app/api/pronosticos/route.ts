import { NextResponse } from "next/server";
import { autoSyncGroupMatchResults } from "@/lib/auto-results";
import { compareKnockoutFixturesByKickoff } from "@/lib/knockout-deadlines";
import { getKnockoutVisibility, hideLockedKnockoutPredictions } from "@/lib/knockout-visibility";
import { buildStandings } from "@/lib/prode";
import { publicSubmission, readResultStore, readSubmissionStore, writeResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    try {
      await autoSyncGroupMatchResults(readResultStore, writeResultStore);
    } catch {
      // Public comparison should still work with the last saved results.
    }

    const [submissionStore, results] = await Promise.all([readSubmissionStore(), readResultStore()]);
    const now = new Date();
    const knockoutFixtures = results.knockoutFixtures.toSorted(compareKnockoutFixturesByKickoff);
    const publicResults = { ...results, knockoutFixtures };
    const submissions = submissionStore.submissions
      .toSorted((a, b) => a.name.localeCompare(b.name, "es"))
      .map(publicSubmission)
      .map((submission) => hideLockedKnockoutPredictions(submission, knockoutFixtures, now));
    const standings = buildStandings(submissionStore.submissions, results);

    return NextResponse.json({
      submissions,
      standings,
      results: publicResults,
      knockoutVisibility: getKnockoutVisibility(now, knockoutFixtures),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los pronosticos. Intenta nuevamente." }, { status: 500 });
  }
}
