"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, Eye, Loader2, LockKeyhole, Plus, Power, RefreshCw, Save, Search, Trash2, Users } from "lucide-react";
import { KahlImageScatter } from "@/app/components/KahlImageScatter";
import { TeamBadge } from "@/app/components/TeamBadge";
import { readJsonResponse } from "@/lib/client-json";
import {
  groups,
  knockoutStageLabels,
  knockoutStages,
  matches,
  matchMap,
  roundLabels,
  type GroupId,
  type KnockoutFixture,
  type KnockoutStage,
  type MatchRound,
} from "@/lib/matches";
import {
  buildStandings,
  serializeKnockoutPrediction,
  serializePrediction,
  type AppSettings,
  type GroupPrediction,
  type MatchResult,
  type ResultStore,
  type StandingRow,
  type Submission,
} from "@/lib/prode";

type SubmissionsResponse = {
  submissions?: Submission[];
  error?: string;
};

type SyncResultsResponse = {
  results?: ResultStore;
  report?: {
    sourceUrl: string;
    imported: number;
    unchanged: number;
    skipped: number;
    checkedAt: string;
  };
  error?: string;
};

type SettingsResponse = AppSettings & {
  error?: string;
};

type ResultDraft = Record<string, { homeGoals: string; awayGoals: string }>;
type GroupResultDraft = Record<GroupId, { first: string; second: string }>;

const emptyMatchResults = matches.reduce<ResultDraft>((draft, match) => {
  draft[match.id] = { homeGoals: "", awayGoals: "" };
  return draft;
}, {});

const emptyGroupResults = groups.reduce<GroupResultDraft>((draft, group) => {
  draft[group.id] = { first: "", second: "" };
  return draft;
}, {} as GroupResultDraft);

function scoreFromDraft(matchId: string, draft: ResultDraft) {
  const value = draft[matchId];
  if (!value.homeGoals || !value.awayGoals) return null;
  return {
    matchId,
    homeGoals: Number(value.homeGoals),
    awayGoals: Number(value.awayGoals),
  };
}

function buildResultsPayload(
  matchDraft: ResultDraft,
  groupDraft: GroupResultDraft,
  knockoutFixtures: KnockoutFixture[],
  knockoutDraft: ResultDraft,
): ResultStore {
  const matchResults = matches
    .map((match) => scoreFromDraft(match.id, matchDraft))
    .filter((result): result is Omit<MatchResult, "outcome"> => Boolean(result));

  const groupResults = groups
    .map((group) => ({
      groupId: group.id,
      first: groupDraft[group.id].first,
      second: groupDraft[group.id].second,
    }))
    .filter((result) => result.first && result.second && result.first !== result.second);

  const knockoutResults = knockoutFixtures
    .map((fixture) => {
      const value = knockoutDraft[fixture.id];
      if (!value?.homeGoals || !value?.awayGoals) return null;
      return {
        fixtureId: fixture.id,
        homeGoals: Number(value.homeGoals),
        awayGoals: Number(value.awayGoals),
      };
    })
    .filter((result): result is { fixtureId: string; homeGoals: number; awayGoals: number } => Boolean(result));

  return {
    matchResults: matchResults.map((result) => ({
      ...result,
      outcome: result.homeGoals > result.awayGoals ? "home" : result.awayGoals > result.homeGoals ? "away" : "draw",
    })),
    groupResults,
    knockoutFixtures,
    knockoutResults,
  };
}

function draftFromResults(results: ResultStore) {
  const matchDraft = { ...emptyMatchResults };
  for (const result of results.matchResults) {
    matchDraft[result.matchId] = {
      homeGoals: String(result.homeGoals),
      awayGoals: String(result.awayGoals),
    };
  }

  const groupDraft = { ...emptyGroupResults };
  for (const result of results.groupResults) {
    groupDraft[result.groupId] = {
      first: result.first,
      second: result.second,
    };
  }

  const knockoutDraft = results.knockoutFixtures.reduce<ResultDraft>((draft, fixture) => {
    const result = results.knockoutResults.find((item) => item.fixtureId === fixture.id);
    draft[fixture.id] = {
      homeGoals: result ? String(result.homeGoals) : "",
      awayGoals: result ? String(result.awayGoals) : "",
    };
    return draft;
  }, {});

  return {
    matchDraft,
    groupDraft,
    knockoutFixtures: results.knockoutFixtures,
    knockoutDraft,
  };
}

