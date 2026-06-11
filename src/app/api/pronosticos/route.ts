import { NextResponse } from "next/server";
import { autoSyncGroupMatchResults } from "@/lib/auto-results";
import { buildStandings } from "@/lib/prode";
import { publicSubmission, readResultStore, readSubmissionStore, writeResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await autoSyncGroupMatchResults(readResultStore, writeResultStore);
  } catch {
    // Public comparison should still work with the last saved results.
  }

  const [submissionStore, results] = await Promise.all([readSubmissionStore(), readResultStore()]);
  const submissions = submissionStore.submissions
    .toSorted((a, b) => a.name.localeCompare(b.name, "es"))
    .map(publicSubmission);
  const standings = buildStandings(submissionStore.submissions, results);

  return NextResponse.json({
    submissions,
    standings,
    results,
    updatedAt: new Date().toISOString(),
  });
}
