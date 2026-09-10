import { describe, expect, it } from "vitest";
import app from "./index";
import { createFakeD1 } from "../test/fakeD1";
import type { Env } from "./env";

describe("GET /* (non-API paths)", () => {
  it("falls through to the ASSETS binding instead of 404-ing in Hono", async () => {
    const env: Env = {
      DB: createFakeD1(),
      ASSETS: {
        fetch: async () => new Response("fallback", { status: 200 }),
      } as unknown as Fetcher,
    };
    const res = await app.request("/schedule", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("fallback");
  });
});
