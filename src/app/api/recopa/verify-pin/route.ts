import { NextResponse } from "next/server";
import { canonicalRecopaParticipant, recopaParticipants } from "@/lib/recopa";
import { readRecopaStore } from "@/lib/recopa-storage";
import { findSubmissionByNormalizedName } from "@/lib/storage";
import { normalizeName } from "@/lib/prode";
import { verifyPin } from "@/lib/pin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Formato de pedido inválido." }, { status: 400 });
    }

    const { name, pin } = body as { name?: unknown; pin?: unknown };
    const nameStr = typeof name === "string" ? name.trim() : "";
    const pinStr = typeof pin === "string" ? pin.trim() : "";

    if (!nameStr) {
      return NextResponse.json({ error: "Elegí tu usuario." }, { status: 400 });
    }

    const participantId = canonicalRecopaParticipant(nameStr);
    if (!participantId) {
      return NextResponse.json(
        { error: "La Recopa Fiss Kahl es exclusiva para Gonza el + Fachero. y Javier." },
        { status: 403 },
      );
    }

    const store = await readRecopaStore();
    const existingRecopaSub = store.submissions.find((s) => s.participant === participantId);

    // Search main prode for PIN hash
    const participantDef = recopaParticipants.find((p) => p.id === participantId);
    let mainPinHash: string | undefined = undefined;

    if (participantDef) {
      for (const alias of participantDef.aliases) {
        const mainSub = await findSubmissionByNormalizedName(normalizeName(alias));
        if (mainSub?.pinHash) {
          mainPinHash = mainSub.pinHash;
          break;
        }
      }
    }

    const activePinHash = existingRecopaSub?.pinHash ?? mainPinHash;

    if (activePinHash) {
      if (!pinStr) {
        return NextResponse.json({ error: "Ingresá tu PIN para acceder." }, { status: 400 });
      }
      if (!verifyPin(pinStr, activePinHash)) {
        return NextResponse.json({ error: "PIN incorrecto. Usá el mismo PIN con el que accedés a Pronósticos." }, { status: 401 });
      }
    }

    return NextResponse.json({
      ok: true,
      participant: participantId,
      predictions: existingRecopaSub?.predictions ?? [],
      message: `¡Acceso concedido para ${participantId}!`,
    });
  } catch (error) {
    return NextResponse.json({ error: "Error al verificar el acceso." }, { status: 500 });
  }
}
