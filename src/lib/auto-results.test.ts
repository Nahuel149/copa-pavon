import { afterEach, describe, expect, it, vi } from "vitest";
import { syncGroupMatchResults } from "./auto-results";
import { type ResultStore } from "./prode";

const emptyResults: ResultStore = {
  matchResults: [],
  groupResults: [],
  knockoutFixtures: [],
  knockoutResults: [],
};

function game(id: number, homeScore: number, awayScore: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: "group",
    home_score: homeScore,
    away_score: awayScore,
    finished: true,
    ...extra,
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("automatic result sync", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PRODE_RESULTS_SYNC_URL;
    delete process.env.PRODE_RESULTS_SYNC_URLS;
  });

  it("does not overwrite manually confirmed admin results", async () => {
    process.env.PRODE_RESULTS_SYNC_URL = "https://api-one.test/games";
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([game(1, 2, 2)])));

    const { results, report } = await syncGroupMatchResults({
      ...emptyResults,
      matchResults: [{ matchId: "m-01", homeGoals: 1, awayGoals: 1, outcome: "draw", source: "manual" }],
    });

    expect(results.matchResults[0]).toMatchObject({
      matchId: "m-01",
      homeGoals: 1,
      awayGoals: 1,
      outcome: "draw",
      source: "manual",
    });
    expect(report.imported).toBe(0);
    expect(report.protected).toBe(1);
    expect(report.conflicts).toEqual([
      expect.objectContaining({
        kind: "group",
        id: "m-01",
        manualScore: "1-1",
        apiScore: "2-2",
      }),
    ]);
  });

  it("keeps a manual score while allowing missing scorer details to be enriched", async () => {
    process.env.PRODE_RESULTS_SYNC_URL = "https://api-one.test/games";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([game(1, 1, 0, { home_scorers: "{\"S. Gimenez 31'\"}" })])),
    );

    const { results, report } = await syncGroupMatchResults({
      ...emptyResults,
      matchResults: [{ matchId: "m-01", homeGoals: 1, awayGoals: 0, outcome: "home", source: "manual" }],
    });

    expect(results.matchResults[0]).toMatchObject({
      matchId: "m-01",
      homeGoals: 1,
      awayGoals: 0,
      source: "manual",
      goalScorers: [{ team: "home", name: "S. Gimenez", minute: "31'" }],
    });
    expect(report.conflicts).toEqual([]);
  });

  it("can import from a second source when the first source has no finished result", async () => {
    process.env.PRODE_RESULTS_SYNC_URLS = "https://api-one.test/games, https://api-two.test/games";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([game(1, 1, 0)]));
    vi.stubGlobal("fetch", fetchMock);

    const { results, report } = await syncGroupMatchResults(emptyResults);

    expect(results.matchResults[0]).toMatchObject({
      matchId: "m-01",
      homeGoals: 1,
      awayGoals: 0,
      outcome: "home",
      source: "api",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(report.sourceUrls).toEqual(["https://api-one.test/games", "https://api-two.test/games"]);
    expect(report.added).toBe(1);
  });

  it("imports group goal scorers with minutes", async () => {
    process.env.PRODE_RESULTS_SYNC_URL = "https://api-one.test/games";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([
          game(1, 2, 1, {
            home_scorers: "{\"S. Gimenez 31'\",\"H. Lozano 77'\"}",
            away_scorers: "{\"P. Tau 44'\"}",
          }),
        ]),
      ),
    );

    const { results } = await syncGroupMatchResults(emptyResults);

    expect(results.matchResults[0].goalScorers).toEqual([
      { team: "home", name: "S. Gimenez", minute: "31'" },
      { team: "home", name: "H. Lozano", minute: "77'" },
      { team: "away", name: "P. Tau", minute: "44'" },
    ]);
  });
});
