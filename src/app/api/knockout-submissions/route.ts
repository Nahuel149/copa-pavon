import { NextResponse } from "next/server";
import { isKnockoutFixtureEditable } from "@/lib/knockout-deadlines";
import { isOptionalLateKnockoutFixture } from "@/lib/knockout-optional";
import { validateParticipantPin, verifyPin } from "@/lib/pin";
import { normalizeName, validateKnockoutSubmission } from "@/lib/prode";
import { appendKnockoutPredictions, findSubmissionByNormalizedName, readResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasCompleteRawKnockoutPrediction(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as { homeGoals?: unknown; awayGoals?: unknown; qualifiedTeam?: unknown };
  const homeGoals = typeof item.homeGoals === "string" ? item.homeGoals.trim() : item.homeGoals;
  const awayGoals = typeof item.awayGoals === "string" ? item.awayGoals.trim() : item.awayGoals;
  if (homeGoals === "" || awayGoals === "" || homeGoals === undefined || awayGoals === undefined) return false;
  const homeNumber = Number(homeGoals);
  const awayNumber = Number(awayGoals);
  if (!Number.isInteger(homeNumber) || !Number.isInteger(awayNumber)) return false;
  return homeNumber !== awayNumber || item.qualifiedTeam === "home" || item.qualifiedTeam === "away";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer el envio."] }, { status: 400 });
  }

  const results = await readResultStore();
  const body = (payload ?? {}) as { name?: unknown; pin?: unknown };
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const pinError = validateParticipantPin(pin);
  if (name.length < 2 || pinError) {
    return NextResponse.json({ errors: ["Ingresa tu nombre y PIN."] }, { status: 400 });
  }

  const submission = await findSubmissionByNormalizedName(normalizeName(name));
  if (!submission) {
    return NextResponse.json({ errors: ["No encontramos un prode con ese nombre."] }, { status: 404 });
  }
  if (!verifyPin(pin, submission.pinHash)) {
    return NextResponse.json({ errors: ["Nombre o PIN incorrecto."] }, { status: 401 });
  }

  const closedFixtureIds = results.knockoutFixtures
    .filter((fixture) => !isKnockoutFixtureEditable(fixture, new Date(), results.knockoutFixtures))
    .map((fixture) => fixture.id);
  const rawPredictions = Array.isArray((payload as { predictions?: unknown })?.predictions)
    ? ((payload as { predictions: unknown[] }).predictions)
    : [];
  const rawByFixture = new Map(
    rawPredictions
      .filter((item): item is { fixtureId: string } => Boolean(item) && typeof item === "object" && typeof (item as { fixtureId?: unknown }).fixtureId === "string")
      .map((item) => [item.fixtureId, item] as const),
  );
  const optionalIncompleteFixtureIds = results.knockoutFixtures
    .filter((fixture) => isOptionalLateKnockoutFixture(fixture) && !hasCompleteRawKnockoutPrediction(rawByFixture.get(fixture.id)))
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
    { excludedFixtureIds: [...closedFixtureIds, ...optionalIncompleteFixtureIds] },
  );

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors.slice(0, 12) }, { status: 400 });
  }

  const saved = await appendKnockoutPredictions(submission.normalizedName, validation.predictions);
  if (!saved.ok && saved.reason === "missing-submission") {
    return NextResponse.json(
      { errors: ["Ese nombre no tiene envio de fase de grupos. Usa el mismo nombre con el que participaste."] },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, saved: validation.predictions.length }, { status: 201 });
}
