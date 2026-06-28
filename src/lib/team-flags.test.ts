import { describe, expect, it } from "vitest";
import { getTeamFlagUrl } from "./team-flags";

describe("team flags", () => {
  it("matches flags with small team name differences", () => {
    expect(getTeamFlagUrl("Sudafrica")).toBe("https://flagcdn.com/w80/za.png");
    expect(getTeamFlagUrl("South Africa")).toBe("https://flagcdn.com/w80/za.png");
    expect(getTeamFlagUrl("Canada")).toBe("https://flagcdn.com/w80/ca.png");
    expect(getTeamFlagUrl("Republica Checa")).toBe("https://flagcdn.com/w80/cz.png");
    expect(getTeamFlagUrl("New Zealand")).toBe("https://flagcdn.com/w80/nz.png");
    expect(getTeamFlagUrl("Bosnia Herzegovina")).toBe("https://flagcdn.com/w80/ba.png");
    expect(getTeamFlagUrl("Bosnia y Herzegovina")).toBe("https://flagcdn.com/w80/ba.png");
  });
});
