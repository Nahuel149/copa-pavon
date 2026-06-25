import { NextResponse } from "next/server";
import { createPinHash, validateParticipantPin } from "@/lib/pin";
import { appendAuditEvent, publicSubmission, updateSubmissionPinHash } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminAllowed(request: Request) {
  const requiredPin = process.env.PRODE_ADMIN_PIN;
  if (!requiredPin) return true;
  const url = new URL(request.url);
  const providedPin = request.headers.get("x-prode-admin-pin") ?? url.searchParams.get("pin");
  return providedPin === requiredPin;
}

export async function POST(request: Request) {
  if (!adminAllowed(request)) {
    return NextResponse.json({ error: "PIN invalido." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el reset de PIN." }, { status: 400 });
  }

  const normalizedName = (payload as { normalizedName?: unknown }).normalizedName;
  const nextPin = (payload as { pin?: unknown }).pin;
  if (typeof normalizedName !== "string" || normalizedName.trim().length === 0) {
    return NextResponse.json({ error: "Elegi un participante." }, { status: 400 });
  }

  const pinError = validateParticipantPin(nextPin);
  if (pinError) {
    return NextResponse.json({ error: pinError }, { status: 400 });
  }

  const submission = await updateSubmissionPinHash(normalizedName.trim(), createPinHash(String(nextPin)));
  if (!submission) {
    return NextResponse.json({ error: "No se encontro el participante." }, { status: 404 });
  }

  await appendAuditEvent({
    actor: "admin",
    type: "pin-reset",
    message: `Reseteo el PIN de ${submission.name}.`,
    meta: {
      normalizedName: submission.normalizedName,
      submissionId: submission.id,
    },
  });

  return NextResponse.json({ ok: true, submission: publicSubmission(submission) });
}
