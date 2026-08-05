"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, ChevronRight, Clock, Flame, Loader2, Lock, LogIn, LogOut, Save, ShieldAlert, Swords, Trophy, UserCheck } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { readJsonResponse } from "@/lib/client-json";
import {
  isRecopaEditOpen,
  recopaMatches,
  recopaParticipants,
  type RecopaMatch,
  type RecopaMatchResult,
  type RecopaParticipantId,
  type RecopaScorePrediction,
  type RecopaStanding,
} from "@/lib/recopa";

type RecopaApiResponse = {
  matches: RecopaMatch[];
  participants: typeof recopaParticipants;
  submissions: Array<{
    participant: RecopaParticipantId;
    predictions: RecopaScorePrediction[];
    updatedAt: string;
  }>;
  results: RecopaMatchResult[];
  standings: RecopaStanding[];
  editDeadline?: string;
  editDeadlineLabel?: string;
  isOpen?: boolean;
  error?: string;
};

export default function RecopaPage() {
  const [activeTab, setActiveTab] = useState<"tabla" | "cargar" | "resultados">("tabla");
  const [data, setData] = useState<RecopaApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Submit prediction state
  const [selectedParticipant, setSelectedParticipant] = useState<RecopaParticipantId>("Gonza el + Fachero.");
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [predictions, setPredictions] = useState<Record<string, { homeGoals: string; awayGoals: string; goalScorer: string }>>(() =>
    recopaMatches.reduce((acc, m) => {
      acc[m.id] = { homeGoals: "", awayGoals: "", goalScorer: "" };
      return acc;
    }, {} as Record<string, { homeGoals: string; awayGoals: string; goalScorer: string }>),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin results state
  const [resultsDraft, setResultsDraft] = useState<Record<string, { homeGoals: string; awayGoals: string; scorerNames: string }>>(() =>
    recopaMatches.reduce((acc, m) => {
      acc[m.id] = { homeGoals: "", awayGoals: "", scorerNames: "" };
      return acc;
    }, {} as Record<string, { homeGoals: string; awayGoals: string; scorerNames: string }>),
  );
  const [savingResults, setSavingResults] = useState(false);
  const [resultsMessage, setResultsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadRecopaData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recopa", { cache: "no-store" });
      const body = await readJsonResponse<RecopaApiResponse>(res);
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "No se pudieron cargar los datos de la Recopa.");
      }
      setData(body);

      // Populate results draft
      if (body.results) {
        setResultsDraft((prev) => {
          const next = { ...prev };
          for (const r of body.results) {
            next[r.matchId] = {
              homeGoals: String(r.homeGoals),
              awayGoals: String(r.awayGoals),
              scorerNames: r.scorerNames ? r.scorerNames.join(", ") : "",
            };
          }
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con la Recopa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecopaData();
  }, []);

  async function handleVerifyAccess(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError("");
    setSubmitMessage(null);

    try {
      const res = await fetch("/api/recopa/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedParticipant, pin }),
      });

      const body = await readJsonResponse<{
        ok?: boolean;
        predictions?: RecopaScorePrediction[];
        error?: string;
      }>(res);

      if (!res.ok || !body.ok || body.error) {
        throw new Error(body.error ?? "No se pudo acceder. Verificá tu nombre y PIN.");
      }

      // Populate predictions for the verified participant
      const draft = recopaMatches.reduce((acc, m) => {
        const pred = body.predictions?.find((p) => p.matchId === m.id);
        acc[m.id] = {
          homeGoals: pred ? String(pred.homeGoals) : "",
          awayGoals: pred ? String(pred.awayGoals) : "",
          goalScorer: pred?.goalScorer ?? "",
        };
        return acc;
      }, {} as Record<string, { homeGoals: string; awayGoals: string; goalScorer: string }>);

      setPredictions(draft);
      setIsUnlocked(true);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Error al acceder.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmitPredictions(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);

    const formattedPredictions = recopaMatches.map((m) => ({
      matchId: m.id,
      homeGoals: Number(predictions[m.id]?.homeGoals ?? 0),
      awayGoals: Number(predictions[m.id]?.awayGoals ?? 0),
      goalScorer: predictions[m.id]?.goalScorer?.trim() || undefined,
    }));

    try {
      const res = await fetch("/api/recopa/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedParticipant,
          pin,
          predictions: formattedPredictions,
        }),
      });

      const body = await readJsonResponse<{ message?: string; error?: string }>(res);
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "No se pudieron guardar los pronósticos.");
      }

      setSubmitMessage({ type: "success", text: body.message ?? "¡Pronóstico de la Recopa guardado con éxito!" });
      void loadRecopaData();
    } catch (err) {
      setSubmitMessage({ type: "error", text: err instanceof Error ? err.message : "Error al guardar el pronóstico." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveResults(e: React.FormEvent) {
    e.preventDefault();
    setSavingResults(true);
    setResultsMessage(null);

    const formattedResults = recopaMatches
      .filter((m) => resultsDraft[m.id]?.homeGoals !== "" && resultsDraft[m.id]?.awayGoals !== "")
      .map((m) => ({
        matchId: m.id,
        homeGoals: Number(resultsDraft[m.id].homeGoals),
        awayGoals: Number(resultsDraft[m.id].awayGoals),
        scorerNames: resultsDraft[m.id].scorerNames.trim()
          ? resultsDraft[m.id].scorerNames.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      }));

    try {
      const res = await fetch("/api/recopa/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: formattedResults }),
      });

      const body = await readJsonResponse<{ message?: string; error?: string }>(res);
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "Error al guardar resultados.");
      }

      setResultsMessage({ type: "success", text: body.message ?? "Resultados oficiales actualizados correctamente." });
      void loadRecopaData();
    } catch (err) {
      setResultsMessage({ type: "error", text: err instanceof Error ? err.message : "Error al guardar resultados." });
    } finally {
      setSavingResults(false);
    }
  }

  const gonzaStanding = data?.standings.find((s) => s.participant.id === "Gonza el + Fachero.");
  const javiStanding = data?.standings.find((s) => s.participant.id === "Javier");
  const isEditOpen = data?.isOpen ?? isRecopaEditOpen();

  return (
    <div className="pageStack">
      {/* Hero Header */}
      <section className="heroBand recopaHero">
        <div>
          <p className="eyebrow recopaEyebrow">
            <Swords size={14} aria-hidden="true" />
            Recopa Fiss Kahl
          </p>
          <h1>El Gran Duelo de Campeones.</h1>
          <p className="heroCopy">
            Copa exclusiva cara a cara entre <strong>Gonza el + Fachero.</strong> (Campeón Copa Chiqui Bauch) y <strong>Javier</strong> (Campeón Copa Fiss).
          </p>
        </div>

        {/* Head-to-Head Banner */}
        <div className="recopaVsContainer">
          <div className={`recopaCard ${gonzaStanding && javiStanding && gonzaStanding.totalPoints > javiStanding.totalPoints ? "leader" : ""}`}>
            <img src="/kahl-assets/campeon-gonza-fiss.jpeg" alt="Gonza el + Fachero." className="recopaAvatar" />
            <div className="recopaParticipantInfo">
              <p className="recopaRole">Campeón Chiqui Bauch</p>
              <h3>Gonza el + Fachero.</h3>
              <div className="recopaBadge">
                <span>{gonzaStanding?.totalPoints ?? 0}</span> <small>pts</small>
              </div>
            </div>
          </div>

          <div className="recopaVsBadge">
            <Flame size={24} className="flameIcon" aria-hidden="true" />
            <span>VS</span>
          </div>

          <div className={`recopaCard ${gonzaStanding && javiStanding && javiStanding.totalPoints > gonzaStanding.totalPoints ? "leader" : ""}`}>
            <img src="/kahl-assets/campeon-javi.jpeg" alt="Javier" className="recopaAvatar" />
            <div className="recopaParticipantInfo">
              <p className="recopaRole">Campeón Copa Fiss</p>
              <h3>Javier</h3>
              <div className="recopaBadge">
                <span>{javiStanding?.totalPoints ?? 0}</span> <small>pts</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rules Notice */}
      <section className="recopaNotice">
        <ShieldAlert size={20} className="noticeIcon" aria-hidden="true" />
        <div>
          <strong>Reglamento de Puntaje Recopa Fiss Kahl</strong>
          <p>
            • <strong>3 puntos</strong> por acertar el resultado exacto. <br />
            • <strong>1 punto</strong> por acertar el ganador o empate (no exacto). <br />
            • <strong>1 punto extra</strong> por acertar cualquier goleador del partido.
          </p>
        </div>
      </section>

      {/* Deadline Notice */}
      <section className={`recopaNotice ${isEditOpen ? "" : "closedNotice"}`} style={{ marginTop: "10px", borderColor: isEditOpen ? "#0284c7" : "#ef4444", background: isEditOpen ? "#f0f9ff" : "#fef2f2" }}>
        <Clock size={20} className="noticeIcon" style={{ color: isEditOpen ? "#0284c7" : "#dc2626" }} aria-hidden="true" />
        <div>
          <strong style={{ color: isEditOpen ? "#0369a1" : "#991b1b" }}>
            {isEditOpen ? "⏱️ Plazo Límite de Edición de Pronósticos" : "🔒 Pronósticos Cerrados"}
          </strong>
          <p style={{ color: isEditOpen ? "#0c4a6e" : "#7f1d1d" }}>
            {isEditOpen ? (
              <>
                Los pronósticos están abiertos hasta el <strong>Sábado 8 de Agosto a las 14:00 hs (hora Argentina)</strong>, hora del comienzo de Atlético Tucumán vs Sarmiento. Luego de ese horario no se podrán editar.
              </>
            ) : (
              <>
                El plazo para cargar y modificar pronósticos venció el <strong>Sábado 8 de Agosto a las 14:00 hs</strong>. La edición se encuentra bloqueada.
              </>
            )}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <nav className="recopaNavTabs" aria-label="Secciones de Recopa">
        <button
          className={activeTab === "tabla" ? "tabItem active" : "tabItem"}
          onClick={() => setActiveTab("tabla")}
          type="button"
        >
          <Trophy size={18} aria-hidden="true" />
          <span>Enfrentamiento & Tabla</span>
        </button>
        <button
          className={activeTab === "cargar" ? "tabItem active" : "tabItem"}
          onClick={() => setActiveTab("cargar")}
          type="button"
        >
          <UserCheck size={18} aria-hidden="true" />
          <span>Cargar / Editar Pronóstico</span>
        </button>
        <button
          className={activeTab === "resultados" ? "tabItem active" : "tabItem"}
          onClick={() => setActiveTab("resultados")}
          type="button"
        >
          <Save size={18} aria-hidden="true" />
          <span>Cargar Resultados Oficiales</span>
        </button>
      </nav>

      {/* Content Sections */}
      {loading ? (
        <div className="loadingState">
          <Loader2 className="spin" size={32} />
          <p>Cargando datos de la Recopa Fiss Kahl...</p>
        </div>
      ) : error ? (
        <div className="errorState">
          <ShieldAlert size={32} />
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ENFRENTAMIENTO & TABLA */}
          {activeTab === "tabla" && (
            <div className="tabContentStack">
              {/* Standings Summary Table */}
              <section className="standingPanel">
                <div className="panelHeader">
                  <p className="eyebrow">Posiciones</p>
                  <h2>Tabla Recopa Fiss Kahl</h2>
                </div>

                <div className="tableWrapper">
                  <table className="recopaTable">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Participante</th>
                        <th>Copa Previa</th>
                        <th>Puntos</th>
                        <th>Exactos (+3)</th>
                        <th>Ganadores (+1)</th>
                        <th>Goleadores (+1)</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.standings
                        .slice()
                        .sort((a, b) => b.totalPoints - a.totalPoints || b.exactHits - a.exactHits)
                        .map((standing, index) => {
                          const isLeader = index === 0 && standing.totalPoints > 0;
                          return (
                            <tr key={standing.participant.id} className={isLeader ? "leaderRow" : ""}>
                              <td className="posCell">
                                {isLeader ? <Trophy size={18} className="goldTrophy" /> : index + 1}
                              </td>
                              <td className="participantCell">
                                <img src={standing.participant.image} alt="" className="miniAvatar" />
                                <strong>{standing.participant.fullName}</strong>
                              </td>
                              <td>{standing.participant.title}</td>
                              <td className="pointsCell">{standing.totalPoints} pts</td>
                              <td>{standing.exactHits}</td>
                              <td>{standing.winnerHits}</td>
                              <td>{standing.scorerHits}</td>
                              <td>
                                {standing.submission ? (
                                  <span className="statusTag loaded">Pronóstico cargado</span>
                                ) : (
                                  <span className="statusTag pending">Pendiente</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Head to head match comparison matrix */}
              <section className="matrixPanel">
                <div className="panelHeader">
                  <p className="eyebrow">Comparativa Partido a Partido</p>
                  <h2>Liga Profesional Argentina - 6 Partidos</h2>
                </div>

                <div className="recopaMatchesGrid">
                  {recopaMatches.map((match) => {
                    const gonzaBreak = gonzaStanding?.matchBreakdown[match.id];
                    const javiBreak = javiStanding?.matchBreakdown[match.id];

                    const result = gonzaBreak?.result ?? javiBreak?.result;

                    return (
                      <article className="recopaMatchCard" key={match.id}>
                        <div className="matchCardHeader">
                          <span className="matchTime">
                            <Clock size={14} aria-hidden="true" />
                            {match.dateLabel} - {match.kickoffTime} hs
                          </span>
                          <span className="matchOrder">Match #{match.order}</span>
                        </div>

                        <div className="matchTeamsRow">
                          <div className="teamItem home">
                            <TeamBadge team={match.home} />
                          </div>
                          <span className="vsSeparator">VS</span>
                          <div className="teamItem away">
                            <TeamBadge team={match.away} />
                          </div>
                        </div>

                        {/* Official result box */}
                        <div className="officialResultBox">
                          <small>Resultado Oficial:</small>
                          {result ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                              <strong className="officialScore">
                                {result.homeGoals} - {result.awayGoals}
                              </strong>
                              {result.scorerNames && result.scorerNames.length > 0 && (
                                <small style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                  ⚽ {result.scorerNames.join(", ")}
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="pendingResult">Por jugarse</span>
                          )}
                        </div>

                        {/* Comparison rows */}
                        <div className="predictionsComparison">
                          {/* Gonza */}
                          <div className={`predRow ${gonzaBreak?.verdict === "exact" ? "exactHit" : gonzaBreak?.verdict === "winner" ? "winnerHit" : ""}`}>
                            <div className="predUser">
                              <img src="/kahl-assets/campeon-gonza-fiss.jpeg" alt="" className="predAvatar" />
                              <div className="userMetaStack">
                                <span>Gonza el + Fachero.</span>
                                {gonzaBreak?.prediction?.goalScorer ? (
                                  <small className="scorerText">⚽ {gonzaBreak.prediction.goalScorer}</small>
                                ) : null}
                              </div>
                            </div>
                            <div className="predScore">
                              {gonzaBreak?.prediction ? (
                                <strong>
                                  {gonzaBreak.prediction.homeGoals} - {gonzaBreak.prediction.awayGoals}
                                </strong>
                              ) : (
                                <span className="noPred">-</span>
                              )}
                            </div>
                            <div className="predPoints">
                              {result ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                  <span className={`ptsTag ${gonzaBreak?.verdict}`}>
                                    +{gonzaBreak?.points ?? 0} pts
                                  </span>
                                  {gonzaBreak?.scorerHit && (
                                    <small style={{ fontSize: "0.65rem", fontWeight: 800, color: "#16a34a" }}>⚽ +1 Goleador</small>
                                  )}
                                </div>
                              ) : (
                                <span className="ptsTag pending">?</span>
                              )}
                            </div>
                          </div>

                          {/* Javi */}
                          <div className={`predRow ${javiBreak?.verdict === "exact" ? "exactHit" : javiBreak?.verdict === "winner" ? "winnerHit" : ""}`}>
                            <div className="predUser">
                              <img src="/kahl-assets/campeon-javi.jpeg" alt="" className="predAvatar" />
                              <div className="userMetaStack">
                                <span>Javier</span>
                                {javiBreak?.prediction?.goalScorer ? (
                                  <small className="scorerText">⚽ {javiBreak.prediction.goalScorer}</small>
                                ) : null}
                              </div>
                            </div>
                            <div className="predScore">
                              {javiBreak?.prediction ? (
                                <strong>
                                  {javiBreak.prediction.homeGoals} - {javiBreak.prediction.awayGoals}
                                </strong>
                              ) : (
                                <span className="noPred">-</span>
                              )}
                            </div>
                            <div className="predPoints">
                              {result ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                  <span className={`ptsTag ${javiBreak?.verdict}`}>
                                    +{javiBreak?.points ?? 0} pts
                                  </span>
                                  {javiBreak?.scorerHit && (
                                    <small style={{ fontSize: "0.65rem", fontWeight: 800, color: "#16a34a" }}>⚽ +1 Goleador</small>
                                  )}
                                </div>
                              ) : (
                                <span className="ptsTag pending">?</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: CARGAR / EDITAR PRONOSTICO */}
          {activeTab === "cargar" && (
            <section className="formPanel">
              {!isUnlocked ? (
                /* LOGIN GATE FIRST */
                <form onSubmit={handleVerifyAccess} className="recopaAuthGate">
                  <div className="panelHeader">
                    <p className="eyebrow">Acceso Participantes Recopa</p>
                    <h2>Ingresá con tu usuario y PIN para habilitar la carga</h2>
                    <p>Misma lógica y seguridad que en Pronósticos: seleccioná quién sos e ingresá tu PIN personal.</p>
                  </div>

                  {verifyError && (
                    <div className="recopaAlert error">
                      <ShieldAlert size={20} />
                      <span>{verifyError}</span>
                    </div>
                  )}

                  {/* Participant Selector */}
                  <div className="participantSelector">
                    <label className="selectorLabel">¿Quién ingresa a la Recopa?</label>
                    <div className="selectorButtons">
                      <button
                        type="button"
                        className={`participantOption ${selectedParticipant === "Gonza el + Fachero." ? "selected" : ""}`}
                        onClick={() => setSelectedParticipant("Gonza el + Fachero.")}
                      >
                        <img src="/kahl-assets/campeon-gonza-fiss.jpeg" alt="Gonza el + Fachero." />
                        <div>
                          <strong>Gonza el + Fachero.</strong>
                          <small>Campeón Copa Chiqui Bauch</small>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`participantOption ${selectedParticipant === "Javier" ? "selected" : ""}`}
                        onClick={() => setSelectedParticipant("Javier")}
                      >
                        <img src="/kahl-assets/campeon-javi.jpeg" alt="Javier" />
                        <div>
                          <strong>Javier</strong>
                          <small>Campeón Copa Fiss</small>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* PIN Field */}
                  <div className="pinFieldContainer">
                    <label htmlFor="recopaPin">
                      <Lock size={16} /> PIN de seguridad de {selectedParticipant}
                    </label>
                    <input
                      id="recopaPin"
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Tu PIN personal (4 a 10 números)"
                      maxLength={10}
                      required
                    />
                    <small>Usá el mismo PIN con el que te registraste y administrás tus pronósticos.</small>
                  </div>

                  <button type="submit" className="primaryAction" disabled={verifying}>
                    {verifying ? <Loader2 className="spin" size={18} /> : <LogIn size={18} />}
                    Acceder a Cargar Pronóstico
                  </button>
                </form>
              ) : (
                /* UNLOCKED PREDICTION FORM */
                <div>
                  <div className="activeUserBanner">
                    <div className="activeUserInfo">
                      <UserCheck size={20} className="checkIcon" />
                      <span>Sesión iniciada como: <strong>{selectedParticipant}</strong></span>
                    </div>
                    <button
                      type="button"
                      className="primaryAction light small"
                      onClick={() => {
                        setIsUnlocked(false);
                        setPin("");
                      }}
                    >
                      <LogOut size={16} /> Cambiar Participante
                    </button>
                  </div>

                  {!isEditOpen && (
                    <div className="recopaAlert error" style={{ marginBottom: "16px" }}>
                      <Lock size={20} />
                      <span>
                        🔒 <strong>Pronósticos Cerrados:</strong> La edición de marcadores finalizó el Sábado 8 de Agosto a las 14:00 hs (comienzo del primer partido).
                      </span>
                    </div>
                  )}

                  {submitMessage && (
                    <div className={submitMessage.type === "success" ? "recopaAlert success" : "recopaAlert error"}>
                      {submitMessage.type === "success" ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                      <span>{submitMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitPredictions} className="recopaForm">
                    <div className="matchesFormList">
                      <h3>Cargá tus marcadores y goleadores para los 6 partidos:</h3>

                      {recopaMatches.map((match) => (
                        <article key={match.id} className="recopaInputCard">
                          <div className="cardMeta">
                            <span className="cardOrder">Partido #{match.order}</span>
                            <span className="cardKickoff">{match.dateLabel} - {match.kickoffTime} hs</span>
                          </div>

                          <div className="cardMatchRow">
                            <div className="teamSide home">
                              <TeamBadge team={match.home} />
                            </div>

                            <div className="scoreInputsGroup">
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={predictions[match.id]?.homeGoals ?? ""}
                                onChange={(e) =>
                                  setPredictions({
                                    ...predictions,
                                    [match.id]: { ...predictions[match.id], homeGoals: e.target.value },
                                  })
                                }
                                placeholder="0"
                                required
                                disabled={!isEditOpen}
                              />
                              <span className="dash">-</span>
                              <input
                                type="number"
                                min="0"
                                max="30"
                                value={predictions[match.id]?.awayGoals ?? ""}
                                onChange={(e) =>
                                  setPredictions({
                                    ...predictions,
                                    [match.id]: { ...predictions[match.id], awayGoals: e.target.value },
                                  })
                                }
                                placeholder="0"
                                required
                                disabled={!isEditOpen}
                              />
                            </div>

                            <div className="teamSide away">
                              <TeamBadge team={match.away} />
                            </div>
                          </div>

                          {/* Goalscorer Input Field */}
                          <div className="scorerInputField">
                            <label htmlFor={`scorer-${match.id}`}>
                              ⚽ Goleador del partido (escribilo a mano):
                            </label>
                            <input
                              id={`scorer-${match.id}`}
                              type="text"
                              value={predictions[match.id]?.goalScorer ?? ""}
                              onChange={(e) =>
                                setPredictions({
                                  ...predictions,
                                  [match.id]: { ...predictions[match.id], goalScorer: e.target.value },
                                })
                              }
                              placeholder="Ej: Borja, Cavani, Merentiel, etc."
                              disabled={!isEditOpen}
                            />
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="formActions">
                      <button type="submit" className="primaryAction" disabled={submitting || !isEditOpen}>
                        {submitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                        {isEditOpen ? `Guardar Pronóstico de ${selectedParticipant}` : "Pronósticos Cerrados"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          )}

          {/* TAB 3: CARGAR RESULTADOS OFICIALES */}
          {activeTab === "resultados" && (
            <section className="formPanel">
              <div className="panelHeader">
                <p className="eyebrow">Administración Recopa</p>
                <h2>Cargar Resultados Reales de los Partidos</h2>
                <p>Completá los goles reales y goleadores de cada encuentro para calcular los puntos en tiempo real.</p>
              </div>

              {resultsMessage && (
                <div className={resultsMessage.type === "success" ? "recopaAlert success" : "recopaAlert error"}>
                  {resultsMessage.type === "success" ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
                  <span>{resultsMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveResults} className="recopaForm">
                <div className="matchesFormList">
                  {recopaMatches.map((match) => (
                    <article key={match.id} className="recopaInputCard adminCard">
                      <div className="cardMeta">
                        <span className="cardOrder">Partido #{match.order}</span>
                        <span className="cardKickoff">{match.dateLabel} - {match.kickoffTime} hs</span>
                      </div>

                      <div className="cardMatchRow">
                        <div className="teamSide home">
                          <TeamBadge team={match.home} />
                        </div>

                        <div className="scoreInputsGroup">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={resultsDraft[match.id]?.homeGoals ?? ""}
                            onChange={(e) =>
                              setResultsDraft({
                                ...resultsDraft,
                                [match.id]: { ...resultsDraft[match.id], homeGoals: e.target.value },
                              })
                            }
                            placeholder="Goles local"
                          />
                          <span className="dash">-</span>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={resultsDraft[match.id]?.awayGoals ?? ""}
                            onChange={(e) =>
                              setResultsDraft({
                                ...resultsDraft,
                                [match.id]: { ...resultsDraft[match.id], awayGoals: e.target.value },
                              })
                            }
                            placeholder="Goles visita"
                          />
                        </div>

                        <div className="teamSide away">
                          <TeamBadge team={match.away} />
                        </div>
                      </div>

                      {/* Official Scorer Input Field */}
                      <div className="scorerInputField">
                        <label htmlFor={`admin-scorer-${match.id}`}>
                          ⚽ Goleadores reales del partido (separados por coma):
                        </label>
                        <input
                          id={`admin-scorer-${match.id}`}
                          type="text"
                          value={resultsDraft[match.id]?.scorerNames ?? ""}
                          onChange={(e) =>
                            setResultsDraft({
                              ...resultsDraft,
                              [match.id]: { ...resultsDraft[match.id], scorerNames: e.target.value },
                            })
                          }
                          placeholder="Ej: Borja, Solari"
                        />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="formActions">
                  <button type="submit" className="primaryAction" disabled={savingResults}>
                    {savingResults ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                    Guardar Resultados Oficiales
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}
