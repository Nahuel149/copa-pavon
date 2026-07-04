"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, LogIn, Save, Send, Trash2 } from "lucide-react";
import { TeamBadge } from "@/app/components/TeamBadge";
import { formatArgentinaDateTime, formatArgentinaTime } from "@/lib/argentina-time";
import { readJsonResponse } from "@/lib/client-json";
import { isOptionalLateKnockoutFixture } from "@/lib/knockout-optional";
import { knockoutStageLabels, knockoutStageSchedule, knockoutStageScoring, knockoutStages, type KnockoutFixture } from "@/lib/matches";
import type { KnockoutPrediction, Submission } from "@/lib/prode";

type FixtureResponse = {
  fixtures: KnockoutFixture[];
  fixtureStatus?: Record<string, { kickoffAt: string; editDeadline: string; open: boolean }>;
};

type LoginResponse = {
  submission?: Submission;
  errors?: string[];
};

type SaveKnockoutResponse = {
  ok?: boolean;
  saved?: number;
  errors?: string[];
};

type KnockoutDraft = Record<string, { homeGoals: string; awayGoals: string; qualifiedTeam: "home" | "away" | ""; goalScorer: string }>;
type SavedKnockoutDraft = {
  name: string;
  predictions: KnockoutDraft;
  savedAt: string;
};

const knockoutDraftStorageKey = "copa-kahl-knockout-draft-v1";

function draftFromFixtures(fixtures: KnockoutFixture[]) {
  return fixtures.reduce<KnockoutDraft>((draft, fixture) => {
    draft[fixture.id] = { homeGoals: "", awayGoals: "", qualifiedTeam: "", goalScorer: "" };
    return draft;
  }, {});
}

function isKnockoutPredictionComplete(value: KnockoutDraft[string] | undefined) {
  if (!value || value.homeGoals === "" || value.awayGoals === "") return false;
  return value.homeGoals !== value.awayGoals || value.qualifiedTeam === "home" || value.qualifiedTeam === "away";
}

function mergeKnockoutPredictions(fixtures: KnockoutFixture[], current: KnockoutDraft, savedPredictions: KnockoutPrediction[] = []) {
  const byFixture = new Map(savedPredictions.map((prediction) => [prediction.fixtureId, prediction]));
  return fixtures.reduce<KnockoutDraft>((draft, fixture) => {
    const currentValue = current[fixture.id] ?? { homeGoals: "", awayGoals: "", qualifiedTeam: "", goalScorer: "" };
    const saved = byFixture.get(fixture.id);
    draft[fixture.id] = saved
      ? {
          homeGoals: String(saved.homeGoals),
          awayGoals: String(saved.awayGoals),
          qualifiedTeam: saved.qualifiedTeam ?? "",
          goalScorer: saved.goalScorer ?? "",
        }
      : currentValue;
    return draft;
  }, {});
}

