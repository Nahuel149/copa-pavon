import { NextResponse } from "next/server";
import { getEditWindow } from "@/lib/edit-deadline";
import { validateParticipantPin, verifyPin } from "@/lib/pin";
import { normalizeName, validateSubmission } from "@/lib/prode";
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
    return { ok: false as const, status: 400, errors: ["Ingresá tu nombre y PIN."] };
  }
  const submission = await findSubmissionByNormalizedName(normalizedName);
  if (!submission) {
    return { ok: false as const, status: 404, errors: ["No encontramos un pronóstico con ese nombre."] };
  }
  if (!verifyPin(pin, submission.pinHash)) {
    return { ok: false as const, status: 401, errors: ["Nombre o PIN incorrecto."] };
  }
  return { ok: true as const, submission };
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
    return NextResponse.json({ errors: ["La fecha límite de edición ya cerró."], editWindow }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer la edición."] }, { status: 400 });
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

  const saved = await updateSubmissionPredictions({
    ...auth.submission,
    name: result.name,
    normalizedName: auth.submission.normalizedName,
    clan: result.clan,
    predictions: result.predictions,
    groupPredictions: result.groupPredictions,
  });
  if (!saved.ok) {
    return NextResponse.json({ errors: ["No se pudo actualizar el pronóstico."] }, { status: 404 });
  }

  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt, editWindow });
}
