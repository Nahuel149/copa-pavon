import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getClubBadgeUrl } from "./club-badges";

describe("club crests", () => {
  it("provides real local PNG crests for every semifinal club", () => {
    const teams = ["Boca Juniors", "Vasco da Gama", "Atlético Mineiro", "Montevideo City Torque", "Fluminense", "Palmeiras", "Estudiantes de La Plata", "Flamengo", "Banfield", "Atlético Tucumán", "Platense"];
    for (const team of teams) {
      const url = getClubBadgeUrl(team);
      expect(url).toMatch(/^\/club-badges\/.+\.png$/);
      expect(readFileSync(`public${url}`).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
  });

  it("accepts accents and formatting aliases without confusing national teams", () => {
    expect(getClubBadgeUrl("  ATLETICO   MINEIRO ")).toBe(getClubBadgeUrl("Atlético-MG"));
    expect(getClubBadgeUrl("Argentina")).toBeNull();
    expect(getClubBadgeUrl("Brasil")).toBeNull();
    expect(getClubBadgeUrl("Unknown club")).toBeNull();
  });
});
