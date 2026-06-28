import { NextResponse } from "next/server";
import { compareKnockoutFixturesByKickoff, knockoutFixtureStatus } from "@/lib/knockout-deadlines";
import { readResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results = await readResultStore();
  const now = new Date();
  const fixtures = results.knockoutFixtures.toSorted(compareKnockoutFixturesByKickoff);
  return NextResponse.json({
    fixtures,
    fixtureStatus: Object.fromEntries(
      fixtures.map((fixture) => [fixture.id, knockoutFixtureStatus(fixture, now, fixtures)]),
    ),
  });
}
