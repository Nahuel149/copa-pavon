import { NextResponse } from "next/server";
import { getEditWindow } from "@/lib/edit-deadline";
import { matchMap } from "@/lib/matches";
import { validateParticipantPin, verifyPin } from "@/lib/pin";
import { normalizeName, serializePrediction, validateSubmission, type GroupPrediction, type Prediction } from "@/lib/prode";
import { findSubmissionByNormalizedName, publicSubmission, updateSubmissionPredictions } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readCredentials(payload: { name?: unknown; pin?: unknown }) {
  const name = typeof payload.name === "string" ? payload.name.trim().replace(/\s+/g, " ") : "";
  const pin = typeof payload.pin === "string" ? payload.pin.trim() : "";
  return { name, pin, normalizedName: normalizeName(name) };
}

async function authorize(payload: { name?: unknown; pin?: unknown }) {
  const { name, pin, normalizedName } = readCredentials(payload);
  const pinError = validateParticipantPin(pin);
  if (name.length < 2 || pinError) {
    return { ok: false as const, status: 400, errors: ["Ingresa tu nombre y PIN."] };
  }
  const submission = await findSubmissionByNormalizedName(normalizedName);
  if (!submission) {
    return { ok: false as const, status: 404, errors: ["No encontramos un pronostico con ese nombre."] };
  }
  if (!verifyPin(pin, submission.pinHash)) {
    return { ok: false as const, status: 401, errors: ["Nombre o PIN incorrecto."] };
  }
  return { ok: true as const, submission };
}

function groupPredictionKey(prediction: GroupPrediction) {
  return `${prediction.groupId}:${prediction.first}:${prediction.second}`;
}

function changedLockedPredictions(
  originalPredictions: Prediction[],
  nextPredictions: Prediction[],
  originalGroupPredictions: GroupPrediction[],
  nextGroupPredictions: GroupPrediction[],
  editWindow: ReturnType<typeof getEditWindow>,
) {
  const errors: string[] = [];
  const originalByMatch = new Map(originalPredictions.map((prediction) => [prediction.matchId, prediction]));

  for (const prediction of nextPredictions) {
    const match = matchMap.get(prediction.matchId);
    if (!match || editWindow.rounds[match.round].open) continue;
    const original = originalByMatch.get(prediction.matchId);
    if (!original || serializePrediction(original) !== serializePrediction(prediction)) {
      errors.push(`La Fecha ${match.round} ya cerro y no se puede modificar.`);
      break;
    }
  }

  if (!editWindow.rounds[1].open) {
    const originalGroups = originalGroupPredictions.map(groupPredictionKey).sort().join("|");
    const nextGroups = nextGroupPredictions.map(groupPredictionKey).sort().join("|");
    if (originalGroups !== nextGroups) {
      errors.push("Los pronosticos de grupos ya cerraron con el inicio de la Fecha 1.");
    }
  }

  return errors;
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer el pedido."] }, { status: 400 });
  }

  const auth = await authorize((payload ?? {}) as { name?: unknown; pin?: unknown });
  if (!auth.ok) {
    return NextResponse.json({ errors: auth.errors }, { status: auth.status });
  }

  return NextResponse.json({ submission: publicSubmission(auth.submission), editWindow: getEditWindow() });
}

export async function PUT(request: Request) {
  const editWindow = getEditWindow();
  if (!editWindow.open) {
    return NextResponse.json({ errors: ["Ya cerraron todas las fechas de edicion disponibles."], editWindow }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer la edicion."] }, { status: 400 });
  }

  const body = (payload ?? {}) as { name?: unknown; pin?: unknown };
  const auth = await authorize(body);
  if (!auth.ok) {
    return NextResponse.json({ errors: auth.errors }, { status: auth.status });
  }

  const result = validateSubmission(payload as Parameters<typeof validateSubmission>[0]);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors.slice(0, 12) }, { status: 400 });
  }

  const lockedErrors = changedLockedPredictions(
    auth.submission.predictions,
    result.predictions,
    auth.submission.groupPredictions ?? [],
    result.groupPredictions,
    editWindow,
  );
  if (lockedErrors.length > 0) {
    return NextResponse.json({ errors: lockedErrors, editWindow }, { status: 403 });
  }

  const payloadHasClan = Object.prototype.hasOwnProperty.call(payload as object, "clan");
  const saved = await updateSubmissionPredictions({
    ...auth.submission,
    name: result.name,
    normalizedName: auth.submission.normalizedName,
    clan: payloadHasClan ? result.clan : auth.submission.clan,
    predictions: result.predictions,
    groupPredictions: result.groupPredictions,
  });
  if (!saved.ok) {
    return NextResponse.json({ errors: ["No se pudo actualizar el pronostico."] }, { status: 404 });
  }

  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt, editWindow });
}
