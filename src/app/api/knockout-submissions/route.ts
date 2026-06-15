import { NextResponse } from "next/server";
import { isKnockoutFixtureEditable } from "@/lib/knockout-deadlines";
import { validateKnockoutSubmission } from "@/lib/prode";
import { appendKnockoutPredictions, readResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer el envio."] }, { status: 400 });
  }

  const results = await readResultStore();
  const closedFixtureIds = results.knockoutFixtures
    .filter((fixture) => !isKnockoutFixtureEditable(fixture))
    .map((fixture) => fixture.id);

  if (results.knockoutFixtures.length > 0 && closedFixtureIds.length === results.knockoutFixtures.length) {
    return NextResponse.json(
      { errors: ["No hay cruces abiertos para editar. Cada partido cierra 10 minutos antes de empezar."] },
      { status: 403 },
    );
  }

  const validation = validateKnockoutSubmission(
    payload as Parameters<typeof validateKnockoutSubmission>[0],
    results.knockoutFixtures,
    { excludedFixtureIds: closedFixtureIds },
  );

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors.slice(0, 12) }, { status: 400 });
  }

  const saved = await appendKnockoutPredictions(validation.normalizedName, validation.predictions);
  if (!saved.ok && saved.reason === "missing-submission") {
    return NextResponse.json(
      { errors: ["Ese nombre no tiene envio de fase de grupos. Usa el mismo nombre con el que participaste."] },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
