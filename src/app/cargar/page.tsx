"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ClipboardCheck, KeyRound, Loader2, Save, Send, Table2, Target, Trash2, Trophy, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { TeamBadge } from "@/app/components/TeamBadge";
import { readJsonResponse } from "@/lib/client-json";
import { choiceMatches, exactScoreMatches, groups, matches, roundLabels, type GroupId, type MatchRound } from "@/lib/matches";
import {
  countCompleteGroupPredictions,
  countCompletePredictions,
  type AppSettings,
  type PredictionChoice,
} from "@/lib/prode";

type ScoreDraft = { type: "score"; homeGoals: string; awayGoals: string };
type ChoiceDraft = { type: "choice"; choice: PredictionChoice | "" };
type DraftPrediction = ScoreDraft | ChoiceDraft;
type DraftState = Record<string, DraftPrediction>;
type GroupDraftState = Record<GroupId, { first: string; second: string }>;
type SavedGroupDraft = {
  name: string;
  activeRound: MatchRound;
  predictions: DraftState;
  groupPredictions: GroupDraftState;
  savedAt: string;
};

const groupDraftStorageKey = "copa-kahl-group-draft-v1";

const initialDraft = matches.reduce<DraftState>((draft, match) => {
  draft[match.id] = match.exactScore ? { type: "score", homeGoals: "", awayGoals: "" } : { type: "choice", choice: "" };
  return draft;
}, {});

const initialGroupDraft = groups.reduce<GroupDraftState>((draft, group) => {
  draft[group.id] = { first: "", second: "" };
  return draft;
}, {} as GroupDraftState);

function toPayload(name: string, pin: string, predictions: DraftState, groupPredictions: GroupDraftState) {
  return {
    name,
    pin,
    predictions: matches.map((match) => {
      const value = predictions[match.id];
      if (value.type === "score") {
        return {
          matchId: match.id,
          type: "score",
          homeGoals: value.homeGoals,
          awayGoals: value.awayGoals,
        };
      }
      return {
        matchId: match.id,
        type: "choice",
        choice: value.choice,
      };
    }),
    groupPredictions: groups.map((group) => ({
      groupId: group.id,
      first: groupPredictions[group.id].first,
      second: groupPredictions[group.id].second,
    })),
  };
}

