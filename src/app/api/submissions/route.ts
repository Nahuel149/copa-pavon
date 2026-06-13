import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createPinHash, validateParticipantPin } from "@/lib/pin";
import { validateSubmission } from "@/lib/prode";
import { appendSubmission, publicSubmission, readAppSettings, readResultStore, readSubmissionStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminAllowed(request: Request) {
  const requiredPin = process.env.PRODE_ADMIN_PIN;
  if (!requiredPin) return true;
  const url = new URL(request.url);
  const providedPin = request.headers.get("x-prode-admin-pin") ?? url.searchParams.get("pin");
  return providedPin === requiredPin;
}

export async function GET(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN inválido." }, { status: 401 });
  }

  const store = await readSubmissionStore();
  return NextResponse.json({
    submissions: store.submissions.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicSubmission),
  });
}

export async function POST(request: Request) {
  const settings = await readAppSettings();
  if (!settings.submissionsOpen) {
    return NextResponse.json(
      { errors: ["La carga de pronosticos esta cerrada por ahora. Admin puede volver a abrirla desde el panel."] },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer el envío."] }, { status: 400 });
  }

  const results = await readResultStore();
  const closedMatchIds = results.matchResults.map((result) => result.matchId);
  const result = validateSubmission(payload as Parameters<typeof validateSubmission>[0], { excludedMatchIds: closedMatchIds });
  const pinError = validateParticipantPin((payload as { pin?: unknown }).pin);
  if (!result.ok) {
    return NextResponse.json({ errors: [...result.errors, ...(pinError ? [pinError] : [])].slice(0, 12) }, { status: 400 });
  }
  if (pinError) {
    return NextResponse.json({ errors: [pinError] }, { status: 400 });
  }

  const pin = String((payload as { pin: string }).pin).trim();
  const submission = {
    id: randomUUID(),
    name: result.name,
    normalizedName: result.normalizedName,
    clan: result.clan,
    pinHash: createPinHash(pin),
    createdAt: new Date().toISOString(),
    predictions: result.predictions,
    groupPredictions: result.groupPredictions,
    knockoutPredictions: [],
  };

  const saved = await appendSubmission(submission);
  if (!saved.ok && saved.reason === "duplicate-name") {
    return NextResponse.json(
      { errors: ["Ya existe un pronóstico guardado con ese nombre. El envío original queda definitivo."] },
      { status: 409 },
    );
  }

  return NextResponse.json({ id: submission.id, createdAt: submission.createdAt }, { status: 201 });
}
