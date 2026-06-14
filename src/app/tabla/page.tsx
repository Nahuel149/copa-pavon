"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  const [hiddenGraphIds, setHiddenGraphIds] = useState<string[]>([]);
  const [graphDisplayLimit, setGraphDisplayLimit] = useState(0);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
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
  const movementBaseSnapshot = fullGraphHistory.length > 1 ? fullGraphHistory.at(-2) : undefined;
  const movementBaseLabel = movementBaseSnapshot ? `Cambios vs partido anterior (${movementBaseSnapshot.label})` : "Cambios desde el partido anterior";
  const effectiveGraphDisplayLimit = graphDisplayLimit > 0 ? graphDisplayLimit : rows.length;
  const graphRows = (selectedGraphSnapshot?.positions ?? []).slice(0, effectiveGraphDisplayLimit);
  const visibleGraphRows = graphRows.filter((row) => !hiddenGraphIds.includes(row.submissionId));
  const movementById = useMemo(() => {
    const previousPositions = new Map((movementBaseSnapshot?.positions ?? []).map((row) => [row.submissionId, row.position]));
    return new Map(
      rows.map((row, index) => {
        const previous = previousPositions.get(row.submissionId);
        const current = index + 1;
        return [row.submissionId, typeof previous === "number" ? previous - current : 0];
      }),
    );
  }, [movementBaseSnapshot?.positions, rows]);
  const graphWidth = 680;
  const graphHeight = 300;
  const graphPadX = 46;
  const graphPadTop = 24;
  const graphPadBottom = 46;
  const graphInnerWidth = graphWidth - graphPadX * 2;
  const graphInnerHeight = graphHeight - graphPadTop - graphPadBottom;
  const maxPosition = Math.max(rows.length, 1);
  const positionMarkers = Array.from(new Set([1, Math.ceil(maxPosition / 2), maxPosition]));
  const graphColors = [
    "#f04424",
    "#2c6f45",
    "#276b8f",
    "#d79b30",
    "#111111",
    "#8f3d2b",
    "#6d6a62",
    "#005f73",
    "#9b2226",
    "#6a4c93",
    "#0a9396",
    "#ca6702",
    "#3a86ff",
    "#7f5539",
    "#ff4d6d",
    "#00b4d8",
  ];
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

  function toggleGraphParticipant(submissionId: string) {
    setHiddenGraphIds((current) =>
      current.includes(submissionId) ? current.filter((id) => id !== submissionId) : [...current, submissionId],
    );
  }

  function movementLabel(submissionId: string) {
    const movement = movementById.get(submissionId) ?? 0;
    if (movement > 0) return `+${movement}`;
    if (movement < 0) return `${movement}`;
    return "=";
  }

  function movementClass(submissionId: string) {
    const movement = movementById.get(submissionId) ?? 0;
    if (movement > 0) return "movement up";
    if (movement < 0) return "movement down";
    return "movement same";
  }

  function pointDetailCards(row: StandingRow) {
    const matchPending = Math.max(data.playedMatches - row.exactHits - row.winnerHits, 0);
    return [
      {
        label: "Aciertos partidos de grupo",
        value: row.matchPoints,
        help: "Puntos por partidos de fase de grupos.",
        meta: `${row.exactHits} exactos · ${row.winnerHits} ganador/empate · ${matchPending} sin punto`,
      },
      {
        label: "Aciertos ganadores de grupos",
        value: row.groupPoints,
        help: "Bonus por acertar los dos clasificados de cada grupo.",
        meta: `${row.groupHits} grupos acertados · ${data.decidedGroups} grupos definidos`,
      },
      {
        label: "Aciertos en eliminatorias",
        value: row.knockoutPoints,
        help: "Incluye exactos, clasificados y bonus de goleador.",
        meta: `${row.knockoutExactHits} exactos · ${row.knockoutScorerHits} goleadores · ${row.playedKnockoutMatches} jugados`,
      },
      {
        label: "Aciertos en goleadores",
        value: row.knockoutScorerHits,
        help: "+1 si acierta un goleador o deja vacio y sale 0-0.",
        meta: row.playedKnockoutMatches > 0 ? `${row.knockoutScorerHits}/${row.playedKnockoutMatches} aciertos` : "Arranca en eliminatorias",
      },
    ];
  }

  const awards = useMemo(() => {
    if (rows.length === 0) return [];
    const exactLeader = [...rows].sort(
      (a, b) => b.exactHits + b.knockoutExactHits - (a.exactHits + a.knockoutExactHits) || a.name.localeCompare(b.name, "es"),
    )[0];
    const exactLeaderHits = exactLeader.exactHits + exactLeader.knockoutExactHits;
    const biggestRise = [...rows]
      .map((row) => ({ row, movement: movementById.get(row.submissionId) ?? 0 }))
      .sort((a, b) => b.movement - a.movement || a.row.name.localeCompare(b.row.name, "es"))[0];
    const last = rows.at(-1);
    const batacazo = biggestRise?.movement > 0 ? biggestRise : null;
    return [
      { label: "Puntero", value: rows[0].name, detail: `${rows[0].totalPoints} pts` },
      { label: "Mas exactos", value: exactLeaderHits > 0 ? exactLeader.name : "Pendiente", detail: `${exactLeaderHits} exactos` },
      { label: "Racha positiva", value: biggestRise?.movement > 0 ? biggestRise.row.name : "Sin cambios", detail: biggestRise?.movement > 0 ? `Subio ${biggestRise.movement}` : "=" },
      { label: "Ultimo de la B", value: last?.name ?? "-", detail: `${last?.totalPoints ?? 0} pts` },
      { label: "Pego el batacazo", value: batacazo?.row.name ?? "Pendiente", detail: batacazo ? `+${batacazo.movement} puestos` : "Sin salto fuerte" },
    ];
  }, [movementById, rows]);

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

  useEffect(() => {
    const validIds = new Set(rows.map((row) => row.submissionId));
    setHiddenGraphIds((current) => current.filter((id) => validIds.has(id)));
  }, [rows]);

  return (
    <div className="pageStack">
      <section className="heroBand tableHero standingsHero">
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
            de eliminatorias. {movementBaseLabel}.
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
                <Fragment key={row.submissionId}>
                  <tr className={isLeader ? "leaderRow" : isRelegation ? "relegationRow" : ""}>
                    <td>
                      <span className="positionCell">
                        <b>{index + 1}</b>
                        <span className={movementClass(row.submissionId)}>{movementLabel(row.submissionId)}</span>
                      </span>
                    </td>
                    <td>
                      <button className="tableButton inlineButton" onClick={() => setExpandedPlayerId(expandedPlayerId === row.submissionId ? null : row.submissionId)} type="button">
                        {row.name}
                      </button>
                    </td>
                    <td>{row.totalPoints}</td>
                    <td>{row.exactHits + row.knockoutExactHits}</td>
                  </tr>
                  {expandedPlayerId === row.submissionId ? (
                    <tr className="detailRow">
                      <td colSpan={4}>
                        <div className="playerPointPanel">
                          <div className="playerPointSummary">
                            <div>
                              <span>Detalle de puntos</span>
                              <strong>{row.name}</strong>
                            </div>
                            <div>
                              <span>Total</span>
                              <strong>{row.totalPoints}</strong>
                            </div>
                          </div>
                          <div className="pointBreakdown compact">
                            {pointDetailCards(row).map((card) => (
                              <article key={card.label}>
                                <div>
                                  <span>{card.label}</span>
                                  <strong>{card.value}</strong>
                                </div>
                                <p>{card.help}</p>
                                <small>{card.meta}</small>
                              </article>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
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
          {fullGraphHistory.length > 0 ? (
            <div className="raceQuickFilters" aria-label="Filtros del grafico">
              <button
                className={graphDisplayLimit === 5 ? "active" : ""}
                onClick={() => {
                  setGraphDisplayLimit(5);
                  setHiddenGraphIds([]);
                }}
                type="button"
              >
                Top 5
              </button>
              <button
                className={graphDisplayLimit === 0 ? "active" : ""}
                onClick={() => {
                  setGraphDisplayLimit(0);
                  setHiddenGraphIds([]);
                }}
                type="button"
              >
                Ver todos
              </button>
              <button className="light" onClick={() => setHiddenGraphIds([])} type="button">
                Limpiar seleccion
              </button>
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
                {visibleGraphRows.map((row, index) => {
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
                        const snapshotRow = entry.positions.find((item) => item.submissionId === row.submissionId);
                        return (
                          <circle cx={point.x} cy={point.y} fill={color} key={`${row.submissionId}-${entry.label}`} r="4.5">
                            <title>{`${row.name} · ${entry.label}: #${position}, ${snapshotRow?.points ?? 0} pts`}</title>
                          </circle>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
            <ol className="raceLegend" aria-label={`Posiciones hasta ${selectedGraphSnapshot?.label ?? "el corte elegido"}`}>
              {graphRows.map((row, index) => (
                <li className={hiddenGraphIds.includes(row.submissionId) ? "muted" : ""} key={row.submissionId}>
                  <button
                    aria-pressed={!hiddenGraphIds.includes(row.submissionId)}
                    onClick={() => toggleGraphParticipant(row.submissionId)}
                    type="button"
                  >
                    <i style={{ background: colorForSubmission(row.submissionId, index) }} />
                  <span>{row.position}</span>
                  <strong>{row.name}</strong>
                  <b>{row.points} pts</b>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="emptyState">El grafico aparece cuando haya participantes guardados.</div>
        )}
      </section>

      {awards.length > 0 ? (
        <section className="awardsPanel" aria-label="Premios de la fecha">
          <div className="tableNote">
            <strong>Premios de la fecha</strong>
            <span>Badges automaticos, sutiles y recalculados con la tabla actual.</span>
          </div>
          <div className="awardGrid">
            {awards.map((award) => (
              <article className="awardPill" key={award.label}>
                <span>{award.label}</span>
                <strong>{award.value}</strong>
                <small>{award.detail}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
