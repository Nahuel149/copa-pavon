import { NextResponse } from "next/server";
import { canonicalRecopaParticipant, recopaMatches, type RecopaScorePrediction } from "@/lib/recopa";
import { saveRecopaPredictions } from "@/lib/recopa-storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
    }

    const { name, pin, predictions } = body as {
      name?: unknown;
      pin?: unknown;
      predictions?: unknown;
    };

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Elegí o ingresá tu nombre de participante." }, { status: 400 });
    }

    const participantId = canonicalRecopaParticipant(name);
    if (!participantId) {
      return NextResponse.json(
        { error: "La Recopa Fiss Kahl es exclusiva para Gonza el + Fachero. y Javier. El resto de los usuarios no pueden participar." },
        { status: 403 },
      );
    }

    if (!Array.isArray(predictions)) {
      return NextResponse.json({ error: "Faltan los pronósticos de los partidos." }, { status: 400 });
    }

    const cleanPredictions: RecopaScorePrediction[] = [];
    const seenMatchIds = new Set<string>();

    for (const raw of predictions) {
      if (!raw || typeof raw !== "object") continue;
      const matchId = String(raw.matchId ?? "");
      const homeGoals = Number(raw.homeGoals);
      const awayGoals = Number(raw.awayGoals);

      if (!recopaMatches.some((m) => m.id === matchId)) continue;
      if (seenMatchIds.has(matchId)) continue;

      if (!Number.isInteger(homeGoals) || homeGoals < 0 || homeGoals > 30) {
        return NextResponse.json({ error: "Los goles tienen que ser un número entre 0 y 30." }, { status: 400 });
      }
      if (!Number.isInteger(awayGoals) || awayGoals < 0 || awayGoals > 30) {
        return NextResponse.json({ error: "Los goles tienen que ser un número entre 0 y 30." }, { status: 400 });
      }

      seenMatchIds.add(matchId);
      cleanPredictions.push({ matchId, homeGoals, awayGoals });
    }

    if (cleanPredictions.length !== recopaMatches.length) {
      return NextResponse.json(
        { error: `Tenés que completar los ${recopaMatches.length} partidos de la Recopa.` },
        { status: 400 },
      );
    }

    const pinStr = typeof pin === "string" ? pin : undefined;
    const result = await saveRecopaPredictions(participantId, cleanPredictions, pinStr);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { pinHash: _pinHash, ...safeSubmission } = result.submission;
    return NextResponse.json({
      ok: true,
      submission: safeSubmission,
      message: `¡Pronóstico de la Recopa Fiss Kahl guardado para ${participantId}!`,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al guardar el pronóstico de la Recopa." }, { status: 500 });
  }
}
