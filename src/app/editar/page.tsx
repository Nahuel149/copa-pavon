"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, Save, Shield, Target, Trophy } from "lucide-react";
import { choiceMatches, exactScoreMatches, groups, matches, roundLabels, type GroupId, type MatchRound } from "@/lib/matches";
import {
  choiceLabel,
  clanLabel,
  clans,
  countCompleteGroupPredictions,
  countCompletePredictions,
  defaultClan,
  type ClanId,
  type Prediction,
  type PredictionChoice,
  type Submission,
} from "@/lib/prode";

type ScoreDraft = { type: "score"; homeGoals: string; awayGoals: string };
type ChoiceDraft = { type: "choice"; choice: PredictionChoice | "" };
type DraftPrediction = ScoreDraft | ChoiceDraft;
type DraftState = Record<string, DraftPrediction>;
type GroupDraftState = Record<GroupId, { first: string; second: string }>;
type EditWindow = { open: boolean; deadline: string | null };

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

function toPayload(name: string, pin: string, clan: ClanId, predictions: DraftState, groupPredictions: GroupDraftState) {
  return {
    name,
    pin,
    clan,
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
  const [clan, setClan] = useState<ClanId>(defaultClan);
  const [activeRound, setActiveRound] = useState<MatchRound>(1);
  const [predictions, setPredictions] = useState<DraftState>(initialDraft);
  const [groupPredictions, setGroupPredictions] = useState<GroupDraftState>(initialGroupDraft);
  const [editWindow, setEditWindow] = useState<EditWindow>({ open: true, deadline: null });
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
  const deadlineText = editWindow.deadline
    ? new Date(editWindow.deadline).toLocaleString("es-AR")
    : "sin fecha límite configurada";

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
      setErrors(body.errors ?? ["No se pudo abrir el pronóstico."]);
      setStatus("idle");
      return;
    }
    setName(body.submission.name);
    setClan(body.submission.clan);
    setPredictions(draftFromSubmission(body.submission.predictions));
    setGroupPredictions(groupDraftFromSubmission(body.submission));
    setEditWindow(body.editWindow ?? { open: true, deadline: null });
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
      body: JSON.stringify(toPayload(name, pin, clan, predictions, groupPredictions)),
    });
    const body = (await response.json()) as { updatedAt?: string; editWindow?: EditWindow; errors?: string[] };
    if (!response.ok) {
      setErrors(body.errors ?? ["No se pudo guardar la edición."]);
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
          <h1>Modificar pronósticos.</h1>
          <p className="heroCopy">Ingresá con tu nombre y PIN. La edición cierra: {deadlineText}.</p>
        </div>
        <div className="heroControl">
          <label htmlFor="editName">Nombre</label>
          <input id="editName" autoComplete="name" disabled={loaded || status === "loading"} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" value={name} />
          <label htmlFor="editPin">PIN</label>
          <input id="editPin" autoComplete="current-password" disabled={status === "loading"} inputMode="numeric" maxLength={10} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Tu PIN" type="password" value={pin} />
          <span>{loaded ? `${completedTotal}/${totalItems} completos` : "Abrí tu envío guardado"}</span>
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
            <p>Usá el mismo nombre con el que mandaste el prode y el PIN que elegiste al enviarlo.</p>
          </div>
          <button className="primaryAction" disabled={status === "loading" || missingName || missingPin} type="submit">
            {status === "loading" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <KeyRound size={18} aria-hidden="true" />}
            Abrir edición
          </button>
        </section>
      ) : null}

      {loaded && !editWindow.open ? (
        <section className="validationPanel">
          <p className="eyebrow">Cerrado</p>
          <h2>La edición ya no está disponible.</h2>
          <p>Podés ver tu pronóstico, pero no guardarlo porque pasó la fecha límite.</p>
        </section>
      ) : null}

      {status === "done" ? (
        <section className="receiptPanel">
          <div>
            <p className="eyebrow">Guardado</p>
            <h2>Edición actualizada.</h2>
            <p>{new Date(updatedAt).toLocaleString("es-AR")}</p>
          </div>
          <CheckCircle2 size={34} aria-hidden="true" />
        </section>
      ) : null}

      {loaded ? (
        <>
          <section className="metricGrid" aria-label="Estado de edición">
            <article className="metric"><Target size={20} aria-hidden="true" /><span>Exactos fase grupos</span><strong>{exactScoreMatches.length}</strong></article>
            <article className="metric"><Trophy size={20} aria-hidden="true" /><span>1X2 fase grupos</span><strong>{choiceMatches.length}</strong></article>
            <article className="metric alert"><Shield size={20} aria-hidden="true" /><span>Clan</span><strong>{clanLabel(clan)}</strong></article>
          </section>

          <section className="roundStrip" aria-label="Fechas">
            {([1, 2, 3] as MatchRound[]).map((round) => (
              <button className={activeRound === round ? "roundTab active" : "roundTab"} key={round} onClick={() => setActiveRound(round)} type="button">
                <span>{roundLabels[round]}</span>
                <strong>{matches.filter((match) => match.round === round && match.exactScore).length} exactos</strong>
              </button>
            ))}
          </section>

          <section className="matchGrid" aria-label={roundLabels[activeRound]}>
            {roundMatches.map((match) => {
              const value = predictions[match.id];
              return (
                <article className={match.exactScore ? "matchCard exact" : "matchCard choice"} key={match.id}>
                  <div className="matchHeader"><span>#{match.order}</span><strong>{match.exactScore ? "Marcador exacto" : "1X2"} · Grupo {match.groupId}</strong></div>
                  <h2>{match.home}<span>vs.</span>{match.away}</h2>
                  {value.type === "score" ? (
                    <div className="scoreInputs">
                      <label><span>{match.home}</span><input disabled={!editWindow.open || status === "saving"} inputMode="numeric" onChange={(event) => setScore(match.id, "homeGoals", event.target.value)} value={value.homeGoals} /></label>
                      <b>-</b>
                      <label><span>{match.away}</span><input disabled={!editWindow.open || status === "saving"} inputMode="numeric" onChange={(event) => setScore(match.id, "awayGoals", event.target.value)} value={value.awayGoals} /></label>
                    </div>
                  ) : (
                    <div className="choiceGroup">
                      {(["home", "draw", "away"] as PredictionChoice[]).map((choice) => (
                        <button className={value.choice === choice ? "choiceButton selected" : "choiceButton"} disabled={!editWindow.open || status === "saving"} key={choice} onClick={() => setChoice(match.id, choice)} type="button">
                          {choiceLabel(choice, match.home, match.away)}
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
                  <div className="matchHeader"><span>Grupo {group.id}</span><strong>Top 2</strong></div>
                  <div className="teamList">{group.teams.map((team) => <span key={team}>{team}</span>)}</div>
                  <div className="groupSelectors">
                    <label><span>1º puesto</span><select disabled={!editWindow.open || status === "saving"} onChange={(event) => setGroupPick(group.id, "first", event.target.value)} value={value.first}><option value="">Elegir</option>{group.teams.map((team) => <option key={team} value={team}>{team}</option>)}</select></label>
                    <label><span>2º puesto</span><select disabled={!editWindow.open || status === "saving"} onChange={(event) => setGroupPick(group.id, "second", event.target.value)} value={value.second}><option value="">Elegir</option>{group.teams.map((team) => <option key={team} value={team}>{team}</option>)}</select></label>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="clanPanel" aria-label="Elegir clan">
            <div><p className="eyebrow">Clan</p><h2>Clan del participante.</h2><p>River Plate queda por defecto. Cambialo sólo si jugás con La Batata.</p></div>
            <div className="clanOptions">
              {clans.map((option) => (
                <button className={clan === option.id ? "clanButton selected" : "clanButton"} disabled={!editWindow.open || status === "saving"} key={option.id} onClick={() => setClan(option.id)} type="button">
                  <Shield size={18} aria-hidden="true" />
                  <span><strong>{option.name}</strong><small>{option.hint}</small></span>
                </button>
              ))}
            </div>
          </section>

          <div className="submitDock">
            <div><span>{name.trim() || "Sin nombre"}</span><strong>{completedTotal}/{totalItems}</strong></div>
            <button className="primaryAction" disabled={!canSave} type="submit">
              {status === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
              {canSave ? "Guardar edición" : "No disponible"}
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
