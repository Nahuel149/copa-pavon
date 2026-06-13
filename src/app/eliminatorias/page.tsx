"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brackets, CheckCircle2, Loader2, Save, Send, Target, Trash2 } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { TeamBadge } from "@/app/components/TeamBadge";
import { readJsonResponse } from "@/lib/client-json";
import { knockoutStageLabels, knockoutStageSchedule, knockoutStageScoring, knockoutStages, type KnockoutFixture } from "@/lib/matches";
import { countCompleteKnockoutPredictions } from "@/lib/prode";

type FixtureResponse = {
  fixtures: KnockoutFixture[];
};

type KnockoutDraft = Record<string, { homeGoals: string; awayGoals: string }>;
type SavedKnockoutDraft = {
  name: string;
  predictions: KnockoutDraft;
  savedAt: string;
};

const knockoutDraftStorageKey = "copa-kahl-knockout-draft-v1";

function draftFromFixtures(fixtures: KnockoutFixture[]) {
  return fixtures.reduce<KnockoutDraft>((draft, fixture) => {
    draft[fixture.id] = { homeGoals: "", awayGoals: "" };
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
        draft[fixture.id] = parsed.predictions?.[fixture.id] ?? baseDraft[fixture.id];
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
  const [predictions, setPredictions] = useState<KnockoutDraft>({});
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "done">("loading");
  const [errors, setErrors] = useState<string[]>([]);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState("Buscando guardado provisorio...");

  const completed = countCompleteKnockoutPredictions(predictions, fixtures);
  const missingName = name.trim().length < 2;
  const missingFixtures = fixtures.length - completed;
  const canSubmit = !missingName && fixtures.length > 0 && missingFixtures === 0 && status !== "saving";
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

  useEffect(() => {
    async function loadFixtures() {
      const response = await fetch("/api/knockout-fixtures", { cache: "no-store" });
      const body = await readJsonResponse<FixtureResponse>(response);
      const loadedFixtures = body.fixtures ?? [];
      const savedDraft = readSavedKnockoutDraft(loadedFixtures);
      setFixtures(loadedFixtures);
      if (savedDraft) {
        setName(savedDraft.name);
        setPredictions(savedDraft.predictions);
        setDraftStatus(`Restaurado: ${new Date(savedDraft.savedAt).toLocaleString("es-AR")}`);
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

  function saveDraft(message = "Guardado provisorio listo") {
    const savedAt = new Date().toISOString();
    window.localStorage.setItem(knockoutDraftStorageKey, JSON.stringify({ name, predictions, savedAt }));
    setDraftStatus(`${message}: ${new Date(savedAt).toLocaleTimeString("es-AR")}`);
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
        predictions: fixtures.map((fixture) => ({
          fixtureId: fixture.id,
          homeGoals: predictions[fixture.id]?.homeGoals ?? "",
          awayGoals: predictions[fixture.id]?.awayGoals ?? "",
        })),
      }),
    });

    const body = await readJsonResponse<{ errors?: string[] }>(response);
    if (!response.ok || body.errors?.length) {
      setErrors(body.errors ?? ["No se pudo guardar el pronóstico."]);
      setStatus("idle");
      return;
    }

    window.localStorage.removeItem(knockoutDraftStorageKey);
    setStatus("done");
  }

  if (status === "loading") {
    return (
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Eliminatorias</p>
          <h1>Cargando cruces.</h1>
        </div>
      </section>
    );
  }

  if (status === "done") {
    return (
      <div className="pageStack">
        <section className="heroBand successHero">
          <div>
            <p className="eyebrow">Enviado</p>
            <h1>Eliminatorias guardadas.</h1>
            <p className="heroCopy">Marcadores exactos definitivos para {name.trim()}.</p>
          </div>
          <div className="scoreSeal">
            <CheckCircle2 size={34} aria-hidden="true" />
            <strong>{completed}</strong>
            <span>cruces</span>
          </div>
        </section>
      </div>
    );
  }

  return (
    <form className="pageStack" onSubmit={handleSubmit}>
      <section className="heroBand tableHero">
        <div>
          <p className="eyebrow">Eliminatorias</p>
          <h1>Marcador exacto.</h1>
          <p className="heroCopy">
            Los 16avos empiezan el 28 de junio. En eliminatorias se carga marcador exacto: si acertás exacto sumás el
            premio grande, y si acertás ganador/clasificado sumás parcial.
          </p>
        </div>
        <div className="heroControl">
          <label htmlFor="knockoutName">Nombre</label>
          <input
            id="knockoutName"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Mismo nombre"
            disabled={status === "saving"}
          />
          <span>{completed}/{fixtures.length} cruces completos</span>
        </div>
      </section>

      <KahlImageScatter page="eliminatorias" count={4} variant="compact" />

      <section className="draftPanel" aria-live="polite">
        <div>
          <p className="eyebrow">Provisorio</p>
          <h2>No pierdas tus cruces.</h2>
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
        <section className="validationPanel" id="knockoutValidationSummary" aria-live="polite">
          <p className="eyebrow">Antes de enviar</p>
          <h2>Completá eliminatorias.</h2>
          <ul>
            {validationMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="metricGrid" aria-label="Estado eliminatorias">
        <article className="metric">
          <Brackets size={20} aria-hidden="true" />
          <span>Cruces cargados</span>
          <strong>{fixtures.length}</strong>
        </article>
        <article className="metric">
          <Target size={20} aria-hidden="true" />
          <span>Exactos completos</span>
          <strong>{completed}</strong>
        </article>
        <article className="metric alert">
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>Inicio 16avos</span>
          <strong>28 Jun</strong>
        </article>
      </section>

      <section className="scoreRuleGrid knockoutScoreGrid" aria-label="Puntos de eliminatorias">
        {knockoutStages.map((stage) => {
          const scoring = knockoutStageScoring[stage];
          return (
            <article key={stage}>
              <span>{knockoutStageLabels[stage]}</span>
              <strong>{scoring.exact} / {scoring.winner}</strong>
              <p>
                Exacto: {scoring.exact} pts. {scoring.winnerLabel}: {scoring.winner} pts. Fecha: {knockoutStageSchedule[stage]}.
              </p>
            </article>
          );
        })}
      </section>

      {fixtures.length === 0 ? (
        <section className="emptyState">Todavía no hay cruces cargados desde admin.</section>
      ) : (
        Object.entries(fixturesByStage).map(([stage, stageFixtures]) => (
          <section className="pageStack compactStack" key={stage}>
            <div className="sectionHeader">
              <p className="eyebrow">{knockoutStageLabels[stage as keyof typeof knockoutStageLabels]}</p>
              <h2>{stageFixtures.length} cruces</h2>
            </div>
            <div className="matchGrid">
              {stageFixtures.map((fixture) => {
                const value = predictions[fixture.id] ?? { homeGoals: "", awayGoals: "" };
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
                    <div className="scoreInputs">
                      <label>
                        <TeamBadge compact team={fixture.home} />
                        <input
                          inputMode="numeric"
                          value={value.homeGoals}
                          onChange={(event) => setScore(fixture.id, "homeGoals", event.target.value)}
                          disabled={status === "saving"}
                        />
                      </label>
                      <b>-</b>
                      <label>
                        <TeamBadge compact team={fixture.away} />
                        <input
                          inputMode="numeric"
                          value={value.awayGoals}
                          onChange={(event) => setScore(fixture.id, "awayGoals", event.target.value)}
                          disabled={status === "saving"}
                        />
                      </label>
                    </div>
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

      <div className="submitDock">
        <div>
          <span>{name.trim() || "Sin nombre"}</span>
          <strong>{completed}/{fixtures.length}</strong>
        </div>
        <button className="primaryAction" disabled={!canSubmit} type="submit">
          {status === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
          {canSubmit ? "Enviar eliminatorias" : "Completar para enviar"}
        </button>
      </div>
    </form>
  );
}
