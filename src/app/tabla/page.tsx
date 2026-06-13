"use client";

import { useEffect, useMemo, useState } from "react";
import { Brackets, RefreshCw, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { readJsonResponse } from "@/lib/client-json";
import { type ClanId, type StandingRow } from "@/lib/prode";

type StandingsResponse = {
  standings: StandingRow[];
  standingsByClan: Record<ClanId, StandingRow[]>;
  history: Array<{
    label: string;
    title: string;
    positions: Array<{
      submissionId: string;
      name: string;
      clan: ClanId;
      position: number;
      points: number;
    }>;
  }>;
  playedMatches: number;
  decidedGroups: number;
  knockoutFixtures: number;
  playedKnockoutMatches: number;
  updatedAt: string;
  error?: string;
};

export default function TablaPage() {
  const [data, setData] = useState<StandingsResponse>({
    standings: [],
    standingsByClan: { "river-plate": [], "la-batata": [] },
    history: [],
    playedMatches: 0,
    decidedGroups: 0,
    knockoutFixtures: 0,
    playedKnockoutMatches: 0,
    updatedAt: "",
  });
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState("");
  const [historyLimit, setHistoryLimit] = useState(0);
  const rows = data.standingsByClan?.["river-plate"] ?? data.standings.filter((row) => row.clan === "river-plate");
  const relegationCount = rows.length > 10 ? 3 : 2;
  const fullGraphHistory = useMemo(
    () =>
      (data.history ?? []).map((entry) => ({
        ...entry,
        positions: entry.positions.filter((position) => position.clan === "river-plate"),
      })),
    [data.history],
  );
  const graphHistoryLimit = fullGraphHistory.length === 0 ? 0 : Math.min(Math.max(historyLimit || fullGraphHistory.length, 1), fullGraphHistory.length);
  const graphHistory = useMemo(
    () => fullGraphHistory.slice(0, graphHistoryLimit),
    [fullGraphHistory, graphHistoryLimit],
  );
  const selectedGraphSnapshot = graphHistory.at(-1);
  const graphRows = (selectedGraphSnapshot?.positions ?? []).slice(0, 14);
  const graphWidth = 680;
  const graphHeight = 300;
  const graphPadX = 46;
  const graphPadTop = 24;
  const graphPadBottom = 46;
  const graphInnerWidth = graphWidth - graphPadX * 2;
  const graphInnerHeight = graphHeight - graphPadTop - graphPadBottom;
  const maxPosition = Math.max(rows.length, 1);
  const positionMarkers = Array.from(new Set([1, Math.ceil(maxPosition / 2), maxPosition]));
  const graphColors = ["#f04424", "#2c6f45", "#276b8f", "#d79b30", "#111111", "#8f3d2b", "#6d6a62", "#f36f45"];
  const graphColorById = useMemo(
    () => new Map(rows.map((row, index) => [row.submissionId, graphColors[index % graphColors.length]])),
    [rows],
  );

  function colorForSubmission(submissionId: string, fallbackIndex: number) {
    return graphColorById.get(submissionId) ?? graphColors[fallbackIndex % graphColors.length];
  }

  function graphPoint(index: number, position: number) {
    const x = graphPadX + (graphHistory.length <= 1 ? 0 : (index / (graphHistory.length - 1)) * graphInnerWidth);
    const y = graphPadTop + (maxPosition <= 1 ? 0 : ((position - 1) / (maxPosition - 1)) * graphInnerHeight);
    return { x, y };
  }

  function linePoints(submissionId: string) {
    return graphHistory
      .map((entry, index) => {
        const position = entry.positions.find((item) => item.submissionId === submissionId)?.position;
        if (!position) return null;
        const point = graphPoint(index, position);
        return `${point.x},${point.y}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  async function loadStandings() {
    setStatus("loading");
    setError("");
    try {
      const response = await fetch("/api/standings", { cache: "no-store" });
      const body = await readJsonResponse<StandingsResponse>(response);
      if (!response.ok || body.error) throw new Error(body.error ?? "No se pudo actualizar la tabla.");
      setData(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo actualizar la tabla.");
    } finally {
      setStatus("ready");
    }
  }

  useEffect(() => {
    void loadStandings();
    const intervalId = window.setInterval(() => {
      void loadStandings();
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (fullGraphHistory.length === 0) return;
    setHistoryLimit((current) => {
      if (current > 0 && current <= fullGraphHistory.length) return current;
      return fullGraphHistory.length;
    });
  }, [fullGraphHistory.length]);

  return (
    <div className="pageStack">
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Tabla</p>
          <h1>Posiciones del prode.</h1>
          <p className="heroCopy">
            Puntaje acumulado por 1X2, marcadores exactos, grupos y eliminatorias. Se recalcula con los resultados
            oficiales cargados en admin.
          </p>
        </div>
        <div className="tableRefresh">
          <span>{data.updatedAt ? `Actualizada ${new Date(data.updatedAt).toLocaleTimeString("es-AR")}` : "Actualizando..."}</span>
          <button className="primaryAction light" onClick={loadStandings} type="button">
            <RefreshCw className={status === "loading" ? "spin" : ""} size={18} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </section>

      {error ? <section className="errorPanel" aria-live="polite">{error}</section> : null}

      <KahlImageScatter page="tabla" count={4} variant="compact" />

      <section className="tableShell">
        <div className="tableNote">
          <strong>Tabla</strong>
          <span>
            Los puntos se suman cada vez que existen resultados oficiales: partidos de grupo, top 2 por grupo y cruces
            de eliminatorias.
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Participante</th>
              <th>Puntos</th>
              <th>Exactos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isLeader = index === 0;
              const isRelegation = rows.length > 1 && index >= rows.length - relegationCount;
              return (
                <tr className={isLeader ? "leaderRow" : isRelegation ? "relegationRow" : ""} key={row.submissionId}>
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.totalPoints}</td>
                  <td>{row.exactHits + row.knockoutExactHits}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>La tabla aparece cuando haya envios guardados.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="metricGrid" aria-label="Estado de tabla">
        <article className="metric">
          <Users size={20} aria-hidden="true" />
          <span>Participantes</span>
          <strong>{rows.length}</strong>
        </article>
        <article className="metric">
          <Trophy size={20} aria-hidden="true" />
          <span>Partidos con resultado</span>
          <strong>{data.playedMatches}/72</strong>
        </article>
        <article className="metric alert">
          <Brackets size={20} aria-hidden="true" />
          <span>Eliminatorias con resultado</span>
          <strong>{data.playedKnockoutMatches}/{data.knockoutFixtures}</strong>
        </article>
      </section>

      <section className="raceGraph" aria-label="Evolucion de posiciones por fecha">
        <div className="tableNote">
          <div>
            <strong>Carrera por la punta</strong>
            <span>
              {selectedGraphSnapshot
                ? `Hasta ${selectedGraphSnapshot.label}: ${selectedGraphSnapshot.title}.`
                : "Cada corte suma un partido oficial cargado."}{" "}
              Cuanto mas arriba esta la linea, mejor ubicacion.
            </span>
          </div>
          {fullGraphHistory.length > 0 ? (
            <div className="raceCutSelector" role="group" aria-label="Elegir corte del grafico">
              {fullGraphHistory.map((entry, index) => (
                <button
                  className={graphHistoryLimit === index + 1 ? "active" : ""}
                  key={entry.label}
                  onClick={() => setHistoryLimit(index + 1)}
                  type="button"
                >
                  {entry.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {graphRows.length > 0 ? (
          <div className="raceGraphBody">
            <div className="raceGraphCanvas">
              <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} role="img" aria-label="Grafico de posiciones por fecha">
                <rect x="0" y="0" width={graphWidth} height={graphHeight} rx="0" />
                {positionMarkers.map((position) => {
                  const point = graphPoint(0, position);
                  return (
                    <g className="raceGridLine" key={position}>
                      <line x1={graphPadX} x2={graphWidth - graphPadX} y1={point.y} y2={point.y} />
                      <text x="16" y={point.y + 5}>
                        #{position}
                      </text>
                    </g>
                  );
                })}
                {graphHistory.map((entry, index) => {
                  const point = graphPoint(index, maxPosition);
                  return (
                    <g className="raceTurnLine" key={entry.label}>
                      <line x1={point.x} x2={point.x} y1={graphPadTop} y2={graphPadTop + graphInnerHeight} />
                      <text x={point.x} y={graphHeight - 18}>
                        {entry.label}
                      </text>
                    </g>
                  );
                })}
                {graphRows.map((row, index) => {
                  const color = colorForSubmission(row.submissionId, index);
                  const points = linePoints(row.submissionId);
                  if (!points) return null;
                  return (
                    <g className="raceLineGroup" key={row.submissionId}>
                      <polyline points={points} style={{ stroke: color }} />
                      {graphHistory.map((entry, entryIndex) => {
                        const position = entry.positions.find((item) => item.submissionId === row.submissionId)?.position;
                        if (!position) return null;
                        const point = graphPoint(entryIndex, position);
                        return <circle cx={point.x} cy={point.y} fill={color} key={`${row.submissionId}-${entry.label}`} r="4.5" />;
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
            <ol className="raceLegend" aria-label={`Posiciones hasta ${selectedGraphSnapshot?.label ?? "el corte elegido"}`}>
              {graphRows.map((row, index) => (
                <li key={row.submissionId}>
                  <i style={{ background: colorForSubmission(row.submissionId, index) }} />
                  <span>{row.position}</span>
                  <strong>{row.name}</strong>
                  <b>{row.points} pts</b>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="emptyState">El grafico aparece cuando haya participantes guardados.</div>
        )}
      </section>
    </div>
  );
}
