import { NextResponse } from "next/server";
import { knockoutFixtureStatus } from "@/lib/knockout-deadlines";
import { readResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results = await readResultStore();
  const now = new Date();
  return NextResponse.json({
    fixtures: results.knockoutFixtures.toSorted((a, b) => a.order - b.order),
    fixtureStatus: Object.fromEntries(
      results.knockoutFixtures.map((fixture) => [fixture.id, knockoutFixtureStatus(fixture, now, results.knockoutFixtures)]),
    ),
  });
}
