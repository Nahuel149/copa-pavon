import { NextResponse } from "next/server";
import { readResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results = await readResultStore();
  return NextResponse.json({
    fixtures: results.knockoutFixtures.toSorted((a, b) => a.order - b.order),
  });
}
