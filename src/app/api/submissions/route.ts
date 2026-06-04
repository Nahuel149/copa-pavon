import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { appendSubmission, readSubmissionStore } from "@/lib/storage";
import { validateSubmission } from "@/lib/prode";

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
    submissions: store.submissions.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
  });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer el envío."] }, { status: 400 });
  }

  const result = validateSubmission(payload as Parameters<typeof validateSubmission>[0]);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors.slice(0, 12) }, { status: 400 });
  }

  const submission = {
    id: randomUUID(),
    name: result.name,
    normalizedName: result.normalizedName,
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
