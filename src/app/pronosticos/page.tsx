"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, Loader2, Search, Target, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { TeamBadge } from "@/app/components/TeamBadge";
import { matches, roundLabels, type Match, type MatchRound } from "@/lib/matches";
import {
  choiceLabel,
  serializePrediction,
  type MatchResult,
  type Prediction,
  type PredictionChoice,
  type ResultStore,
  type StandingRow,
  type Submission,
} from "@/lib/prode";

type PublicSubmission = Omit<Submission, "pinHash">;

type PronosticosResponse = {
  submissions: PublicSubmission[];
  standings: StandingRow[];
  results: ResultStore;
  updatedAt: string;
};

type OutcomeCount = Record<PredictionChoice, number>;

const choiceOrder: PredictionChoice[] = ["home", "draw", "away"];

function emptyOutcomeCount(): OutcomeCount {
  return { home: 0, draw: 0, away: 0 };
}

function predictionOutcome(prediction: Prediction | undefined) {
  if (!prediction) return null;
  return prediction.type === "score" ? prediction.outcome : prediction.choice;
}

function outcomeLabel(choice: PredictionChoice, match: Match) {
  return choiceLabel(choice, match.home, match.away);
}

function percent(value: number, total: number) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

function resultLabel(result: MatchResult | undefined) {
  return result ? `${result.homeGoals}-${result.awayGoals}` : "Pendiente";
}

