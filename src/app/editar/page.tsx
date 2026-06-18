"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, Search, Target, Trophy } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { readJsonResponse } from "@/lib/client-json";
import { choiceMatches, exactScoreMatches, groups, matches, roundLabels, type GroupId, type MatchRound } from "@/lib/matches";
import {
  countCompleteGroupPredictions,
  countCompletePredictions,
  type ResultStore,
  type Prediction,
  type PredictionChoice,
  type StandingRow,
  type Submission,
} from "@/lib/prode";

type ScoreDraft = { type: "score"; homeGoals: string; awayGoals: string };
type ChoiceDraft = { type: "choice"; choice: PredictionChoice | "" };
type DraftPrediction = ScoreDraft | ChoiceDraft;
type DraftState = Record<string, DraftPrediction>;
type GroupDraftState = Record<GroupId, { first: string; second: string }>;
type PublicSubmission = Omit<Submission, "pinHash">;
type MyProdeResponse = {
  submission?: PublicSubmission;
  standing?: StandingRow | null;
  position?: number | null;
  results?: ResultStore;
  updatedAt?: string;
  errors?: string[];
};
type EditWindow = {
  open: boolean;
  deadline: string | null;
  rounds: Record<MatchRound, { open: boolean; deadline: string }>;
};

const defaultEditWindow: EditWindow = {
  open: true,
  deadline: null,
  rounds: {
    1: { open: true, deadline: "2026-06-11T19:00:00.000Z" },
    2: { open: true, deadline: "2026-06-18T16:00:00.000Z" },
    3: { open: true, deadline: "2026-06-24T19:00:00.000Z" },
  },
};

const initialDraft = matches.reduce<DraftState>((draft, match) => {
  draft[match.id] = match.exactScore ? { type: "score", homeGoals: "", awayGoals: "" } : { type: "choice", choice: "" };
  return draft;
}, {});

const initialGroupDraft = groups.reduce<GroupDraftState>((draft, group) => {
  draft[group.id] = { first: "", second: "" };
  return draft;
}, {} as GroupDraftState);

function draftFromSubmission(predictions: Prediction[]) {
  const draft = { ...initialDraft };
  for (const prediction of predictions) {
    draft[prediction.matchId] =
      prediction.type === "score"
        ? { type: "score", homeGoals: String(prediction.homeGoals), awayGoals: String(prediction.awayGoals) }
        : { type: "choice", choice: prediction.choice };
  }
  return draft;
}

function groupDraftFromSubmission(submission: Submission) {
  const draft = { ...initialGroupDraft };
  for (const prediction of submission.groupPredictions ?? []) {
    draft[prediction.groupId] = { first: prediction.first, second: prediction.second };
  }
  return draft;
}

function formatDeadline(value: string) {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: "Asia/Tokyo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("day")}/${byType.get("month")}, ${byType.get("hour")}:${byType.get("minute")}`;
}

function formatDraftPrediction(value: DraftPrediction, home: string, away: string) {
  if (value.type === "score") return value.homeGoals !== "" && value.awayGoals !== "" ? `${value.homeGoals}-${value.awayGoals}` : "Sin cargar";
  if (value.choice === "home") return home;
  if (value.choice === "away") return away;
  if (value.choice === "draw") return "Empate";
  return "Sin cargar";
}

function samePrediction(first: DraftPrediction, second: DraftPrediction) {
  if (first.type !== second.type) return false;
  if (first.type === "score" && second.type === "score") {
    return first.homeGoals === second.homeGoals && first.awayGoals === second.awayGoals;
  }
  return first.type === "choice" && second.type === "choice" && first.choice === second.choice;
}

function changedGroupTeamCount(original: { first: string; second: string }, next: { first: string; second: string }) {
  const originalTeams = new Set([original.first, original.second]);
  return [next.first, next.second].filter((team) => !originalTeams.has(team)).length;
}

