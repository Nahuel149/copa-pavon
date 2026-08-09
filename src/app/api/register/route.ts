import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createPinHash, validateParticipantPin } from "@/lib/pin";
import { normalizeName } from "@/lib/prode";
import { appendSubmission, findSubmissionByNormalizedName } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer el pedido."] }, { status: 400 });
  }

  const body = (payload ?? {}) as { name?: unknown; pin?: unknown };
  const rawName = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";

  if (rawName.length < 2) {
    return NextResponse.json({ errors: ["El nombre tiene que tener al menos 2 caracteres."] }, { status: 400 });
  }

  const pinError = validateParticipantPin(pin);
  if (pinError) {
    return NextResponse.json({ errors: [pinError] }, { status: 400 });
  }

  const normalized = normalizeName(rawName);
  const existing = await findSubmissionByNormalizedName(normalized);
  if (existing) {
    return NextResponse.json(
      { errors: ["Ya existe un participante con ese nombre. Si sos vos, entrá con tu PIN en Editar Prode."] },
      { status: 409 },
    );
  }

  const submission = {
    id: randomUUID(),
    name: rawName,
    normalizedName: normalized,
    clan: "river-plate" as const,
    pinHash: createPinHash(pin),
    createdAt: new Date().toISOString(),
    predictions: [],
    groupPredictions: [],
    knockoutPredictions: [],
  };

  const saved = await appendSubmission(submission);
  if (!saved.ok && saved.reason === "duplicate-name") {
    return NextResponse.json(
      { errors: ["Ya existe un participante con ese nombre."] },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, name: rawName, createdAt: submission.createdAt }, { status: 201 });
}
