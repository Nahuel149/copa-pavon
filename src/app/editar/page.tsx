"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, Target, Trophy } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { choiceMatches, exactScoreMatches, groups, matches, roundLabels, type GroupId, type MatchRound } from "@/lib/matches";
import {
  countCompleteGroupPredictions,
  countCompletePredictions,
  type Prediction,
  type PredictionChoice,
  type Submission,
} from "@/lib/prode";

type ScoreDraft = { type: "score"; homeGoals: string; awayGoals: string };
type ChoiceDraft = { type: "choice"; choice: PredictionChoice | "" };
type DraftPrediction = ScoreDraft | ChoiceDraft;
type DraftState = Record<string, DraftPrediction>;
type GroupDraftState = Record<GroupId, { first: string; second: string }>;
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
  const [editWindow, setEditWindow] = useState<EditWindow>(defaultEditWindow);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "done">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");

  const roundMatches = useMemo(() => matches.filter((match) => match.round === activeRound), [activeRound]);
  const completedMatches = countCompletePredictions(predictions);
  const completedGroups = countCompleteGroupPredictions(groupPredictions);
  const completedTotal = completedMatches + completedGroups;
  const totalItems = matches.length + groups.length;
  const missingName = name.trim().length < 2;
  const missingPin = !/^\d{4,10}$/.test(pin.trim());
  const missingMatches = matches.length - completedMatches;
  const missingGroups = groups.length - completedGroups;
  const canSave = loaded && editWindow.open && !missingName && !missingPin && missingMatches === 0 && missingGroups === 0 && status !== "saving";
  const groupsOpen = editWindow.rounds[1]?.open ?? true;
  const deadlineText = editWindow.deadline
    ? new Date(editWindow.deadline).toLocaleString("es-AR")
    : "por fecha, segun el inicio de cada jornada";

  async function loadSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrors([]);
    const response = await fetch("/api/edit-submission", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });
    const body = (await response.json()) as { submission?: Submission; editWindow?: EditWindow; errors?: string[] };
    if (!response.ok || !body.submission) {
      setErrors(body.errors ?? ["No se pudo abrir el pronostico."]);
      setStatus("idle");
      return;
    }
    setName(body.submission.name);
    setPredictions(draftFromSubmission(body.submission.predictions));
    setGroupPredictions(groupDraftFromSubmission(body.submission));
    setEditWindow(body.editWindow ?? defaultEditWindow);
    setLoaded(true);
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
    const body = (await response.json()) as { updatedAt?: string; editWindow?: EditWindow; errors?: string[] };
    if (!response.ok) {
      setErrors(body.errors ?? ["No se pudo guardar la edicion."]);
      if (body.editWindow) setEditWindow(body.editWindow);
      setStatus("idle");
      return;
    }
    setUpdatedAt(body.updatedAt ?? new Date().toISOString());
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
    setGroupPredictions((current) => ({ ...current, [groupId]: { ...current[groupId], [side]: value } }));
  }

  return (
    <form className="pageStack" onSubmit={loaded ? saveEdition : loadSubmission}>
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Editar</p>
          <h1>Modificar pronosticos.</h1>
          <p className="heroCopy">Ingresa con tu nombre y PIN. La edicion cierra {deadlineText}.</p>
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
            <p>Usa el mismo nombre con el que mandaste el prode y el PIN que elegiste al enviarlo.</p>
          </div>
          <button className="primaryAction" disabled={status === "loading" || missingName || missingPin} type="submit">
            {status === "loading" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
            Abrir edicion
          </button>
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
                Fecha {round}: {editWindow.rounds[round].open ? "abierta" : "cerrada"} desde{" "}
                {new Date(editWindow.rounds[round].deadline).toLocaleString("es-AR")}
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
          <section className="metricGrid" aria-label="Estado de edicion">
            <article className="metric"><Target size={20} aria-hidden="true" /><span>Exactos fase grupos</span><strong>{exactScoreMatches.length}</strong></article>
            <article className="metric"><Trophy size={20} aria-hidden="true" /><span>1X2 fase grupos</span><strong>{choiceMatches.length}</strong></article>
            <article className="metric alert"><CheckCircle2 size={20} aria-hidden="true" /><span>Completos</span><strong>{completedTotal}/{totalItems}</strong></article>
          </section>

          <section className="roundStrip" aria-label="Fechas">
            {([1, 2, 3] as MatchRound[]).map((round) => (
              <button className={activeRound === round ? "roundTab active" : "roundTab"} key={round} onClick={() => setActiveRound(round)} type="button">
                <span>{roundLabels[round]}</span>
                <strong>{editWindow.rounds[round].open ? "Abierta" : "Cerrada"}</strong>
              </button>
            ))}
          </section>

          <section className="matchGrid" aria-label={roundLabels[activeRound]}>
            {roundMatches.map((match) => {
              const value = predictions[match.id];
              const matchOpen = editWindow.rounds[match.round]?.open ?? true;
              return (
                <article className={match.exactScore ? "matchCard exact" : "matchCard choice"} key={match.id}>
                  <div className="matchHeader"><span>#{match.order}</span><strong>{matchOpen ? (match.exactScore ? "Marcador exacto" : "1X2") : "Cerrado"} · Grupo {match.groupId}</strong></div>
                  <h2><TeamBadge team={match.home} /><span>vs.</span><TeamBadge team={match.away} /></h2>
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
          </section>
          <section className="groupGrid">
            {groups.map((group) => {
              const value = groupPredictions[group.id];
              return (
                <article className="groupCard" key={group.id}>
                  <div className="matchHeader"><span>Grupo {group.id}</span><strong>{groupsOpen ? "Top 2" : "Cerrado"}</strong></div>
                  <div className="teamList">{group.teams.map((team) => <TeamBadge compact key={team} team={team} />)}</div>
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
