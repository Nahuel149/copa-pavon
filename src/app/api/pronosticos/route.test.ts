import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auto-results", () => ({ autoSyncGroupMatchResults: vi.fn() }));
vi.mock("@/lib/knockout-deadlines", () => ({ compareKnockoutFixturesByKickoff: vi.fn() }));
vi.mock("@/lib/knockout-visibility", () => ({ getKnockoutVisibility: () => ({}), hideLockedKnockoutPredictions: (submission: unknown) => submission }));
vi.mock("@/lib/prode", () => ({ buildStandings: () => [{ submissionId: "new" }] }));
vi.mock("@/lib/storage", () => ({
  readSubmissionStore: async () => ({ submissions: [{ id: "old", name: "Eliminado" }, { id: "new", name: "Andress", knockoutPredictions: [] }] }),
  readResultStore: async () => ({ knockoutFixtures: [] }),
  publicSubmission: (submission: unknown) => submission,
  writeResultStore: vi.fn(),
}));
import { GET } from "./route";

describe("public predictions participants", () => {
  it("includes only participants still in the standings, even when a new participant has no prediction", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.submissions.map((submission: { id: string }) => submission.id)).toEqual(["new"]);
    expect(body.submissions[0].name).toBe("Andress");
  });
});
