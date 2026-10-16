import { afterEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ readAppSettings: vi.fn(), appendSubmission: vi.fn(), findSubmissionByNormalizedName: vi.fn() }));
vi.mock("@/lib/storage", () => storage);
import { POST } from "./route";

describe("registration closure", () => {
  afterEach(() => vi.clearAllMocks());
  it("rejects direct registration requests while closed without saving a participant", async () => {
    storage.readAppSettings.mockResolvedValue({ submissionsOpen: false });
    const response = await POST(new Request("http://localhost/api/register", { method: "POST", body: JSON.stringify({ name: "Nuevo", pin: "1234" }) }));
    expect(response.status).toBe(403);
    expect(storage.appendSubmission).not.toHaveBeenCalled();
    expect(storage.findSubmissionByNormalizedName).not.toHaveBeenCalled();
  });
  it("continues normal validation when registration is open", async () => {
    storage.readAppSettings.mockResolvedValue({ submissionsOpen: true });
    const response = await POST(new Request("http://localhost/api/register", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
    expect(storage.appendSubmission).not.toHaveBeenCalled();
  });
});
