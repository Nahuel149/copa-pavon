import { describe, expect, it } from "vitest";
import { readJsonResponse } from "./client-json";

describe("readJsonResponse", () => {
  it("parses valid JSON responses", async () => {
    const result = await readJsonResponse<{ ok: boolean }>(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("returns a safe error payload for empty responses", async () => {
    const result = await readJsonResponse<{ error?: string; standings: unknown[] }>(
      new Response("", { status: 502 }),
    );

    expect(result.error).toContain("respondio vacio");
    expect(result.standings).toEqual([]);
  });

  it("returns a safe error payload for invalid JSON", async () => {
    const result = await readJsonResponse<{ errors?: string[] }>(
      new Response("<html>error</html>", { status: 500 }),
    );

    expect(result.errors?.[0]).toContain("respuesta invalida");
  });
});