function readSavedGroupDraft(): SavedGroupDraft | null {
  try {
    const raw = window.localStorage.getItem(groupDraftStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGroupDraft>;
    if (!parsed.predictions || !parsed.groupPredictions) return null;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      activeRound: parsed.activeRound === 1 || parsed.activeRound === 2 || parsed.activeRound === 3 ? parsed.activeRound : 1,
      predictions: { ...initialDraft, ...parsed.predictions },
      groupPredictions: { ...initialGroupDraft, ...parsed.groupPredictions },
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [activeRound, setActiveRound] = useState<MatchRound>(1);
  const [predictions, setPredictions] = useState<DraftState>(initialDraft);
  const [groupPredictions, setGroupPredictions] = useState<GroupDraftState>(initialGroupDraft);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<{ id: string; createdAt: string } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Buscando guardado provisorio...");
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [settingsReady, setSettingsReady] = useState(false);

  const roundMatches = useMemo(() => matches.filter((match) => match.round === activeRound), [activeRound]);
  const completedMatches = countCompletePredictions(predictions);
  const completedGroups = countCompleteGroupPredictions(groupPredictions);
  const completedTotal = completedMatches + completedGroups;
  const totalItems = matches.length + groups.length;
  const progress = Math.round((completedTotal / totalItems) * 100);
  const missingName = name.trim().length < 2;
  const missingPin = !/^\d{4,10}$/.test(pin.trim());
  const missingMatches = matches.length - completedMatches;
  const missingGroups = groups.length - completedGroups;
  const canSubmit =
    submissionsOpen && settingsReady && !missingName && !missingPin && missingMatches === 0 && missingGroups === 0 && status !== "saving";
  const validationMessages = [
    ...(!settingsReady ? ["Verificando si la carga esta abierta."] : []),
    ...(settingsReady && !submissionsOpen
      ? ["La carga de pronosticos esta cerrada por ahora. Admin la puede reabrir cuando corresponda."]
      : []),
    ...(missingName ? ["Poné tu nombre arriba para identificar tu prode."] : []),
    ...(missingPin ? ["Elegí un PIN de 4 a 10 números para poder editar hasta la fecha límite."] : []),
    ...(missingMatches > 0 ? [`Faltan ${missingMatches} pronósticos de partidos.`] : []),
    ...(missingGroups > 0 ? [`Faltan ${missingGroups} predicciones de grupos.`] : []),
  ];

  useEffect(() => {
    const savedDraft = readSavedGroupDraft();
    if (savedDraft) {
      setName(savedDraft.name);
      setActiveRound(savedDraft.activeRound);
      setPredictions(savedDraft.predictions);
      setGroupPredictions(savedDraft.groupPredictions);
      setDraftStatus(`Restaurado: ${new Date(savedDraft.savedAt).toLocaleString("es-AR")}`);
    } else {
      setDraftStatus("Se guarda provisorio en este navegador.");
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        const body = await readJsonResponse<AppSettings & { error?: string }>(response);
        setSubmissionsOpen(response.ok && !body.error && body.submissionsOpen);
      } catch {
        setSubmissionsOpen(false);
      } finally {
        setSettingsReady(true);
      }
    }

    void loadSettings();
  }, []);

  useEffect(() => {
    if (!draftReady || status === "done") return;
    const timeoutId = window.setTimeout(() => {
      saveDraft("Guardado provisorio automático");
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [draftReady, name, activeRound, predictions, groupPredictions, status]);

  function saveDraft(message = "Guardado provisorio listo") {
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(
      groupDraftStorageKey,
      JSON.stringify({ name, activeRound, predictions, groupPredictions, savedAt }),
    );
    setDraftStatus(`${message}: ${new Date(savedAt).toLocaleTimeString("es-AR")}`);
  }

  function clearDraft() {
    window.localStorage.removeItem(groupDraftStorageKey);
    setName("");
    setPin("");
    setActiveRound(1);
    setPredictions(initialDraft);
    setGroupPredictions(initialGroupDraft);
    setDraftStatus("Guardado provisorio borrado.");
  }

  function setScore(matchId: string, side: "homeGoals" | "awayGoals", value: string) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 2);
    setPredictions((current) => {
      const existing = current[matchId];
      if (existing.type !== "score") return current;
      return {
        ...current,
        [matchId]: { ...existing, [side]: cleanValue },
      };
    });
  }

  function setChoice(matchId: string, choice: PredictionChoice) {
    setPredictions((current) => ({
      ...current,
      [matchId]: { type: "choice", choice },
    }));
  }

  function setGroupPick(groupId: GroupId, side: "first" | "second", value: string) {
    setGroupPredictions((current) => ({
      ...current,
      [groupId]: { ...current[groupId], [side]: value },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      document.getElementById("validationSummary")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setErrors([]);
    setStatus("saving");

    const response = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(name, pin, predictions, groupPredictions)),
    });

    const body = await readJsonResponse<{ id?: string; createdAt?: string; errors?: string[] }>(response);
    if (!response.ok || body.errors?.length) {
      setErrors(body.errors ?? ["No se pudo guardar el pronóstico."]);
      setStatus("idle");
      return;
    }

    setReceipt({ id: body.id ?? "", createdAt: body.createdAt ?? new Date().toISOString() });
    window.localStorage.removeItem(groupDraftStorageKey);
    setStatus("done");
  }

  if (status === "done" && receipt) {
    return (
      <div className="pageStack">
        <section className="heroBand successHero">
          <div>
            <p className="eyebrow">Enviado</p>
            <h1>Pronóstico guardado.</h1>
            <p className="heroCopy">Ticket guardado para {name.trim()}. Podés editar con tu PIN hasta la fecha límite.</p>
          </div>
          <div className="scoreSeal" aria-label={`${completedTotal} pronósticos completos`}>
            <CheckCircle2 size={34} aria-hidden="true" />
            <strong>{completedTotal}</strong>
            <span>pronósticos</span>
          </div>
        </section>
        <section className="receiptPanel">
          <div>
            <p className="eyebrow">Comprobante</p>
            <h2>{receipt.id.slice(0, 8).toUpperCase()}</h2>
            <p>{new Date(receipt.createdAt).toLocaleString("es-AR")}</p>
          </div>
          <Link className="primaryAction light" href="/tabla">
            <Table2 size={18} aria-hidden="true" />
            Ver tabla
          </Link>
        </section>
      </div>
    );
  }

  return (
    <form className="pageStack" onSubmit={handleSubmit}>
      <section className="heroBand prodeHero">
        <div>
          <p className="eyebrow">Prode 2026</p>
          <h1>Fase de grupos híbrida.</h1>
          <p className="heroCopy">
            Por fecha: 10 partidos importantes con marcador exacto y 14 con ganador/empate/perdedor.
          </p>
        </div>
        <div className="heroControl nameCard">
          <label htmlFor="participantName">Nombre</label>
          <input
            id="participantName"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
            disabled={status === "saving"}
          />
          <span>{completedTotal}/{totalItems} completos</span>
        </div>
      </section>

      <KahlImageScatter page="home" count={5} />

      <section className="draftPanel" aria-live="polite">
        <div>
          <p className="eyebrow">Provisorio</p>
          <h2>No pierdas tu progreso.</h2>
          <p>{draftStatus}</p>
        </div>
        <div className="draftActions">
          <button className="primaryAction light" onClick={() => saveDraft()} type="button">
            <Save size={18} aria-hidden="true" />
            Guardar provisorio
          </button>
          <button className="primaryAction light" onClick={clearDraft} type="button">
            <Trash2 size={18} aria-hidden="true" />
            Borrar provisorio
          </button>
        </div>
      </section>

      {validationMessages.length > 0 ? (
        <section className="validationPanel" id="validationSummary" aria-live="polite">
          <p className="eyebrow">Antes de enviar</p>
          <h2>Completá lo que falta.</h2>
          <ul>
            {validationMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rulePanel" aria-label="Reglas de puntos">
        <article>
          <strong>2 pts</strong>
          <span>Marcador exacto en partidos marcados</span>
        </article>
        <article>
          <strong>1 pt</strong>
          <span>Ganador, empate o perdedor correcto</span>
        </article>
        <article>
          <strong>5 pts</strong>
          <span>Top 2 del grupo, sin importar orden</span>
        </article>
      </section>

      <section className="metricGrid" aria-label="Estado del prode">
        <article className="metric">
          <Target size={20} aria-hidden="true" />
          <span>Exactos fase grupos</span>
          <strong>{exactScoreMatches.length}</strong>
        </article>
        <article className="metric">
          <Trophy size={20} aria-hidden="true" />
          <span>1X2 fase grupos</span>
          <strong>{choiceMatches.length}</strong>
        </article>
        <article className="metric alert">
          <ClipboardCheck size={20} aria-hidden="true" />
          <span>Avance</span>
          <strong>{progress}%</strong>
        </article>
      </section>

      <section className="roundStrip" aria-label="Fechas">
        {([1, 2, 3] as MatchRound[]).map((round) => {
          const roundDone = countCompletePredictions(
            Object.fromEntries(matches.filter((match) => match.round === round).map((match) => [match.id, predictions[match.id]])),
          );
          const roundExact = matches.filter((match) => match.round === round && match.exactScore).length;
          return (
            <button
              className={activeRound === round ? "roundTab active" : "roundTab"}
              key={round}
              onClick={() => setActiveRound(round)}
              type="button"
            >
              <span>{roundLabels[round]}</span>
              <strong>{roundDone}/24 · {roundExact} exactos</strong>
            </button>
          );
        })}
      </section>

      <section className="matchGrid" aria-label={roundLabels[activeRound]}>
        {roundMatches.map((match) => {
          const value = predictions[match.id];
          return (
            <article className={match.exactScore ? "matchCard exact" : "matchCard choice"} key={match.id}>
              <div className="matchHeader">
                <span>#{match.order}</span>
                <strong>{match.exactScore ? "Marcador exacto" : "1X2"} · Grupo {match.groupId}</strong>
              </div>
              <h2>
                <TeamBadge team={match.home} />
                <span>vs.</span>
                <TeamBadge team={match.away} />
              </h2>
              {value.type === "score" ? (
                <div className="scoreInputs">
                  <label>
                    <TeamBadge compact team={match.home} />
                    <input
                      inputMode="numeric"
                      min="0"
                      max="30"
                      value={value.homeGoals}
                      onChange={(event) => setScore(match.id, "homeGoals", event.target.value)}
                      disabled={status === "saving"}
                      aria-label={`Goles de ${match.home}`}
                    />
                  </label>
                  <b>-</b>
                  <label>
                    <TeamBadge compact team={match.away} />
                    <input
                      inputMode="numeric"
                      min="0"
                      max="30"
                      value={value.awayGoals}
                      onChange={(event) => setScore(match.id, "awayGoals", event.target.value)}
                      disabled={status === "saving"}
                      aria-label={`Goles de ${match.away}`}
                    />
                  </label>
                </div>
              ) : (
                <div className="choiceGroup" role="group" aria-label={`${match.home} vs ${match.away}`}>
                  {(["home", "draw", "away"] as PredictionChoice[]).map((choice) => (
                    <button
                      className={value.choice === choice ? "choiceButton selected" : "choiceButton"}
                      key={choice}
                      onClick={() => setChoice(match.id, choice)}
                      disabled={status === "saving"}
                      type="button"
                    >
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
        <h2>Quiénes terminan 1º y 2º.</h2>
        <p>Elegí dos equipos por grupo. Para sumar, tienen que ser los dos clasificados aunque el orden esté invertido.</p>
      </section>

      <section className="groupGrid" aria-label="Pronósticos de grupos">
        {groups.map((group) => {
          const value = groupPredictions[group.id];
          const duplicate = value.first && value.second && value.first === value.second;
          return (
            <article className={duplicate ? "groupCard invalid" : "groupCard"} key={group.id}>
              <div className="matchHeader">
                <span>Grupo {group.id}</span>
                <strong>Top 2</strong>
              </div>
              <div className="teamList">
                {group.teams.map((team) => (
                  <TeamBadge compact key={team} team={team} />
                ))}
              </div>
              <div className="groupSelectors">
                <label>
                  <span>1º puesto</span>
                  <select
                    value={value.first}
                    onChange={(event) => setGroupPick(group.id, "first", event.target.value)}
                    disabled={status === "saving"}
                  >
                    <option value="">Elegir</option>
                    {group.teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>2º puesto</span>
                  <select
                    value={value.second}
                    onChange={(event) => setGroupPick(group.id, "second", event.target.value)}
                    disabled={status === "saving"}
                  >
                    <option value="">Elegir</option>
                    {group.teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {duplicate ? <small>Elegí dos equipos distintos.</small> : null}
            </article>
          );
        })}
      </section>

      {errors.length > 0 ? (
        <section className="errorPanel" aria-live="polite">
          <p className="eyebrow">Revisar</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pinPanel" aria-label="PIN de edición">
        <div>
          <p className="eyebrow">Edición</p>
          <h2>Elegí tu PIN.</h2>
          <p>Con tu nombre y este PIN vas a poder editar tus pronósticos hasta la fecha límite. Guardalo, no se puede recuperar.</p>
        </div>
        <label className="pinInput">
          <span>PIN</span>
          <div>
            <KeyRound size={18} aria-hidden="true" />
            <input
              autoComplete="new-password"
              disabled={status === "saving"}
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="4 a 10 números"
              type="password"
              value={pin}
            />
          </div>
        </label>
      </section>

      <div className="submitDock">
        <div>
          <span>{name.trim() || "Sin nombre"}</span>
          <strong>{completedTotal}/{totalItems}</strong>
        </div>
        <button className="primaryAction" disabled={!canSubmit} type="submit">
          {status === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
          {!settingsReady ? "Verificando carga" : !submissionsOpen ? "Carga cerrada" : canSubmit ? "Enviar definitivo" : "Completar para enviar"}
        </button>
      </div>
    </form>
  );
}
