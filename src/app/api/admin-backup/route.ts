import { NextResponse } from "next/server";
import { appendAuditEvent, readAppSettings, readAuditEvents, readResultStore, readSubmissionStore } from "@/lib/storage";

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
    return NextResponse.json({ error: "PIN invalido." }, { status: 401 });
  }

  const [submissionStore, results, settings, audit] = await Promise.all([
    readSubmissionStore(),
    readResultStore(),
    readAppSettings(),
    readAuditEvents(300),
  ]);

  await appendAuditEvent({
    actor: "admin",
    type: "backup",
    message: "Descargo backup JSON completo.",
    meta: { submissions: submissionStore.submissions.length },
  });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    settings,
    results,
    submissions: submissionStore.submissions,
    audit,
  });
}