function groupPredictionLabel(prediction: GroupPrediction) {
  return `${prediction.first} / ${prediction.second}`;
}

function buildCsv(submissions: Submission[], standings: StandingRow[], knockoutFixtures: KnockoutFixture[]) {
  const standingById = new Map(standings.map((standing) => [standing.submissionId, standing]));
  const header = [
    "Nombre",
    "Fecha",
    "Total",
    "Partidos",
    "Grupos",
    "Eliminatorias",
    "Exactos grupos",
    "Ganadores",
    "Exactos eliminatorias",
    ...matches.map((match) => `${match.order}. ${match.home} vs ${match.away}`),
    ...groups.map((group) => `Grupo ${group.id} top 2`),
    ...knockoutFixtures.map((fixture) => `${knockoutStageLabels[fixture.stage]} ${fixture.home} vs ${fixture.away}`),
  ];
  const rows = submissions.map((submission) => {
    const standing = standingById.get(submission.id);
    const byMatch = new Map(submission.predictions.map((prediction) => [prediction.matchId, prediction]));
    const byGroup = new Map((submission.groupPredictions ?? []).map((prediction) => [prediction.groupId, prediction]));
    const byKnockout = new Map((submission.knockoutPredictions ?? []).map((prediction) => [prediction.fixtureId, prediction]));
    return [
      submission.name,
      new Date(submission.createdAt).toLocaleString("es-AR"),
      standing?.totalPoints ?? 0,
      standing?.matchPoints ?? 0,
      standing?.groupPoints ?? 0,
      standing?.knockoutPoints ?? 0,
      standing?.exactHits ?? 0,
      standing?.winnerHits ?? 0,
      standing?.knockoutExactHits ?? 0,
      ...matches.map((match) => {
        const prediction = byMatch.get(match.id);
        return prediction ? serializePrediction(prediction) : "";
      }),
      ...groups.map((group) => {
        const prediction = byGroup.get(group.id);
        return prediction ? groupPredictionLabel(prediction) : "";
      }),
      ...knockoutFixtures.map((fixture) => {
        const prediction = byKnockout.get(fixture.id);
        return prediction ? serializeKnockoutPrediction(prediction) : "";
      }),
    ];
  });
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [activeRound, setActiveRound] = useState<MatchRound>(1);
  const [matchDraft, setMatchDraft] = useState<ResultDraft>(emptyMatchResults);
  const [groupDraft, setGroupDraft] = useState<GroupResultDraft>(emptyGroupResults);
  const [knockoutFixtures, setKnockoutFixtures] = useState<KnockoutFixture[]>([]);
  const [knockoutDraft, setKnockoutDraft] = useState<ResultDraft>({});
  const [newFixture, setNewFixture] = useState<{ stage: KnockoutStage; home: string; away: string }>({
    stage: "R32",
    home: "",
    away: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "syncing" | "ready">("idle");
  const [error, setError] = useState("");
  const [syncSummary, setSyncSummary] = useState("");
  const [appSettings, setAppSettings] = useState<AppSettings>({ submissionsOpen: false });

  const results = useMemo(
    () => buildResultsPayload(matchDraft, groupDraft, knockoutFixtures, knockoutDraft),
    [matchDraft, groupDraft, knockoutFixtures, knockoutDraft],
  );
  const standings = useMemo(() => buildStandings(submissions, results), [submissions, results]);
  const totalPredictions = submissions.reduce(
    (total, submission) =>
      total + submission.predictions.length + (submission.groupPredictions?.length ?? 0) + (submission.knockoutPredictions?.length ?? 0),
    0,
  );
  const latest = submissions[0]?.createdAt;
  const roundMatches = useMemo(() => matches.filter((match) => match.round === activeRound), [activeRound]);
  const detailSubmissions = showAllSubmissions
    ? submissions
    : submissions.filter((submission) => submission.id === expandedId);
  const isUnlocked = status === "ready" || status === "saving" || status === "syncing";

  async function loadAdminData(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setStatus("loading");
    setError("");

    const headers: HeadersInit = pin ? { "x-prode-admin-pin": pin } : {};
    const [submissionResponse, resultsResponse, settingsResponse] = await Promise.all([
      fetch("/api/submissions", { headers, cache: "no-store" }),
      fetch("/api/results", { headers, cache: "no-store" }),
      fetch("/api/settings", { headers, cache: "no-store" }),
    ]);

    if (!submissionResponse.ok || !resultsResponse.ok || !settingsResponse.ok) {
      const body = await readJsonResponse<SubmissionsResponse | SettingsResponse>(
        !submissionResponse.ok ? submissionResponse : !resultsResponse.ok ? resultsResponse : settingsResponse,
      );
      setError(body.error ?? "No se pudo abrir el panel.");
      setStatus("idle");
      return;
    }

    const submissionBody = await readJsonResponse<SubmissionsResponse>(submissionResponse);
    const resultsBody = await readJsonResponse<ResultStore & { error?: string }>(resultsResponse);
    const settingsBody = await readJsonResponse<SettingsResponse>(settingsResponse);
    if (submissionBody.error || resultsBody.error || settingsBody.error) {
      setError(submissionBody.error ?? resultsBody.error ?? settingsBody.error ?? "No se pudo abrir el panel.");
      setStatus("idle");
      return;
    }
    const drafts = draftFromResults(resultsBody);

    setSubmissions(submissionBody.submissions ?? []);
    setMatchDraft(drafts.matchDraft);
    setGroupDraft(drafts.groupDraft);
    setKnockoutFixtures(drafts.knockoutFixtures);
    setKnockoutDraft(drafts.knockoutDraft);
    setAppSettings({ submissionsOpen: settingsBody.submissionsOpen, updatedAt: settingsBody.updatedAt });
    setStatus("ready");
  }

  async function saveAppSettings(nextSettings: AppSettings) {
    setStatus("saving");
    setError("");

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(pin ? { "x-prode-admin-pin": pin } : {}),
      },
      body: JSON.stringify({ submissionsOpen: nextSettings.submissionsOpen }),
    });
    const body = await readJsonResponse<SettingsResponse>(response);

    if (!response.ok || body.error) {
      setError(body.error ?? "No se pudo guardar la configuracion.");
      setStatus("ready");
      return;
    }

    setAppSettings({ submissionsOpen: body.submissionsOpen, updatedAt: body.updatedAt });
    setStatus("ready");
  }

  async function saveResults() {
    setStatus("saving");
    setError("");
    const response = await fetch("/api/results", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(pin ? { "x-prode-admin-pin": pin } : {}),
      },
      body: JSON.stringify(results),
    });

    if (!response.ok) {
      const body = await readJsonResponse<{ error?: string }>(response);
      setError(body.error ?? "No se pudieron guardar los resultados.");
      setStatus("ready");
      return;
    }

    const saved = await readJsonResponse<ResultStore & { error?: string }>(response);
    if (saved.error) {
      setError(saved.error);
      setStatus("ready");
      return;
    }
    const drafts = draftFromResults(saved);
    setMatchDraft(drafts.matchDraft);
    setGroupDraft(drafts.groupDraft);
    setKnockoutFixtures(drafts.knockoutFixtures);
    setKnockoutDraft(drafts.knockoutDraft);
    setStatus("ready");
  }

  async function syncResults() {
    setStatus("syncing");
    setError("");
    setSyncSummary("");

    const response = await fetch("/api/results", {
      method: "POST",
      headers: pin ? { "x-prode-admin-pin": pin } : {},
    });
    const body = await readJsonResponse<SyncResultsResponse>(response);

    if (!response.ok || !body.results || !body.report) {
      setError(body.error ?? "No se pudieron buscar resultados automaticamente.");
      setStatus("ready");
      return;
    }

    const drafts = draftFromResults(body.results);
    setMatchDraft(drafts.matchDraft);
    setGroupDraft(drafts.groupDraft);
    setKnockoutFixtures(drafts.knockoutFixtures);
    setKnockoutDraft(drafts.knockoutDraft);
    setSyncSummary(
      `Busqueda lista: ${body.report.imported} nuevos/actualizados, ${body.report.unchanged} sin cambios. Fuente: ${body.report.sourceUrl}`,
    );
    setStatus("ready");
  }

  function exportCsv() {
    const csv = buildCsv(submissions, standings, knockoutFixtures);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `prode-mundial-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function setResultScore(matchId: string, side: "homeGoals" | "awayGoals", value: string) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 2);
    setMatchDraft((current) => ({
      ...current,
      [matchId]: { ...current[matchId], [side]: cleanValue },
    }));
  }

  function setGroupResult(groupId: GroupId, side: "first" | "second", value: string) {
    setGroupDraft((current) => ({
      ...current,
      [groupId]: { ...current[groupId], [side]: value },
    }));
  }

  function setKnockoutResult(fixtureId: string, side: "homeGoals" | "awayGoals", value: string) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 2);
    setKnockoutDraft((current) => ({
      ...current,
      [fixtureId]: { ...current[fixtureId], [side]: cleanValue },
    }));
  }

  function addKnockoutFixture() {
    const home = newFixture.home.trim().replace(/\s+/g, " ");
    const away = newFixture.away.trim().replace(/\s+/g, " ");
    if (home.length < 2 || away.length < 2 || home === away) return;
    const fixture: KnockoutFixture = {
      id: `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      order: knockoutFixtures.length + 1,
      stage: newFixture.stage,
      home,
      away,
    };
    setKnockoutFixtures((current) => [...current, fixture]);
    setKnockoutDraft((current) => ({ ...current, [fixture.id]: { homeGoals: "", awayGoals: "" } }));
    setNewFixture({ stage: newFixture.stage, home: "", away: "" });
  }

  function removeKnockoutFixture(fixtureId: string) {
    setKnockoutFixtures((current) =>
      current.filter((fixture) => fixture.id !== fixtureId).map((fixture, index) => ({ ...fixture, order: index + 1 })),
    );
    setKnockoutDraft((current) => {
      const next = { ...current };
      delete next[fixtureId];
      return next;
    });
  }

  return (
    <div className="pageStack">
      <section className="heroBand adminHero">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Panel y tabla.</h1>
          <p className="heroCopy">
            {submissions.length} participantes. {results.matchResults.length} partidos, {results.groupResults.length} grupos y{" "}
            {results.knockoutResults.length} eliminatorias con resultado.
          </p>
        </div>
        <form className="adminGate" onSubmit={loadAdminData}>
          <label htmlFor="adminPin">PIN</label>
          <div>
            <input
              id="adminPin"
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="PIN admin"
              autoComplete="current-password"
            />
            <button className="iconSubmit" disabled={status === "loading" || status === "saving"} type="submit" aria-label="Abrir panel">
              {status === "loading" ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}
            </button>
          </div>
          {error ? <span className="gateError">{error}</span> : null}
        </form>
      </section>

      {!isUnlocked ? (
        <section className="adminLockedPanel">
          <p className="eyebrow">Bloqueado</p>
          <h2>Ingresá el PIN para abrir el panel.</h2>
          <p>
            Con el PIN cargás resultados reales, guardás cruces de eliminatorias y ves todos los envíos. Sin PIN, el
            panel queda cerrado.
          </p>
        </section>
      ) : (
        <>
      <KahlImageScatter page="admin" count={4} variant="compact" />

      <section className="metricGrid" aria-label="Métricas admin">
        <article className="metric">
          <Users size={20} aria-hidden="true" />
          <span>Participantes</span>
          <strong>{submissions.length}</strong>
        </article>
        <article className="metric">
          <Eye size={20} aria-hidden="true" />
          <span>Pronósticos</span>
          <strong>{totalPredictions}</strong>
        </article>
        <article className="metric alert">
          <RefreshCw size={20} aria-hidden="true" />
          <span>Último</span>
          <strong>{latest ? new Date(latest).toLocaleDateString("es-AR") : "-"}</strong>
        </article>
      </section>

      <section className={appSettings.submissionsOpen ? "adminSwitchPanel open" : "adminSwitchPanel closed"} aria-live="polite">
        <div>
          <p className="eyebrow">Carga de pronosticos</p>
          <h2>{appSettings.submissionsOpen ? "Inscripcion abierta" : "Inscripcion cerrada"}</h2>
          <p>
            {appSettings.submissionsOpen
              ? "La pagina Cargar acepta nuevos participantes."
              : "Nadie puede anotarse ni enviar un prode nuevo hasta que vuelvas a abrir la carga."}
          </p>
          {appSettings.updatedAt ? <small>Ultimo cambio: {new Date(appSettings.updatedAt).toLocaleString("es-AR")}</small> : null}
        </div>
        <button
          className={appSettings.submissionsOpen ? "primaryAction danger" : "primaryAction"}
          disabled={status === "saving" || status === "syncing"}
          onClick={() => saveAppSettings({ submissionsOpen: !appSettings.submissionsOpen })}
          type="button"
        >
          {status === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Power size={18} aria-hidden="true" />}
          {appSettings.submissionsOpen ? "Cerrar carga" : "Abrir carga"}
        </button>
      </section>

      <section className="adminToolbar">
        <button className="primaryAction light" onClick={() => loadAdminData()} type="button">
          <RefreshCw size={18} aria-hidden="true" />
          Actualizar
        </button>
        <button className="primaryAction light" disabled={status === "syncing" || status === "saving"} onClick={syncResults} type="button">
          {status === "syncing" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          Buscar resultados
        </button>
        <button className="primaryAction light" disabled={status === "saving"} onClick={saveResults} type="button">
          {status === "saving" ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
          Guardar resultados
        </button>
        <button className="primaryAction" disabled={submissions.length === 0} onClick={exportCsv} type="button">
          <Download size={18} aria-hidden="true" />
          CSV
        </button>
        <button
          className="primaryAction light"
          disabled={submissions.length === 0}
          onClick={() => {
            setShowAllSubmissions((current) => !current);
            setExpandedId(null);
          }}
          type="button"
        >
          {showAllSubmissions ? "Ocultar todos" : "Ver todos los envíos"}
        </button>
      </section>

      {syncSummary ? <section className="validationPanel">{syncSummary}</section> : null}

      <section className="tableShell">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Participante</th>
              <th>Total</th>
              <th>Partidos</th>
              <th>Grupos</th>
              <th>Elim.</th>
              <th>Exactos</th>
              <th>Ganadores</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => (
              <tr key={row.submissionId}>
                <td>{index + 1}</td>
                <td>{row.name}</td>
                <td>{row.totalPoints}</td>
                <td>{row.matchPoints}</td>
                <td>{row.groupPoints}</td>
                <td>{row.knockoutPoints}</td>
                <td>{row.exactHits + row.knockoutExactHits}</td>
                <td>{row.winnerHits}</td>
              </tr>
            ))}
            {standings.length === 0 ? (
              <tr>
                <td colSpan={8}>Sin tabla todavía.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="sectionHeader">
        <p className="eyebrow">Resultados</p>
        <h2>Fase de grupos.</h2>
      </section>

      <section className="roundStrip" aria-label="Fechas de resultados">
        {([1, 2, 3] as MatchRound[]).map((round) => {
          const roundDone = matches
            .filter((match) => match.round === round)
            .filter((match) => matchDraft[match.id].homeGoals && matchDraft[match.id].awayGoals).length;
          return (
            <button
              className={activeRound === round ? "roundTab active" : "roundTab"}
              key={round}
              onClick={() => setActiveRound(round)}
              type="button"
            >
              <span>{roundLabels[round]}</span>
              <strong>{roundDone}/24</strong>
            </button>
          );
        })}
      </section>

      <section className="resultGrid" aria-label={roundLabels[activeRound]}>
        {roundMatches.map((match) => {
          const value = matchDraft[match.id];
          return (
            <article className="resultCard" key={match.id}>
              <span>#{match.order} · Grupo {match.groupId}</span>
              <strong><TeamBadge team={match.home} /> <span>vs.</span> <TeamBadge team={match.away} /></strong>
              <div className="scoreInputs compact">
                <label>
                  <TeamBadge compact team={match.home} />
                  <input
                    inputMode="numeric"
                    value={value.homeGoals}
                    onChange={(event) => setResultScore(match.id, "homeGoals", event.target.value)}
                    aria-label={`Resultado de ${match.home}`}
                  />
                </label>
                <b>-</b>
                <label>
                  <TeamBadge compact team={match.away} />
                  <input
                    inputMode="numeric"
                    value={value.awayGoals}
                    onChange={(event) => setResultScore(match.id, "awayGoals", event.target.value)}
                    aria-label={`Resultado de ${match.away}`}
                  />
                </label>
              </div>
            </article>
          );
        })}
      </section>

      <section className="sectionHeader">
        <p className="eyebrow">Clasificados</p>
        <h2>Top 2 real por grupo.</h2>
      </section>

      <section className="groupGrid" aria-label="Resultados de grupos">
        {groups.map((group) => {
          const value = groupDraft[group.id];
          const duplicate = value.first && value.second && value.first === value.second;
          return (
            <article className={duplicate ? "groupCard invalid" : "groupCard"} key={group.id}>
              <div className="matchHeader">
                <span>Grupo {group.id}</span>
                <strong>Resultado</strong>
              </div>
              <div className="groupSelectors">
                <label>
                  <span>1º real</span>
                  <select value={value.first} onChange={(event) => setGroupResult(group.id, "first", event.target.value)}>
                    <option value="">Elegir</option>
                    {group.teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>2º real</span>
                  <select value={value.second} onChange={(event) => setGroupResult(group.id, "second", event.target.value)}>
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

      <section className="sectionHeader">
        <p className="eyebrow">Eliminatorias</p>
        <h2>Cruces y resultados exactos.</h2>
      </section>

      <section className="knockoutComposer">
        <select value={newFixture.stage} onChange={(event) => setNewFixture((current) => ({ ...current, stage: event.target.value as KnockoutStage }))}>
          {knockoutStages.map((stage) => (
            <option key={stage} value={stage}>
              {knockoutStageLabels[stage]}
            </option>
          ))}
        </select>
        <input value={newFixture.home} onChange={(event) => setNewFixture((current) => ({ ...current, home: event.target.value }))} placeholder="Equipo A" />
        <input value={newFixture.away} onChange={(event) => setNewFixture((current) => ({ ...current, away: event.target.value }))} placeholder="Equipo B" />
        <button className="primaryAction light" onClick={addKnockoutFixture} type="button">
          <Plus size={18} aria-hidden="true" />
          Agregar cruce
        </button>
      </section>

      <section className="resultGrid" aria-label="Resultados eliminatorias">
        {knockoutFixtures.map((fixture) => {
          const value = knockoutDraft[fixture.id] ?? { homeGoals: "", awayGoals: "" };
          return (
            <article className="resultCard knockoutResult" key={fixture.id}>
              <span>#{fixture.order} · {knockoutStageLabels[fixture.stage]}</span>
              <strong>{fixture.home} vs. {fixture.away}</strong>
              <div className="scoreInputs compact">
                <label>
                  <span>{fixture.home}</span>
                  <input inputMode="numeric" value={value.homeGoals} onChange={(event) => setKnockoutResult(fixture.id, "homeGoals", event.target.value)} />
                </label>
                <b>-</b>
                <label>
                  <span>{fixture.away}</span>
                  <input inputMode="numeric" value={value.awayGoals} onChange={(event) => setKnockoutResult(fixture.id, "awayGoals", event.target.value)} />
                </label>
              </div>
              <button className="tableButton dangerButton" onClick={() => removeKnockoutFixture(fixture.id)} type="button">
                <Trash2 size={14} aria-hidden="true" />
                Quitar
              </button>
            </article>
          );
        })}
        {knockoutFixtures.length === 0 ? <div className="emptyState">Sin cruces eliminatorios cargados.</div> : null}
      </section>

      <section className="split">
        <div className="tableShell">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Fecha</th>
                <th>Partidos</th>
                <th>Grupos</th>
                <th>Elim.</th>
                <th>Vista</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>{submission.name}</td>
                  <td>{new Date(submission.createdAt).toLocaleString("es-AR")}</td>
                  <td>{submission.predictions.length}</td>
                  <td>{submission.groupPredictions?.length ?? 0}</td>
                  <td>{submission.knockoutPredictions?.length ?? 0}</td>
                  <td>
                    <button
                      className="tableButton"
                      onClick={() => {
                        setShowAllSubmissions(false);
                        setExpandedId(expandedId === submission.id ? null : submission.id);
                      }}
                      type="button"
                    >
                      {expandedId === submission.id ? "Cerrar" : "Abrir"}
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6}>Sin envíos cargados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="qaPanel">
          <p className="eyebrow">Reglas</p>
          <h2>Puntaje automático</h2>
          <div className="trendList">
            <div className="trendItem">
              <span>
                Exacto fase grupos
                <b>2</b>
              </span>
              <span>
                1X2 fase grupos
                <b>1</b>
              </span>
              <span>
                Top 2 grupo
                <b>5</b>
              </span>
              <span>
                Exacto eliminatorias
                <b>2</b>
              </span>
            </div>
          </div>
        </aside>
      </section>

      {detailSubmissions.length > 0 ? (
        <section className="predictionBoard">
          {detailSubmissions.map((submission) => (
              <div key={submission.id}>
                <div className="sectionHeader">
                  <p className="eyebrow">Detalle</p>
                  <h2>{submission.name}</h2>
                </div>
                <div className="predictionGrid">
                  {submission.predictions.map((prediction) => {
                    const match = matchMap.get(prediction.matchId);
                    if (!match) return null;
                    return (
                      <article className="predictionCell" data-tone={prediction.type === "score" ? "score" : prediction.choice} key={prediction.matchId}>
                        <span>#{match.order} · Grupo {match.groupId}</span>
                        <strong><TeamBadge team={match.home} /> <span>vs.</span> <TeamBadge team={match.away} /></strong>
                        <b>{serializePrediction(prediction)}</b>
                      </article>
                    );
                  })}
                  {(submission.groupPredictions ?? []).map((prediction) => (
                    <article className="predictionCell" data-tone="group" key={prediction.groupId}>
                      <span>Grupo {prediction.groupId}</span>
                      <strong>Top 2</strong>
                      <b>{groupPredictionLabel(prediction)}</b>
                    </article>
                  ))}
                  {(submission.knockoutPredictions ?? []).map((prediction) => {
                    const fixture = knockoutFixtures.find((item) => item.id === prediction.fixtureId);
                    return (
                      <article className="predictionCell" data-tone="knockout" key={prediction.fixtureId}>
                        <span>{fixture ? knockoutStageLabels[fixture.stage] : "Eliminatoria"}</span>
                        <strong>{fixture ? <><TeamBadge team={fixture.home} /> <span>vs.</span> <TeamBadge team={fixture.away} /></> : prediction.fixtureId}</strong>
                        <b>{serializeKnockoutPrediction(prediction)}</b>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
        </section>
      ) : null}
        </>
      )}
    </div>
  );
}