function toPayload(name: string, pin: string, predictions: DraftState, groupPredictions: GroupDraftState) {
  return {
    name,
    pin,
    predictions: matches.map((match) => {
      const value = predictions[match.id];
      if (value.type === "score") {
        return { matchId: match.id, type: "score", homeGoals: value.homeGoals, awayGoals: value.awayGoals };
      }
      return { matchId: match.id, type: "choice", choice: value.choice };
    }),
    groupPredictions: groups.map((group) => ({
      groupId: group.id,
      first: groupPredictions[group.id].first,
      second: groupPredictions[group.id].second,
    })),
  };
}

export default function EditarPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [activeRound, setActiveRound] = useState<MatchRound>(1);
  const [predictions, setPredictions] = useState<DraftState>(initialDraft);
  const [groupPredictions, setGroupPredictions] = useState<GroupDraftState>(initialGroupDraft);
  const [originalPredictions, setOriginalPredictions] = useState<DraftState>(initialDraft);
  const [originalGroupPredictions, setOriginalGroupPredictions] = useState<GroupDraftState>(initialGroupDraft);
  const [editWindow, setEditWindow] = useState<EditWindow>(defaultEditWindow);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "done">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [myProde, setMyProde] = useState<MyProdeResponse | null>(null);

  const roundMatches = useMemo(() => matches.filter((match) => match.round === activeRound), [activeRound]);
  const completedMatches = countCompletePredictions(predictions);
  const completedGroups = countCompleteGroupPredictions(groupPredictions);
  const completedTotal = completedMatches + completedGroups;
  const totalItems = matches.length + groups.length;
  const missingName = name.trim().length < 2;
  const missingPin = !/^\d{4,10}$/.test(pin.trim());
  const missingMatches = matches.length - completedMatches;
  const missingGroups = groups.length - completedGroups;
  const changedGroups = groups.filter((group) => changedGroupTeamCount(originalGroupPredictions[group.id], groupPredictions[group.id]) > 0).length;
  const invalidGroupChanges = groups.filter((group) => changedGroupTeamCount(originalGroupPredictions[group.id], groupPredictions[group.id]) > 1);
  const canSave =
    loaded &&
    (editWindow.open || changedGroups > 0) &&
    !missingName &&
    !missingPin &&
    missingMatches === 0 &&
    missingGroups === 0 &&
    invalidGroupChanges.length === 0 &&
    status !== "saving";
  const groupsOpen = loaded;
  const changedMatches = matches.filter((match) => !samePrediction(predictions[match.id], originalPredictions[match.id])).length;
  const changedTotal = changedMatches + changedGroups;
  const pending = useMemo(() => {
    if (!myProde?.submission || !myProde.results) return { matches: 0, groups: 0, knockout: 0 };
    const played = new Set(myProde.results.matchResults.map((result) => result.matchId));
    const decidedGroups = new Set(myProde.results.groupResults.map((result) => result.groupId));
    const playedKnockout = new Set(myProde.results.knockoutResults.map((result) => result.fixtureId));
    return {
      matches: myProde.submission.predictions.filter((prediction) => !played.has(prediction.matchId)).length,
      groups: groups.filter((group) => !decidedGroups.has(group.id)).length,
      knockout: (myProde.submission.knockoutPredictions ?? []).filter((prediction) => !playedKnockout.has(prediction.fixtureId)).length,
    };
  }, [myProde]);
  const deadlineText = editWindow.deadline
    ? formatDeadline(editWindow.deadline)
    : "por fecha, segun el inicio de cada jornada";

  async function loadMyProde(nextName = name, nextPin = pin) {
    const response = await fetch("/api/my-prode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName, pin: nextPin }),
    });
    const body = await readJsonResponse<MyProdeResponse>(response);
    if (response.ok && !body.errors?.length) setMyProde(body);
  }

  async function loadSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrors([]);
    const response = await fetch("/api/edit-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    const body = await readJsonResponse<{ submission?: Submission; editWindow?: EditWindow; errors?: string[] }>(response);
    if (!response.ok || body.errors?.length || !body.submission) {
      setErrors(body.errors ?? ["No se pudo abrir el pronostico."]);
      setStatus("idle");
      return;
    }
    setName(body.submission.name);
    const loadedPredictions = draftFromSubmission(body.submission.predictions);
    const loadedGroupPredictions = groupDraftFromSubmission(body.submission);
    setPredictions(loadedPredictions);
    setGroupPredictions(loadedGroupPredictions);
    setOriginalPredictions(loadedPredictions);
    setOriginalGroupPredictions(loadedGroupPredictions);
    setEditWindow(body.editWindow ?? defaultEditWindow);
    setLoaded(true);
    await loadMyProde(body.submission.name, pin);
    setStatus("idle");
  }

  async function saveEdition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setStatus("saving");
    setErrors([]);
    const response = await fetch("/api/edit-submission", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(name, pin, predictions, groupPredictions)),
    });
    const body = await readJsonResponse<{ updatedAt?: string; editWindow?: EditWindow; errors?: string[] }>(response);
    if (!response.ok || body.errors?.length) {
      setErrors(body.errors ?? ["No se pudo guardar la edicion."]);
      if (body.editWindow) setEditWindow(body.editWindow);
      setStatus("idle");
      return;
    }
    setUpdatedAt(body.updatedAt ?? new Date().toISOString());
    setOriginalPredictions(predictions);
    setOriginalGroupPredictions(groupPredictions);
    await loadMyProde(name, pin);
    setStatus("done");
  }

  function setScore(matchId: string, side: "homeGoals" | "awayGoals", value: string) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 2);
    setPredictions((current) => {
      const existing = current[matchId];
      if (existing.type !== "score") return current;
      return { ...current, [matchId]: { ...existing, [side]: cleanValue } };
    });
  }

  function setChoice(matchId: string, choice: PredictionChoice) {
    setPredictions((current) => ({ ...current, [matchId]: { type: "choice", choice } }));
  }

  function setGroupPick(groupId: GroupId, side: "first" | "second", value: string) {
    setGroupPredictions((current) => {
      const nextValue = { ...current[groupId], [side]: value };
      if (changedGroupTeamCount(originalGroupPredictions[groupId], nextValue) > 1) {
        setErrors([`En el Grupo ${groupId} solo podes cambiar 1 de los 2 equipos. Para elegir otro, primero volve uno al valor original.`]);
        return current;
      }
      return { ...current, [groupId]: nextValue };
    });
  }

  return (
    <form className="pageStack" onSubmit={loaded ? saveEdition : loadSubmission}>
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Editar mi prode</p>
          <h1>Tu prode completo.</h1>
          <p className="heroCopy">Ingresa con tu nombre y PIN para ver tus puntos, revisar lo cargado y editar lo que siga abierto. La edicion cierra {deadlineText}.</p>
        </div>
        <div className="heroControl">
          <label htmlFor="editName">Nombre</label>
          <input id="editName" autoComplete="name" disabled={loaded || status === "loading"} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" value={name} />
          <label htmlFor="editPin">PIN</label>
          <input id="editPin" autoComplete="current-password" disabled={status === "loading"} inputMode="numeric" maxLength={10} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Tu PIN" type="password" value={pin} />
          <span>{loaded ? `${completedTotal}/${totalItems} completos` : "Abri tu envio guardado"}</span>
        </div>
      </section>

      {errors.length > 0 ? (
        <section className="errorPanel" aria-live="polite">
          <p className="eyebrow">Revisar</p>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      ) : null}

      {!loaded ? (
        <section className="pinPanel">
          <div>
            <p className="eyebrow">Acceso</p>
            <h2>Nombre y PIN.</h2>
            <p>Usa el mismo nombre con el que mandaste el prode y el PIN que elegiste al enviarlo. Al abrir, se cargan tus pronosticos guardados desde la base de datos.</p>
          </div>
          <button className="primaryAction" disabled={status === "loading" || missingName || missingPin} type="submit">
            {status === "loading" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
            Abrir edicion
          </button>
        </section>
      ) : null}

      {!loaded ? (
        <section className="deadlineGrid" aria-label="Limites de edicion">
          {([1, 2, 3] as MatchRound[]).map((round) => (
            <article className={editWindow.rounds[round].open ? "deadlineCard" : "deadlineCard closed"} key={round}>
              <span>Fecha {round}</span>
              <strong>{formatDeadline(editWindow.rounds[round].deadline)}</strong>
              <small>{editWindow.rounds[round].open ? "Editable hasta ese horario" : "Edicion cerrada"}</small>
            </article>
          ))}
        </section>
      ) : null}

      {loaded && !editWindow.open ? (
        <section className="validationPanel">
          <p className="eyebrow">Cerrado</p>
          <h2>Ya cerraron todas las fechas.</h2>
          <p>Podes ver tu pronostico, pero no guardarlo porque ya empezaron las tres fechas.</p>
        </section>
      ) : null}

      {loaded && editWindow.open ? (
        <section className="validationPanel">
          <p className="eyebrow">Limites</p>
          <h2>La edicion se cierra por fecha.</h2>
          <ul>
            {([1, 2, 3] as MatchRound[]).map((round) => (
              <li key={round}>
                Fecha {round}: {editWindow.rounds[round].open ? "abierta hasta" : "cerrada desde"}{" "}
                {formatDeadline(editWindow.rounds[round].deadline)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status === "done" ? (
        <section className="receiptPanel">
          <div>
            <p className="eyebrow">Guardado</p>
            <h2>Edicion actualizada.</h2>
            <p>{new Date(updatedAt).toLocaleString("es-AR")}</p>
          </div>
          <CheckCircle2 size={34} aria-hidden="true" />
        </section>
      ) : null}

      {loaded ? (
        <>
          {myProde?.standing ? (
            <>
              <section className="sectionHeader">
                <p className="eyebrow">Mi prode</p>
                <h2>Resumen de {myProde.submission?.name ?? name}.</h2>
              </section>
              <section className="metricGrid" aria-label="Resumen personal">
                <article className="metric">
                  <Trophy size={20} aria-hidden="true" />
                  <span>Posicion</span>
                  <strong>#{myProde.position ?? "-"}</strong>
                </article>
                <article className="metric">
                  <Search size={20} aria-hidden="true" />
                  <span>Puntos</span>
                  <strong>{myProde.standing.totalPoints}</strong>
                </article>
                <article className="metric alert">
                  <span>Sin resultado</span>
                  <strong>{pending.matches + pending.groups + pending.knockout}</strong>
                </article>
              </section>
              <section className="pointBreakdown">
                <article><span>Partidos</span><strong>{myProde.standing.matchPoints}</strong><small>{myProde.standing.exactHits} exactos / {myProde.standing.winnerHits} ganador/empate</small></article>
                <article><span>Grupos</span><strong>{myProde.standing.groupPoints}</strong><small>{myProde.standing.groupHits} grupos acertados</small></article>
                <article><span>Eliminatorias</span><strong>{myProde.standing.knockoutPoints}</strong><small>{myProde.standing.knockoutExactHits} exactos</small></article>
                <article><span>Goleadores</span><strong>{myProde.standing.knockoutScorerHits}</strong><small>Bonus de goleador</small></article>
                <article><span>Ajustes</span><strong>{myProde.standing.manualAdjustmentPoints}</strong><small>Correcciones admin</small></article>
              </section>
            </>
          ) : null}

          <section className="metricGrid" aria-label="Estado de edicion">
            <article className="metric"><Target size={20} aria-hidden="true" /><span>Exactos fase grupos</span><strong>{exactScoreMatches.length}</strong></article>
            <article className="metric"><Trophy size={20} aria-hidden="true" /><span>1X2 fase grupos</span><strong>{choiceMatches.length}</strong></article>
            <article className="metric alert"><CheckCircle2 size={20} aria-hidden="true" /><span>Completos</span><strong>{completedTotal}/{totalItems}</strong></article>
            <article className="metric"><Save size={20} aria-hidden="true" /><span>Cambios sin guardar</span><strong>{changedTotal}</strong></article>
          </section>

          <section className="roundStrip" aria-label="Fechas">
            {([1, 2, 3] as MatchRound[]).map((round) => (
              <button className={activeRound === round ? "roundTab active" : "roundTab"} key={round} onClick={() => setActiveRound(round)} type="button">
                <span>{roundLabels[round]}</span>
                <strong>{editWindow.rounds[round].open ? `Hasta ${formatDeadline(editWindow.rounds[round].deadline)}` : "Cerrada"}</strong>
              </button>
            ))}
          </section>

          <section className="matchGrid" aria-label={roundLabels[activeRound]}>
            {roundMatches.map((match) => {
              const value = predictions[match.id];
              const originalValue = originalPredictions[match.id];
              const matchOpen = editWindow.rounds[match.round]?.open ?? true;
              const changed = !samePrediction(value, originalValue);
              return (
                <article className={`${match.exactScore ? "matchCard exact" : "matchCard choice"}${changed ? " changed" : ""}`} key={match.id}>
                  <div className="matchHeader"><span>#{match.order}</span><strong>{matchOpen ? (match.exactScore ? "Marcador exacto" : "1X2") : "Cerrado"} - Grupo {match.groupId}</strong></div>
                  <h2><TeamBadge team={match.home} /><span>vs.</span><TeamBadge team={match.away} /></h2>
                  <small className={matchOpen ? "editState open" : "editState closed"}>
                    {matchOpen ? "Este partido todavia se puede editar." : "Este partido ya cerro."}
                  </small>
                  {changed ? <small className="previousPick">Anterior: {formatDraftPrediction(originalValue, match.home, match.away)}</small> : null}
                  {value.type === "score" ? (
                    <div className="scoreInputs">
                      <label><TeamBadge compact team={match.home} /><input disabled={!matchOpen || status === "saving"} inputMode="numeric" onChange={(event) => setScore(match.id, "homeGoals", event.target.value)} value={value.homeGoals} /></label>
                      <b>-</b>
                      <label><TeamBadge compact team={match.away} /><input disabled={!matchOpen || status === "saving"} inputMode="numeric" onChange={(event) => setScore(match.id, "awayGoals", event.target.value)} value={value.awayGoals} /></label>
                    </div>
                  ) : (
                    <div className="choiceGroup">
                      {(["home", "draw", "away"] as PredictionChoice[]).map((choice) => (
                        <button className={value.choice === choice ? "choiceButton selected" : "choiceButton"} disabled={!matchOpen || status === "saving"} key={choice} onClick={() => setChoice(match.id, choice)} type="button">
                          {choice === "home" ? <TeamBadge compact team={match.home} /> : choice === "away" ? <TeamBadge compact team={match.away} /> : "Empate"}
                        </button>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <section className="sectionHeader">
            <p className="eyebrow">Grupos</p>
            <h2>Top 2 por grupo.</h2>
            <p>Podés corregir como máximo 1 equipo por grupo. No se puede cambiar el top 2 completo.</p>
          </section>
          <section className="groupGrid">
            {groups.map((group) => {
              const value = groupPredictions[group.id];
              const originalValue = originalGroupPredictions[group.id];
              const changed = changedGroupTeamCount(originalValue, value) > 0;
              return (
                <article className={changed ? "groupCard changed" : "groupCard"} key={group.id}>
                  <div className="matchHeader"><span>Grupo {group.id}</span><strong>1 cambio permitido</strong></div>
                  <div className="teamList">{group.teams.map((team) => <TeamBadge compact key={team} team={team} />)}</div>
                  {changed ? <small className="previousPick">Anterior: {originalValue.first || "-"} / {originalValue.second || "-"}</small> : null}
                  <div className="groupSelectors">
                    <label><span>1 puesto</span><select disabled={!groupsOpen || status === "saving"} onChange={(event) => setGroupPick(group.id, "first", event.target.value)} value={value.first}><option value="">Elegir</option>{group.teams.map((team) => <option key={team} value={team}>{team}</option>)}</select></label>
                    <label><span>2 puesto</span><select disabled={!groupsOpen || status === "saving"} onChange={(event) => setGroupPick(group.id, "second", event.target.value)} value={value.second}><option value="">Elegir</option>{group.teams.map((team) => <option key={team} value={team}>{team}</option>)}</select></label>
                  </div>
                </article>
              );
            })}
          </section>

          <div className="submitDock">
            <div><span>{name.trim() || "Sin nombre"}</span><strong>{completedTotal}/{totalItems}</strong></div>
            <button className="primaryAction" disabled={!canSave} type="submit">
              {status === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              {canSave ? "Guardar edicion" : "No disponible"}
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
