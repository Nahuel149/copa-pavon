import { NextResponse } from "next/server";
import { appendAuditEvent, deleteSubmissionById } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const requiredPin = process.env.PRODE_ADMIN_PIN;
  if (!requiredPin || request.headers.get("x-prode-admin-pin") !== requiredPin) {
    return NextResponse.json({ error: "PIN de administrador inválido." }, { status: 401 });
  }
  const payload = await request.json().catch(() => null);
  if (typeof payload?.submissionId !== "string" || !payload.submissionId.trim()) {
    return NextResponse.json({ error: "Elegí un participante." }, { status: 400 });
  }
  const submission = await deleteSubmissionById(payload.submissionId);
  if (!submission) {
    return NextResponse.json({ error: "No se encontró el participante." }, { status: 404 });
  }
  await appendAuditEvent({ actor: "admin", type: "participant-deleted", message: `Eliminó a ${submission.name} y sus pronósticos.`, meta: { submissionId: submission.id, normalizedName: submission.normalizedName } });
  return NextResponse.json({ ok: true });
}