export default function PronosticosPage() {
  const [data, setData] = useState<PronosticosResponse | null>(null);
  const [activeRound, setActiveRound] = useState<MatchRound>(1);
  const [selectedMatchId, setSelectedMatchId] = useState(matches[0].id);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  async function loadData() {
    setStatus("loading");
    const response = await fetch("/api/pronosticos", { cache: "no-store" });
    const body = (await response.json()) as PronosticosResponse;
    setData(body);
    setStatus("ready");
  }

  useEffect(() => {
    void loadData();
  }, []);

  const roundMatches = useMemo(() => matches.filter((match) => match.round === activeRound), [activeRound]);
  const selectedMatch = matches.find((match) => match.id === selectedMatchId) ?? roundMatches[0] ?? matches[0];
  const resultByMatch = useMemo(
    () => new Map((data?.results.matchResults ?? []).map((result) => [result.matchId, result])),
    [data?.results.matchResults],
  );
  const standingById = useMemo(
    () => new Map((data?.standings ?? []).map((standing) => [standing.submissionId, standing])),
    [data?.standings],
  );

  const predictionRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (data?.submissions ?? [])
      .map((submission) => {
        const prediction = submission.predictions.find((item) => item.matchId === selectedMatch.id);
        return {
          submission,
          prediction,
          standing: standingById.get(submission.id),
          label: prediction ? serializePrediction(prediction) : "Sin cargar",
          outcome: predictionOutcome(prediction),
        };
      })
      .filter((row) => !normalizedQuery || row.submission.name.toLowerCase().includes(normalizedQuery));
  }, [data?.submissions, query, selectedMatch.id, standingById]);

  const aggregates = useMemo(() => {
    const outcomes = emptyOutcomeCount();
    const scoreCounts = new Map<string, number>();

    for (const submission of data?.submissions ?? []) {
      const prediction = submission.predictions.find((item) => item.matchId === selectedMatch.id);
      const outcome = predictionOutcome(prediction);
      if (outcome) outcomes[outcome] += 1;
      if (prediction?.type === "score") {
        const score = `${prediction.homeGoals}-${prediction.awayGoals}`;
        scoreCounts.set(score, (scoreCounts.get(score) ?? 0) + 1);
      }
    }

    const topScores = [...scoreCounts.entries()]
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => b.count - a.count || a.score.localeCompare(b.score))
      .slice(0, 5);

    return { outcomes, topScores };
  }, [data?.submissions, selectedMatch.id]);

  const totalParticipants = data?.submissions.length ?? 0;
  const selectedResult = resultByMatch.get(selectedMatch.id);
  const leader = data?.standings[0];

  return (
    <div className="pageStack">
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Pronosticos</p>
          <h1>Mapa del torneo.</h1>
          <p className="heroCopy">
            Mira que eligio cada participante, compara tendencias por partido y segui como se mueve el prode con los
            resultados reales.
          </p>
        </div>
        <div className="tableRefresh">
          <span>{data?.updatedAt ? `Actualizada ${new Date(data.updatedAt).toLocaleTimeString("es-AR")}` : "Cargando..."}</span>
          <button className="primaryAction light" onClick={loadData} type="button">
            {status === "loading" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            Actualizar
          </button>
        </div>
      </section>

      <KahlImageScatter page="tabla" count={1} variant="compact" />

      <section className="metricGrid" aria-label="Resumen de pronosticos">
        <article className="metric">
          <Users size={20} aria-hidden="true" />
          <span>Participantes</span>
          <strong>{totalParticipants}</strong>
        </article>
        <article className="metric">
          <Trophy size={20} aria-hidden="true" />
          <span>Puntero actual</span>
          <strong>{leader?.name ?? "-"}</strong>
        </article>
        <article className="metric alert">
          <Target size={20} aria-hidden="true" />
          <span>Partido elegido</span>
          <strong>#{selectedMatch.order}</strong>
        </article>
      </section>

      <section className="roundStrip" aria-label="Fechas de pronosticos">
        {([1, 2, 3] as MatchRound[]).map((round) => (
          <button
            className={activeRound === round ? "roundTab active" : "roundTab"}
            key={round}
            onClick={() => {
              setActiveRound(round);
              setSelectedMatchId(matches.find((match) => match.round === round)?.id ?? selectedMatchId);
            }}
            type="button"
          >
            <span>{roundLabels[round]}</span>
            <strong>{matches.filter((match) => match.round === round).length} partidos</strong>
          </button>
        ))}
      </section>

      <section className="predictionExplorer">
        <aside className="matchPicker" aria-label="Partidos">
          {roundMatches.map((match) => (
            <button
              className={selectedMatch.id === match.id ? "matchPick active" : "matchPick"}
              key={match.id}
              onClick={() => setSelectedMatchId(match.id)}
              type="button"
            >
              <span>#{match.order} · Grupo {match.groupId}</span>
              <strong><TeamBadge compact team={match.home} /> vs <TeamBadge compact team={match.away} /></strong>
            </button>
          ))}
        </aside>

        <section className="predictionInsight">
          <div className="matchFocus">
            <span>Grupo {selectedMatch.groupId} · {selectedMatch.exactScore ? "Marcador exacto" : "1X2"}</span>
            <h2><TeamBadge team={selectedMatch.home} /> <b>vs</b> <TeamBadge team={selectedMatch.away} /></h2>
            <p>Resultado oficial: <strong>{resultLabel(selectedResult)}</strong></p>
          </div>

          <div className="pollGrid" aria-label="Porcentajes del partido">
            {choiceOrder.map((choice) => {
              const count = aggregates.outcomes[choice];
              const pct = percent(count, totalParticipants);
              return (
                <article className="pollCard" key={choice}>
                  <div>
                    <span>{outcomeLabel(choice, selectedMatch)}</span>
                    <strong>{pct}%</strong>
                  </div>
                  <i style={{ width: `${pct}%` }} />
                  <small>{count}/{totalParticipants} participantes</small>
                </article>
              );
            })}
          </div>

          <section className="scoreCloud">
            <div>
              <BarChart3 size={20} aria-hidden="true" />
              <strong>Marcadores mas repetidos</strong>
            </div>
            {aggregates.topScores.length > 0 ? (
              <ul>
                {aggregates.topScores.map((item) => (
                  <li key={item.score}><span>{item.score}</span><b>{item.count}</b></li>
                ))}
              </ul>
            ) : (
              <p>Este partido se juega por 1X2, sin marcador exacto.</p>
            )}
          </section>
        </section>
      </section>

      <section className="tableShell">
        <div className="tableNote">
          <strong>Detalle individual</strong>
          <label className="searchBox">
            <Search size={17} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar participante" />
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Participante</th>
              <th>Pronostico</th>
              <th>Resultado elegido</th>
              <th>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {predictionRows.map((row, index) => (
              <tr key={row.submission.id}>
                <td>{index + 1}</td>
                <td>{row.submission.name}</td>
                <td>{row.label}</td>
                <td>{row.outcome ? outcomeLabel(row.outcome, selectedMatch) : "-"}</td>
                <td>{row.standing?.totalPoints ?? 0}</td>
              </tr>
            ))}
            {predictionRows.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay pronosticos para mostrar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
