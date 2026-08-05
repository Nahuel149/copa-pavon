import { NextResponse } from "next/server";
import { recopaMatches, type RecopaMatchResult } from "@/lib/recopa";
import { saveRecopaResults } from "@/lib/recopa-storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || !Array.isArray(body.results)) {
      return NextResponse.json({ error: "Formato de resultados inválido." }, { status: 400 });
    }

    const cleanResults: RecopaMatchResult[] = [];
    for (const raw of body.results) {
      if (!raw || typeof raw !== "object") continue;
      const matchId = String(raw.matchId ?? "");
      const homeGoals = Number(raw.homeGoals);
      const awayGoals = Number(raw.awayGoals);

      if (!recopaMatches.some((m) => m.id === matchId)) continue;

      if (Number.isInteger(homeGoals) && Number.isInteger(awayGoals) && homeGoals >= 0 && awayGoals >= 0) {
        cleanResults.push({ matchId, homeGoals, awayGoals });
      }
    }

    const saveRes = await saveRecopaResults(cleanResults);
    if (!saveRes.ok) {
      return NextResponse.json({ error: saveRes.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      results: saveRes.results,
      message: "Resultados oficiales de la Recopa actualizados.",
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar resultados de la Recopa." }, { status: 500 });
  }
}
