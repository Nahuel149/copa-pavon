import { NextResponse } from "next/server";
import { recopaMatches, type RecopaMatchResult } from "@/lib/recopa";
import { saveRecopaResults } from "@/lib/recopa-storage";

function adminAllowed(request: Request, bodyPin?: string) {
  const requiredPin = process.env.PRODE_ADMIN_PIN;
  if (!requiredPin) return true;
  const url = new URL(request.url);
  const providedPin = request.headers.get("x-prode-admin-pin") ?? url.searchParams.get("pin") ?? bodyPin;
  return providedPin === requiredPin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !Array.isArray(body.results)) {
      return NextResponse.json({ error: "Formato de resultados inválido." }, { status: 400 });
    }

    const pin = typeof body.pin === "string" ? body.pin : undefined;
    if (!adminAllowed(request, pin)) {
      return NextResponse.json({ error: "PIN de administrador incorrecto para guardar resultados oficiales." }, { status: 401 });
    }

    const cleanResults: RecopaMatchResult[] = [];
    for (const raw of body.results) {
      if (!raw || typeof raw !== "object") continue;
      const matchId = String(raw.matchId ?? "");
      const homeGoals = Number(raw.homeGoals);
      const awayGoals = Number(raw.awayGoals);

      if (!recopaMatches.some((m) => m.id === matchId)) continue;

      if (Number.isInteger(homeGoals) && Number.isInteger(awayGoals) && homeGoals >= 0 && awayGoals >= 0) {
        const scorerNamesRaw = Array.isArray(raw.scorerNames)
          ? raw.scorerNames.map((s: unknown) => String(s).trim()).filter(Boolean)
          : typeof raw.scorerNames === "string"
          ? raw.scorerNames.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];

        cleanResults.push({
          matchId,
          homeGoals,
          awayGoals,
          ...(scorerNamesRaw.length > 0 ? { scorerNames: scorerNamesRaw } : {}),
        });
      }
    }

    const saveRes = await saveRecopaResults(cleanResults);
    if (!saveRes.ok) {
      return NextResponse.json({ error: saveRes.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      results: saveRes.results,
      message: "Resultados oficiales de la Recopa actualizados correctamente.",
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar resultados de la Recopa." }, { status: 500 });
  }
}
