import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultProfile } from "../lib/domain";
import { answerChat, chatSchema, compatibleProvider } from "../lib/server/assistant";
import { buildContext } from "../lib/server/context";
import { normalizeAir, geocode, getAir } from "../lib/server/environment";
import { memoized } from "../lib/server/http";
import { POST as chat } from "../app/api/chat/route";
import { GET as airRoute } from "../app/api/air-quality/route";
import { GET as geoRoute } from "../app/api/geocode/route";

const epoch = 1_798_000_000;
const source = {
  timezone: "Asia/Kolkata",
  current: { time: epoch, us_aqi: 120, pm2_5: 38, pm10: null, us_aqi_pm2_5: 120 },
  current_units: { us_aqi: "USAQI", pm2_5: "μg/m³", pm10: "μg/m³", us_aqi_pm2_5: "USAQI" },
  hourly: { time: [epoch, epoch + 3600], us_aqi: [120, null] }, hourly_units: { us_aqi: "USAQI" },
};
const message = { mode: "demo" as const, profile: defaultProfile, message: "Would taking the metro instead of driving reduce emissions?", history: [] };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("provider boundaries", () => {
  it("normalizes verified units, unix seconds, nullable fields and leading subindex", () => {
    const air = normalizeAir(source, null);
    expect(air.sample).toBe(false);
    expect(air.timestamp).toBe(new Date(epoch * 1000).toISOString());
    expect(air.dominant).toBe("PM2.5");
    expect(air.hourly).toHaveLength(1);
    expect(air.pollutants).toEqual([{ name: "PM2.5", value: 38, unit: "µg/m³" }]);
    expect(air.humidity).toBeNull();
  });
  it("drops metrics whose units are unknown and rejects malformed envelopes", () => {
    expect(normalizeAir({ ...source, current_units: {} }, null)).toMatchObject({ aqi: null, pollutants: [] });
    expect(() => normalizeAir({ error: true }, null)).toThrow();
  });
  it("rejects invalid coordinates and labels explicit fixtures", async () => {
    expect((await airRoute(new Request("http://local/api/air-quality?latitude=&longitude=77"))).status).toBe(400);
    expect(() => getAir(91, 0, "demo")).toThrow();
    expect((await getAir(26, 75, "demo")).sample).toBe(true);
  });
  it("coalesces calls and retries after upstream failure", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue("ok");
    const load = memoized(1000, fn);
    await expect(load("x")).rejects.toThrow("offline");
    expect(await Promise.all([load("x"), load("x")])).toEqual(["ok", "ok"]);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("reads location alternatives, handles no matches and validates city queries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ results: [{ name: "Jaipur", latitude: 26.9, longitude: 75.8, country: "India" }] }))
      .mockResolvedValueOnce(Response.json({})));
    expect((await geocode("Jaipur"))[0].country).toBe("India");
    expect(await geocode("unknown-city")).toEqual([]);
    expect((await geoRoute(new Request("http://local/api/geocode?q=a"))).status).toBe(400);
  });
});
describe("contextual chat", () => {
  it("rejects oversized messages, history, malformed JSON and cross-origin requests", async () => {
    expect(chatSchema.safeParse({ ...message, message: "a".repeat(801) }).success).toBe(false);
    expect(chatSchema.safeParse({ ...message, history: Array(7).fill({ role: "user", content: "x" }) }).success).toBe(false);
    const post = (body: string, origin: string) => chat(new Request("https://example.com/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json", origin }, body,
    }));
    expect((await post("{", "https://example.com")).status).toBe(400);
    expect((await post(JSON.stringify(message), "https://other.com")).status).toBe(403);
    expect((await post(" ".repeat(17000), "https://example.com")).status).toBe(413);
  });
  it("provides grounded transport estimates with no key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const reply = await answerChat(message, await buildContext(message));
    expect(reply.mode).toBe("rules");
    expect(reply.answer).toContain("Sample Data");
    expect(reply.answer).toContain("kg CO₂e");
  });
  it("handles model failures and unknown facts with deterministic fallback", async () => {
    const ctx = await buildContext(message);
    for (const personalize of [vi.fn().mockRejectedValue(new Error("provider down")),
      vi.fn().mockResolvedValue({ selections: [{ factId: "invented", role: "answer" }] })]) {
      expect((await answerChat(message, ctx, { personalize })).mode).toBe("rules");
    }
  });
  it("calls a configured compatible endpoint and renders only validated facts", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-token"); vi.stubEnv("OPENAI_MODEL", "test-model");
    vi.stubEnv("OPENAI_BASE_URL", "https://model.example/v1");
    const invoke = vi.fn().mockResolvedValue(Response.json({ choices: [{ message: {
      content: JSON.stringify({ selections: [{ factId: "trip", role: "answer" }] }),
    } }] }));
    vi.stubGlobal("fetch", invoke);
    const result = await answerChat(message, await buildContext(message), compatibleProvider());
    expect(result.mode).toBe("ai"); expect(result.answer).toContain("Rail");
    const [url, init] = invoke.mock.calls[0];
    expect(String(url)).toBe("https://model.example/v1/chat/completions");
    expect(JSON.parse(init.body).model).toBe("test-model");
    expect(init.body).not.toContain(String(defaultProfile.location.latitude));
  });
});

