"use client";

import { FormEvent, useMemo, useState } from "react";
import { KeyRound, Loader2, Search, Trophy } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { readJsonResponse } from "@/lib/client-json";
import { groups, matches, matchMap } from "@/lib/matches";
import {
  serializePrediction,
  type ResultStore,
  type StandingRow,
  type Submission,
} from "@/lib/prode";

type PublicSubmission = Omit<Submission, "pinHash">;

type MyProdeResponse = {
  submission?: PublicSubmission;
  standing?: StandingRow | null;
  position?: number | null;
  results?: ResultStore;
  updatedAt?: string;
  errors?: string[];
};

export default function MiProdePage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [data, setData] = useState<MyProdeResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [errors, setErrors] = useState<string[]>([]);

  async function loadMine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrors([]);
    const response = await fetch("/api/my-prode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    const body = await readJsonResponse<MyProdeResponse>(response);
    if (!response.ok || body.errors?.length) {
      setErrors(body.errors ?? ["No se pudo abrir tu prode."]);
      setData(null);
    } else {
      setData(body);
    }
    setStatus("idle");
  }

  const pending = useMemo(() => {
    if (!data?.submission || !data.results) return { matches: 0, groups: 0, knockout: 0 };
    const played = new Set(data.results.matchResults.map((result) => result.matchId));
    const decidedGroups = new Set(data.results.groupResults.map((result) => result.groupId));
    const playedKnockout = new Set(data.results.knockoutResults.map((result) => result.fixtureId));
    return {
      matches: data.submission.predictions.filter((prediction) => !played.has(prediction.matchId)).length,
      groups: groups.filter((group) => !decidedGroups.has(group.id)).length,
      knockout: (data.submission.knockoutPredictions ?? []).filter((prediction) => !playedKnockout.has(prediction.fixtureId)).length,
    };
  }, [data]);

  return (
    <div className="pageStack">
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Mi prode</p>
          <h1>Tu detalle.</h1>
          <p className="heroCopy">Entrá con tu nombre y PIN para ver puntos, aciertos, pendientes y lo que cargaste.</p>
        </div>
        <form className="adminGate" onSubmit={loadMine}>
          <label htmlFor="myName">Nombre</label>
          <div>
            <input id="myName" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" />
            <input
              aria-label="PIN"
              inputMode="numeric"
              maxLength={10}
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="PIN"
            />
            <button className="iconSubmit" disabled={status === "loading"} type="submit" aria-label="Abrir mi prode">
              {status === "loading" ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
            </button>
          </div>
        </form>
      </section>

      {errors.length > 0 ? <section className="errorPanel">{errors.join(" ")}</section> : null}

      {data?.submission && data.standing ? (
        <>
          <section className="metricGrid" aria-label="Resumen personal">
            <article className="metric">
              <Trophy size={20} aria-hidden="true" />
              <span>Posicion</span>
              <strong>#{data.position ?? "-"}</strong>
            </article>
            <article className="metric">
              <Search size={20} aria-hidden="true" />
              <span>Puntos</span>
              <strong>{data.standing.totalPoints}</strong>
            </article>
            <article className="metric alert">
              <span>Pendientes</span>
              <strong>{pending.matches + pending.groups + pending.knockout}</strong>
            </article>
          </section>

          <section className="pointBreakdown">
            <article><span>Partidos</span><strong>{data.standing.matchPoints}</strong></article>
            <article><span>Grupos</span><strong>{data.standing.groupPoints}</strong></article>
            <article><span>Eliminatorias</span><strong>{data.standing.knockoutPoints}</strong></article>
            <article><span>Goleadores</span><strong>{data.standing.knockoutScorerHits}</strong></article>
            <article><span>Ajustes</span><strong>{data.standing.manualAdjustmentPoints}</strong></article>
          </section>

          <section className="predictionBoard">
            <div className="sectionHeader">
              <p className="eyebrow">Pronosticos cargados</p>
              <h2>{data.submission.name}</h2>
            </div>
            <div className="predictionGrid">
              {data.submission.predictions.map((prediction) => {
                const match = matchMap.get(prediction.matchId);
                if (!match) return null;
                const closed = data.results?.matchResults.some((result) => result.matchId === match.id);
                return (
                  <article className="predictionCell" data-tone={prediction.type === "score" ? "score" : prediction.choice} key={prediction.matchId}>
                    <span>#{match.order} · {closed ? "Cerrado" : "Editable"}</span>
                    <strong><TeamBadge team={match.home} /> <span>vs.</span> <TeamBadge team={match.away} /></strong>
                    <b>{serializePrediction(prediction)}</b>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
