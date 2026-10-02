import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => ({ deleteSubmissionById: vi.fn(), appendAuditEvent: vi.fn() }));
vi.mock("@/lib/storage", () => storage);
import { DELETE } from "./route";

function request(pin = "9999", body: unknown = { submissionId: "second-user" }) {
  return new Request("http://localhost/api/admin-delete-participant", { method: "DELETE", headers: { "Content-Type": "application/json", "x-prode-admin-pin": pin }, body: JSON.stringify(body) });
}
describe("admin participant deletion", () => {
  beforeEach(() => { vi.stubEnv("PRODE_ADMIN_PIN", "9999"); vi.clearAllMocks(); });
  afterEach(() => vi.unstubAllEnvs());
  it("rejects unauthorized deletion without touching storage", async () => {
    expect((await DELETE(request("wrong"))).status).toBe(401);
    vi.stubEnv("PRODE_ADMIN_PIN", "");
    expect((await DELETE(request())).status).toBe(401);
    expect(storage.deleteSubmissionById).not.toHaveBeenCalled();
  });
  it("rejects invalid targets", async () => {
    expect((await DELETE(request("9999", null))).status).toBe(400);
    expect(storage.deleteSubmissionById).not.toHaveBeenCalled();
  });
  it("returns 404 for a participant already removed", async () => {
    storage.deleteSubmissionById.mockResolvedValue(null);
    expect((await DELETE(request())).status).toBe(404);
    expect(storage.appendAuditEvent).not.toHaveBeenCalled();
  });
  it("deletes the selected ID and records an audit event", async () => {
    storage.deleteSubmissionById.mockResolvedValue({ id: "second-user", name: "Miguel duplicado", normalizedName: "miguel duplicado" });
    expect((await DELETE(request())).status).toBe(200);
    expect(storage.deleteSubmissionById).toHaveBeenCalledWith("second-user");
    expect(storage.appendAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "participant-deleted", meta: { submissionId: "second-user", normalizedName: "miguel duplicado" } }));
  });
});
