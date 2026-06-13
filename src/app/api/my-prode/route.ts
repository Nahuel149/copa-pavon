import { NextResponse } from "next/server";
import { getEditWindow } from "@/lib/edit-deadline";
import { validateParticipantPin, verifyPin } from "@/lib/pin";
import { buildStandings, normalizeName } from "@/lib/prode";
import { findSubmissionByNormalizedName, publicSubmission, readResultStore, readSubmissionStore } from "@/lib/storage";

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
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const pinError = validateParticipantPin(pin);
  if (name.length < 2 || pinError) {
    return NextResponse.json({ errors: ["Ingresa tu nombre y PIN."] }, { status: 400 });
  }

  const submission = await findSubmissionByNormalizedName(normalizeName(name));
  if (!submission || !verifyPin(pin, submission.pinHash)) {
    return NextResponse.json({ errors: ["Nombre o PIN incorrecto."] }, { status: 401 });
  }

  const [store, results] = await Promise.all([readSubmissionStore(), readResultStore()]);
  const standings = buildStandings(store.submissions, results);
  const standing = standings.find((row) => row.submissionId === submission.id) ?? null;
  const position = standing ? standings.findIndex((row) => row.submissionId === submission.id) + 1 : null;

  return NextResponse.json({
    submission: publicSubmission(submission),
    standing,
    position,
    results,
    editWindow: getEditWindow(),
    updatedAt: new Date().toISOString(),
  });
}
