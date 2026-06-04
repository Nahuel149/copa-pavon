import { NextResponse } from "next/server";
import { validateKnockoutSubmission } from "@/lib/prode";
import { appendKnockoutPredictions, readResultStore } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ errors: ["No se pudo leer el envío."] }, { status: 400 });
  }

  const results = await readResultStore();
  const validation = validateKnockoutSubmission(
    payload as Parameters<typeof validateKnockoutSubmission>[0],
    results.knockoutFixtures,
  );

  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors.slice(0, 12) }, { status: 400 });
  }

  const saved = await appendKnockoutPredictions(validation.normalizedName, validation.predictions);
  if (!saved.ok && saved.reason === "missing-submission") {
    return NextResponse.json(
      { errors: ["Ese nombre no tiene envío de fase de grupos. Usá el mismo nombre con el que participaste."] },
      { status: 404 },
    );
  }
  if (!saved.ok && saved.reason === "duplicate-fixture") {
    return NextResponse.json(
      { errors: ["Ya hay pronósticos eliminatorios guardados para al menos uno de esos cruces."] },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