function readSavedKnockoutDraft(fixtures: KnockoutFixture[]): SavedKnockoutDraft | null {
  try {
    const raw = window.localStorage.getItem(knockoutDraftStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedKnockoutDraft>;
    if (!parsed.predictions) return null;
    const baseDraft = draftFromFixtures(fixtures);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      predictions: fixtures.reduce<KnockoutDraft>((draft, fixture) => {
        const saved = parsed.predictions?.[fixture.id];
        draft[fixture.id] = saved ? { ...baseDraft[fixture.id], ...saved } : baseDraft[fixture.id];
        return draft;
      }, {}),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export default function EliminatoriasPage() {
  const [fixtures, setFixtures] = useState<KnockoutFixture[]>([]);
  const [fixtureStatus, setFixtureStatus] = useState<Record<string, { kickoffAt: string; editDeadline: string; open: boolean }>>({});
  const [predictions, setPredictions] = useState<KnockoutDraft>({});
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loginStatus, setLoginStatus] = useState<"idle" | "checking">("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "done">("loading");
  const [errors, setErrors] = useState<string[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Buscando guardado provisorio...");
  const [savedCount, setSavedCount] = useState(0);
  const [submitReminder, setSubmitReminder] = useState("");
  const [highlightSubmit, setHighlightSubmit] = useState(false);
  const submitDockRef = useRef<HTMLDivElement | null>(null);

  const openFixtures = fixtures.filter((fixture) => fixtureStatus[fixture.id]?.open ?? true);
  const requiredOpenFixtures = openFixtures.filter((fixture) => {
    if (!isOptionalLateKnockoutFixture(fixture)) return true;
    return isKnockoutPredictionComplete(predictions[fixture.id]);
  });
  const completed = requiredOpenFixtures.reduce((total, fixture) => total + (isKnockoutPredictionComplete(predictions[fixture.id]) ? 1 : 0), 0);
  const missingName = name.trim().length < 2;
  const missingLogin = !isUnlocked;
  const missingFixtures = requiredOpenFixtures.length - completed;
  const canSubmit = !missingName && !missingLogin && requiredOpenFixtures.length > 0 && missingFixtures === 0 && status !== "saving";
  const shouldWarnBeforeLeaving = isUnlocked && status !== "done" && status !== "saving" && requiredOpenFixtures.length > 0 && completed > 0;
  const validationMessages = [
    ...(missingName ? ["Poné el mismo nombre que usaste en fase de grupos."] : []),
    ...(fixtures.length === 0 ? ["Todavía no hay cruces eliminatorios cargados desde admin."] : []),
    ...(missingFixtures > 0 ? [`Faltan ${missingFixtures} marcadores exactos de eliminatorias.`] : []),
  ];
  const fixturesByStage = useMemo(() => {
    return fixtures.reduce<Record<string, KnockoutFixture[]>>((acc, fixture) => {
      acc[fixture.stage] = [...(acc[fixture.stage] ?? []), fixture];
      return acc;
    }, {});
  }, [fixtures]);
  const stageGroups = useMemo(
    () =>
      knockoutStages
        .map((stage) => {
          const stageFixtures = (fixturesByStage[stage] ?? []).toSorted((a, b) => a.order - b.order);
          const closed = stageFixtures.length > 0 && stageFixtures.every((fixture) => fixtureStatus[fixture.id]?.open === false);
          return { stage, fixtures: stageFixtures, closed };
        })
        .filter((group) => group.fixtures.length > 0),
    [fixtureStatus, fixturesByStage],
  );
  const activeStageGroups = stageGroups.filter((group) => !group.closed);
  const closedStageGroups = stageGroups.filter((group) => group.closed);

  const importantPanel = (
    <section className="validationPanel dangerPanel" aria-live="polite">
      <p className="eyebrow">Importante</p>
      <h2>Completá todo el prode de eliminatorias.</h2>
      <p>
        Cada partido se puede editar hasta 10 minutos antes de empezar. Si no completás un partido antes de que cierre,
        ese partido suma 0 puntos. Si dejás 2 partidos de eliminatorias sin pronosticar cuando ya cerraron, quedás
        eliminado del prode.
      </p>
    </section>
  );

  const draftPanel = (
    <section className="draftPanel" aria-live="polite">
      <div>
        <p className="eyebrow">Provisorio</p>
        <h2>No pierdas tus cruces.</h2>
        <p>{draftStatus}</p>
        <p>
          El guardado provisorio queda solo en este navegador y no cuenta como envío oficial. Para que se cuente, tenés
          que completar los cruces abiertos y apretar Enviar eliminatorias; después podés volver a entrar y editar los
          partidos que todavía no cerraron.
        </p>
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
  );

  const validationPanel =
    validationMessages.length > 0 ? (
      <section className="validationPanel" id="knockoutValidationSummary" aria-live="polite">
        <p className="eyebrow">Antes de enviar</p>
        <h2>Completá eliminatorias.</h2>
        <ul>
          {validationMessages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </section>
    ) : null;

  const knockoutRulesPanel = (
    <section className="scoreRuleGrid knockoutScoreGrid" aria-label="Puntos de eliminatorias">
      {knockoutStages.map((stage) => {
        const scoring = knockoutStageScoring[stage];
        return (
          <article key={stage}>
            <span>{knockoutStageLabels[stage]}</span>
            <strong>
              {scoring.exact} / {scoring.winner}
            </strong>
            <p>
              Exacto: {scoring.exact} pts. {scoring.winnerLabel}: {scoring.winner} pts. Fecha:{" "}
              {knockoutStageSchedule[stage]}. Si el marcador queda empatado tras 120&apos; y errás el clasificado por
              penales, suma parcial: 2 pts en 16avos/octavos/tercer puesto, 3 en cuartos, 4 en semis y 5 en final.
              Goleador acertado: +1. Vacio suma si sale 0-0.
            </p>
          </article>
        );
      })}
    </section>
  );

  useEffect(() => {
    async function loadFixtures() {
      const response = await fetch("/api/knockout-fixtures", { cache: "no-store" });
      const body = await readJsonResponse<FixtureResponse>(response);
      const loadedFixtures = body.fixtures ?? [];
      setFixtureStatus(body.fixtureStatus ?? {});
      const savedDraft = readSavedKnockoutDraft(loadedFixtures);
      setFixtures(loadedFixtures);
      if (savedDraft) {
        setName(savedDraft.name);
        setPredictions(savedDraft.predictions);
        setDraftStatus(`Restaurado: ${formatArgentinaDateTime(savedDraft.savedAt)}`);
      } else {
        setPredictions(draftFromFixtures(loadedFixtures));
        setDraftStatus("Se guarda provisorio en este navegador.");
      }
      setDraftReady(true);
      setStatus("idle");
    }
    void loadFixtures();
  }, []);

  useEffect(() => {
    if (!draftReady || status === "done" || status === "loading") return;
    const timeoutId = window.setTimeout(() => {
      saveDraft("Guardado provisorio automático");
    }, 450);
    return () => window.clearTimeout(timeoutId);
  }, [draftReady, name, predictions, status]);

  useEffect(() => {
    if (!shouldWarnBeforeLeaving) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [shouldWarnBeforeLeaving]);

  useEffect(() => {
    if (!shouldWarnBeforeLeaving) return;
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      focusSubmitDock("Antes de salir, acordate de apretar Enviar eliminatorias para que cuente.");
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [shouldWarnBeforeLeaving]);

  useEffect(() => {
    if (!shouldWarnBeforeLeaving) return;
    const handleDocumentClick = (event: globalThis.MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!link) return;
      event.preventDefault();
      focusSubmitDock("Primero revisá el botón Enviar eliminatorias. Si no lo apretás, no cuenta como envío oficial.");
    };
    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [shouldWarnBeforeLeaving]);

  function focusSubmitDock(message = "Apretá Enviar eliminatorias para que el prode quede oficial.") {
    setSubmitReminder(message);
    setHighlightSubmit(true);
    window.setTimeout(() => setHighlightSubmit(false), 2400);
    submitDockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function saveDraft(message = "Guardado provisorio listo") {
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(knockoutDraftStorageKey, JSON.stringify({ name, predictions, savedAt }));
    setDraftStatus(`${message}: ${formatArgentinaTime(savedAt)}`);
  }

  function clearDraft() {
    window.localStorage.removeItem(knockoutDraftStorageKey);
    setName("");
    setPredictions(draftFromFixtures(fixtures));
    setDraftStatus("Guardado provisorio borrado.");
  }

  function setScore(fixtureId: string, side: "homeGoals" | "awayGoals", value: string) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 2);
    setPredictions((current) => ({
      ...current,
      [fixtureId]: { ...current[fixtureId], [side]: cleanValue },
    }));
  }

  function setQualifiedTeam(fixtureId: string, value: "home" | "away" | "") {
    setPredictions((current) => ({
      ...current,
      [fixtureId]: { ...current[fixtureId], qualifiedTeam: value },
    }));
  }

  function setGoalScorer(fixtureId: string, value: string) {
    setPredictions((current) => ({
      ...current,
      [fixtureId]: { ...current[fixtureId], goalScorer: value.slice(0, 80) },
    }));
  }

  async function handleLogin() {
    setLoginMessage("");
    setErrors([]);
    if (name.trim().length < 2 || !/^\d{4,10}$/.test(pin.trim())) {
      setLoginMessage("Ingresa tu nombre y un PIN de 4 a 10 numeros.");
      return;
    }

    setLoginStatus("checking");
    try {
      const response = await fetch("/api/my-prode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const body = await readJsonResponse<LoginResponse>(response);
      if (!response.ok || body.errors?.length || !body.submission) {
        throw new Error(body.errors?.[0] ?? "No se pudo validar el PIN.");
      }
      setName(body.submission.name);
      setPredictions((current) => mergeKnockoutPredictions(fixtures, current, body.submission?.knockoutPredictions ?? []));
      setIsUnlocked(true);
      setLoginMessage("Acceso validado. Ya podes cargar eliminatorias.");
    } catch (loginError) {
      setIsUnlocked(false);
      setLoginMessage(loginError instanceof Error ? loginError.message : "No se pudo validar el PIN.");
    } finally {
      setLoginStatus("idle");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      document.getElementById("knockoutValidationSummary")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setErrors([]);
    setStatus("saving");

    const response = await fetch("/api/knockout-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        pin,
        predictions: fixtures.map((fixture) => ({
          fixtureId: fixture.id,
          homeGoals: predictions[fixture.id]?.homeGoals ?? "",
          awayGoals: predictions[fixture.id]?.awayGoals ?? "",
          qualifiedTeam: predictions[fixture.id]?.qualifiedTeam ?? "",
          goalScorer: predictions[fixture.id]?.goalScorer ?? "",
        })),
      }),
    });

    const body = await readJsonResponse<SaveKnockoutResponse>(response);
    if (!response.ok || body.errors?.length) {
      setErrors(body.errors ?? ["No se pudo guardar el pronóstico."]);
      setStatus("idle");
      return;
    }

    setSavedCount(body.saved ?? requiredOpenFixtures.length);
    window.localStorage.removeItem(knockoutDraftStorageKey);
    setStatus("done");
  }

  function renderFixtureCard(fixture: KnockoutFixture) {
    const value = predictions[fixture.id] ?? { homeGoals: "", awayGoals: "", qualifiedTeam: "", goalScorer: "" };
    const lock = fixtureStatus[fixture.id];
    const fixtureOpen = lock?.open ?? true;
    const deadline = lock?.editDeadline ? formatArgentinaDateTime(lock.editDeadline) : "10 min antes";
    return (
      <article className="matchCard exact" key={fixture.id}>
        <div className="matchHeader">
          <span>#{fixture.order}</span>
          <strong>Eliminatoria exacta</strong>
        </div>
        <h2>
          <TeamBadge team={fixture.home} />
          <span>vs.</span>
          <TeamBadge team={fixture.away} />
        </h2>
        <small className={fixtureOpen ? "editState open" : "editState closed"}>
          {fixtureOpen ? `Partido editable hasta ${deadline}` : "Este partido ya cerro."}
        </small>
        <div className="scoreInputs">
          <label>
            <TeamBadge compact team={fixture.home} />
            <input
              inputMode="numeric"
              value={value.homeGoals}
              onChange={(event) => setScore(fixture.id, "homeGoals", event.target.value)}
              disabled={!isUnlocked || !fixtureOpen || status === "saving"}
            />
          </label>
          <b>-</b>
          <label>
            <TeamBadge compact team={fixture.away} />
            <input
              inputMode="numeric"
              value={value.awayGoals}
              onChange={(event) => setScore(fixture.id, "awayGoals", event.target.value)}
              disabled={!isUnlocked || !fixtureOpen || status === "saving"}
            />
          </label>
        </div>
        {value.homeGoals !== "" && value.homeGoals === value.awayGoals ? (
          <div className="penaltyQualifier" role="radiogroup" aria-label="Clasifica por penales">
            <span>Clasifica por penales</span>
            <div>
              {(["home", "away"] as const).map((side) => {
                const selected = value.qualifiedTeam === side;
                return (
                  <button
                    aria-checked={selected}
                    className={selected ? "penaltyOption selected" : "penaltyOption"}
                    disabled={!isUnlocked || !fixtureOpen || status === "saving"}
                    key={side}
                    onClick={() => setQualifiedTeam(fixture.id, side)}
                    role="radio"
                    type="button"
                  >
                    <CheckCircle2 size={18} aria-hidden="true" />
                    {side === "home" ? fixture.home : fixture.away}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <label className="scorerInput">
          <span>Goleador del partido (+1)</span>
          <input
            value={value.goalScorer ?? ""}
            onChange={(event) => setGoalScorer(fixture.id, event.target.value)}
            disabled={!isUnlocked || !fixtureOpen || status === "saving"}
            placeholder="Ej: Messi, Haaland, Mbappe. Maximo 1 goleador, maximo 1 punto."
          />
        </label>
      </article>
    );
  }

  if (status === "loading") {
    return (
      <section className="compactHero">
        <div>
          <p className="eyebrow">Editar Prode</p>
          <h1>Cargando cruces.</h1>
        </div>
      </section>
    );
  }

  if (status === "done") {
    return (
      <div className="pageStack">
        <section className="compactHero">
          <div>
            <p className="eyebrow">Enviado</p>
            <h1>Prode guardado.</h1>
            <span>{name.trim()} ya tiene los cruces guardados en la base de datos.</span>
          </div>
          <div className="scoreSeal">
            <CheckCircle2 size={34} aria-hidden="true" />
            <strong>{savedCount || completed}</strong>
            <span>guardados</span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <form className="pageStack" onSubmit={handleSubmit}>
      <section className="compactHero">
        <div>
          <p className="eyebrow">Editar Prode</p>
          <h1>Marcador exacto.</h1>
          <span>Exactos, clasificados y goleador. Cada partido cierra 10 minutos antes de su horario.</span>
        </div>
        <div className="heroControl">
          <label htmlFor="knockoutName">Nombre</label>
          <input
            id="knockoutName"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setIsUnlocked(false);
              setLoginMessage("");
            }}
            placeholder="Mismo nombre"
            disabled={status === "saving"}
          />
          <label htmlFor="knockoutPin">PIN</label>
          <div className="pinLoginRow">
            <input
              id="knockoutPin"
              autoComplete="current-password"
              inputMode="numeric"
              maxLength={10}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 10));
                setIsUnlocked(false);
                setLoginMessage("");
              }}
              placeholder="PIN"
              type="password"
              value={pin}
              disabled={status === "saving"}
            />
            <button className="iconSubmit" disabled={loginStatus === "checking" || status === "saving"} onClick={handleLogin} type="button" aria-label="Entrar">
              {loginStatus === "checking" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <LogIn size={18} aria-hidden="true" />}
            </button>
          </div>
          <span>{isUnlocked ? `${completed}/${requiredOpenFixtures.length} cruces requeridos completos` : loginMessage || "Entra con nombre y PIN"}</span>
        </div>
      </section>

      {!isUnlocked ? (
        <>
          {importantPanel}
          {draftPanel}
          {validationPanel}
          <section className="validationPanel">
            <p className="eyebrow">Privado</p>
            <h2>Ingresa para ver los cruces.</h2>
            <p>Primero valida tu nombre y PIN. Despues de entrar vas a poder ver y cargar los partidos de eliminatorias.</p>
          </section>
        </>
      ) : (
        <>
      {fixtures.length === 0 ? (
        <section className="emptyState">Todavía no hay cruces cargados desde admin.</section>
      ) : (
        activeStageGroups.map(({ stage, fixtures: stageFixtures }) => (
          <section className="pageStack compactStack" key={stage}>
            <div className="sectionHeader">
              <p className="eyebrow">{knockoutStageLabels[stage]}</p>
              <h2>{stageFixtures.length} cruces</h2>
            </div>
            <div className="matchGrid">
              {stageFixtures.map((fixture) => {
                const value = predictions[fixture.id] ?? { homeGoals: "", awayGoals: "", qualifiedTeam: "", goalScorer: "" };
                const lock = fixtureStatus[fixture.id];
                const fixtureOpen = lock?.open ?? true;
                const deadline = lock?.editDeadline ? formatArgentinaDateTime(lock.editDeadline) : "10 min antes";
                return (
                  <article className="matchCard exact" key={fixture.id}>
                    <div className="matchHeader">
                      <span>#{fixture.order}</span>
                      <strong>Eliminatoria exacta</strong>
                    </div>
                    <h2>
                      <TeamBadge team={fixture.home} />
                      <span>vs.</span>
                      <TeamBadge team={fixture.away} />
                    </h2>
                    <small className={fixtureOpen ? "editState open" : "editState closed"}>
                      {fixtureOpen ? `Partido editable hasta ${deadline}` : "Este partido ya cerro."}
                    </small>
                    <div className="scoreInputs">
                      <label>
                        <TeamBadge compact team={fixture.home} />
                        <input
                          inputMode="numeric"
                          value={value.homeGoals}
                          onChange={(event) => setScore(fixture.id, "homeGoals", event.target.value)}
                          disabled={!isUnlocked || !fixtureOpen || status === "saving"}
                        />
                      </label>
                      <b>-</b>
                      <label>
                        <TeamBadge compact team={fixture.away} />
                        <input
                          inputMode="numeric"
                          value={value.awayGoals}
                          onChange={(event) => setScore(fixture.id, "awayGoals", event.target.value)}
                          disabled={!isUnlocked || !fixtureOpen || status === "saving"}
                        />
                      </label>
                    </div>
                    {value.homeGoals !== "" && value.homeGoals === value.awayGoals ? (
                      <div className="penaltyQualifier" role="radiogroup" aria-label="Clasifica por penales">
                        <span>Clasifica por penales</span>
                        <div>
                          {(["home", "away"] as const).map((side) => {
                            const selected = value.qualifiedTeam === side;
                            return (
                              <button
                                aria-checked={selected}
                                className={selected ? "penaltyOption selected" : "penaltyOption"}
                                disabled={!isUnlocked || !fixtureOpen || status === "saving"}
                                key={side}
                                onClick={() => setQualifiedTeam(fixture.id, side)}
                                role="radio"
                                type="button"
                              >
                                <CheckCircle2 size={18} aria-hidden="true" />
                                {side === "home" ? fixture.home : fixture.away}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                    <label className="scorerInput">
                      <span>Goleador del partido (+1)</span>
                      <input
                        value={value.goalScorer ?? ""}
                        onChange={(event) => setGoalScorer(fixture.id, event.target.value)}
                        disabled={!isUnlocked || !fixtureOpen || status === "saving"}
                        placeholder="Ej: Messi, Haaland, Mbappe. Maximo 1 goleador, maximo 1 punto."
                      />
                    </label>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

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

      <div className={highlightSubmit ? "submitDock attention" : "submitDock"} ref={submitDockRef}>
        <div>
          <span>{name.trim() || "Sin nombre"}</span>
          <strong>{completed}/{requiredOpenFixtures.length}</strong>
          {submitReminder ? <small>{submitReminder}</small> : null}
        </div>
        <button className="primaryAction" disabled={!canSubmit} type="submit">
          {status === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
          {canSubmit ? "Enviar eliminatorias" : "Completar para enviar"}
        </button>
      </div>

      {validationPanel}
      {closedStageGroups.length > 0 ? (
        <section className="pageStack closedRoundsStack" aria-label="Rondas cerradas">
          {closedStageGroups.map((group) => (
            <details className="closedRoundFold" key={group.stage}>
              <summary>
                <span>{knockoutStageLabels[group.stage]}</span>
                <strong>{group.fixtures.length} cruces cerrados</strong>
              </summary>
              <div className="matchGrid">{group.fixtures.map(renderFixtureCard)}</div>
            </details>
          ))}
        </section>
      ) : null}
      {importantPanel}
      {draftPanel}
      {knockoutRulesPanel}
        </>
      )}

    </form>
  );
}
